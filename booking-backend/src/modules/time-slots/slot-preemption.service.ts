import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';
import { createHash } from 'crypto';

// Configuration constants (can be moved to environment variables)
const SEQUENCE_RANGE = 10; // N: Number of slot sequences per time slot [5, 50]
const MAX_RETRIES = 3; // Maximum retry attempts per reservation
const BACKOFF_BASE_MS = 100; // Base delay for exponential backoff [50, 500]

/**
 * Result of a slot reservation attempt.
 */
export interface ReservationResult {
  success: boolean;
  status: 'SUCCESS' | 'RATE_LIMITED' | 'CONFLICT' | 'FAILED';
  appointment?: Record<string, unknown>;
  allocatedSeq?: number;
  retryAfter?: number;
  reason?: string;
}

/**
 * Input data for slot reservation.
 */
export interface ReservationInput {
  userId: string;
  slotId: string;
  preferSeq: number;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  idempotencyKey?: string;
}

/**
 * High-concurrency slot reservation service with:
 * - Redis-based rate limiting (1 req/s/user)
 * - Optimistic locking with currentSequence field
 * - Exponential backoff retry strategy
 * - Idempotency support via Idempotency-Key header
 *
 * Design reference: T005-CONCURRENCY-DESIGN Section 3.3
 */
@Injectable()
export class SlotPreemptionService {
  private readonly logger = new Logger(SlotPreemptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  /**
   * Reserve a time slot with atomic operations and retry logic.
   *
   * Flow:
   * 1. Check rate limit (Redis Lua script)
   * 2. Check idempotency (Redis cache)
   * 3. Attempt atomic slot reservation with retries
   * 4. Create appointment in transaction
   * 5. Cache result for idempotency
   *
   * @param input Reservation input data
   * @returns ReservationResult with success status and appointment data
   */
  async reserveSlot(input: ReservationInput): Promise<ReservationResult> {
    const { userId, slotId, idempotencyKey } = input;

    // Step 1: Check rate limit using shared RateLimiterService
    const rateLimitResult = await this.rateLimiter.isAllowed(
      userId,
      `/slots/${slotId}/reserve`,
      'strict',
      1,
      1,
    );

    if (!rateLimitResult.allowed) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`);
      return {
        success: false,
        status: 'RATE_LIMITED',
        retryAfter: rateLimitResult.retryAfter ?? 1,
        reason: 'Rate limit exceeded. Please try again later.',
      };
    }

    // Step 2: Check idempotency
    if (idempotencyKey) {
      const cachedResult = await this.getCachedIdempotentResult(idempotencyKey);
      if (cachedResult) {
        this.logger.log(`Idempotent hit for key: ${idempotencyKey}`);
        return cachedResult;
      }
    }

    // Step 3: Attempt slot reservation with retries
    const result = await this.attemptReservation(input);

    // Step 4: Cache result for idempotency
    if (idempotencyKey && result.success) {
      await this.cacheIdempotentResult(idempotencyKey, result);
    }

    return result;
  }

  /**
   * Attempt to reserve a slot with exponential backoff retries.
   */
  private async attemptReservation(input: ReservationInput): Promise<ReservationResult> {
    const {
      userId,
      slotId,
      preferSeq,
      serviceId,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = input;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Calculate target sequence with wrap-around
      const targetSeq = (preferSeq + attempt) % SEQUENCE_RANGE;

      try {
        // Optimistic lock + atomic update using Prisma transaction
        const reservationResult = await this.prisma.$transaction(
          async (tx) => {
            // Try to claim the slot with optimistic locking
            const updateResult = await tx.timeSlot.updateMany({
              where: {
                id: slotId,
                isActive: true,
                currentSequence: targetSeq,
              },
              data: {
                currentSequence: { increment: 1 },
              },
            });

            if (updateResult.count === 0) {
              // Collision detected - slot already taken or sequence mismatch
              return { success: false, reason: 'VERSION_CONFLICT' };
            }

            // Slot claimed successfully - create appointment
            const newAppointment = await tx.appointment.create({
              data: {
                userId,
                timeSlotId: slotId,
                serviceId,
                status: 'PENDING',
                customerInfo: {
                  name: customerName,
                  email: customerEmail,
                  phone: customerPhone,
                },
                remarks: notes || null,
                appointmentDate: new Date(),
                slotSequence: targetSeq,
                appointmentNumber: `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              },
              include: {
                timeSlot: true,
                service: true,
              },
            });

            return {
              success: true,
              appointment: newAppointment,
              allocatedSeq: targetSeq,
            };
          },
          {
            isolationLevel: 'Serializable',
            timeout: 5000, // 5 seconds timeout
          },
        );

        if (reservationResult.success) {
          this.logger.log(
            `Slot reserved successfully: slotId=${slotId}, seq=${reservationResult.allocatedSeq}, userId=${userId}`,
          );
          return {
            success: true,
            status: 'SUCCESS',
            appointment: reservationResult.appointment as Record<string, unknown>,
            allocatedSeq: reservationResult.allocatedSeq,
          };
        }

        // Collision - retry with backoff if attempts remain
        if (attempt < MAX_RETRIES - 1) {
          const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
          this.logger.debug(
            `Collision detected for slot ${slotId}, seq ${targetSeq}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await this.sleep(delay);
        }
      } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        // Handle transaction errors
        if (err['code'] === 'P2034' || (err['message'] as string)?.includes('timeout')) {
          // Transaction timeout - retry if attempts remain
          this.logger.warn(`Transaction timeout for slot ${slotId}, attempt ${attempt + 1}`);
          if (attempt < MAX_RETRIES - 1) {
            const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }
          return {
            success: false,
            status: 'FAILED',
            reason: 'Database timeout. Service temporarily unavailable.',
          };
        }

        // Other errors - rethrow if not retryable
        if (attempt < MAX_RETRIES - 1) {
          const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    // All retries exhausted
    this.logger.warn(
      `Slot reservation failed after ${MAX_RETRIES} attempts: slotId=${slotId}, preferSeq=${preferSeq}`,
    );
    return {
      success: false,
      status: 'CONFLICT',
      reason: 'Slot reservation failed: maximum retries exceeded',
    };
  }

  /**
   * Generate an idempotency key from request data.
   */
  static generateIdempotencyKey(userId: string, slotId: string, timestamp: number): string {
    const payload = `${userId}:${slotId}:${Math.floor(timestamp / 1000)}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Get cached idempotent result from Redis.
   */
  private async getCachedIdempotentResult(key: string): Promise<ReservationResult | null> {
    try {
      const redisClient = this.rateLimiter.getRedisClient();
      if (!redisClient) {
        return null;
      }
      const cached = await redisClient.get(`idempotent:${key}`);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to check idempotency cache: ${err.message}`);
      return null; // Fail open - process the request
    }
  }

  /**
   * Cache idempotent result in Redis with 60s TTL.
   */
  private async cacheIdempotentResult(key: string, result: ReservationResult): Promise<void> {
    try {
      const redisClient = this.rateLimiter.getRedisClient();
      if (!redisClient) {
        return;
      }
      await redisClient.setex(
        `idempotent:${key}`,
        60, // 60 seconds TTL
        JSON.stringify(result),
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to cache idempotent result: ${err.message}`);
      // Non-critical failure - don't fail the request
    }
  }

  /**
   * Utility function to create a delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
