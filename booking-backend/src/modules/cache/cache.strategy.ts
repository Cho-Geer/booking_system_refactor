import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cache key formats as defined in the data architecture document.
 * All keys are prefixed with 'booking:' by the CacheService.
 */
export const CacheKeys = {
  /** User session: session:{sessionToken} */
  session: (token: string) => `session:${token}`,
  /** Verification code: verification:{phone}:{type} */
  verification: (phone: string, type: string) => `verification:${phone}:${type}`,
  /** Active services list: services:active */
  servicesActive: 'services:active',
  /** Available time slots: timeslots:available:{date} */
  timeslotsAvailable: (date: string) => `timeslots:available:${date}`,
  /** User profile: user:{userId}:profile */
  userProfile: (userId: string) => `user:${userId}:profile`,
  /** Slot capacity: slot:{timeSlotId}:remaining */
  slotRemaining: (timeSlotId: string) => `slot:${timeSlotId}:remaining`,
} as const;

/**
 * Cache TTL constants (in seconds).
 */
export const CacheTTL = {
  /** Verification code: 5 minutes */
  verification: 300,
  /** Services list: 1 hour */
  servicesActive: 3600,
  /** Time slots: 30 minutes */
  timeslotsAvailable: 1800,
  /** User profile: 1 day */
  userProfile: 86400,
  /** Slot capacity: 1 hour */
  slotRemaining: 3600,
  /** Null value (penetration protection): 60 seconds */
  nullValue: 60,
} as const;

/**
 * High-level cache strategies for the booking system.
 *
 * Provides typed convenience methods for each cache type defined in the
 * data architecture document (section 7).
 */
@Injectable()
export class CacheStrategy {
  private readonly logger = new Logger(CacheStrategy.name);

  constructor(private readonly cacheService: CacheService) {}

  // ---------------------------------------------------------------------------
  // User Session Cache
  // Key: session:{sessionToken} | TTL: 7 days (config-driven)
  // ---------------------------------------------------------------------------

  /**
   * Cache a user session.
   * Session TTL is managed by the CacheService config (REDIS_TTL_SESSION, default 7 days).
   */
  async setUserSession(sessionToken: string, sessionData: unknown): Promise<void> {
    const key = CacheKeys.session(sessionToken);
    await this.cacheService.setSession(key, sessionData);
  }

  /**
   * Get a cached user session.
   */
  async getUserSession<T>(sessionToken: string): Promise<T | null> {
    const key = CacheKeys.session(sessionToken);
    return this.cacheService.get<T>(key);
  }

  /**
   * Remove a user session from cache (on logout).
   */
  async removeUserSession(sessionToken: string): Promise<void> {
    const key = CacheKeys.session(sessionToken);
    await this.cacheService.delete(key);
  }

  // ---------------------------------------------------------------------------
  // Verification Code Cache
  // Key: verification:{phone}:{type} | TTL: 5 minutes
  // ---------------------------------------------------------------------------

  /**
   * Cache a verification code (SMS/Email) with 5-minute TTL.
   */
  async setVerificationCode(phone: string, type: string, code: string): Promise<void> {
    const key = CacheKeys.verification(phone, type);
    await this.cacheService.set(key, { code }, CacheTTL.verification);
  }

  /**
   * Get a cached verification code. Returns null if expired or not found.
   */
  async getVerificationCode(phone: string, type: string): Promise<string | null> {
    const key = CacheKeys.verification(phone, type);
    const data = await this.cacheService.get<{ code: string }>(key);
    return data?.code ?? null;
  }

  /**
   * Remove a verification code after successful verification.
   */
  async removeVerificationCode(phone: string, type: string): Promise<void> {
    const key = CacheKeys.verification(phone, type);
    await this.cacheService.delete(key);
  }

  // ---------------------------------------------------------------------------
  // Active Services List Cache
  // Key: services:active | TTL: 1 hour
  // ---------------------------------------------------------------------------

  /**
   * Cache the active services list.
   */
  async setActiveServices(services: unknown[]): Promise<void> {
    await this.cacheService.set(CacheKeys.servicesActive, services, CacheTTL.servicesActive);
  }

  /**
   * Get the cached active services list.
   */
  async getActiveServices<T>(): Promise<T[] | null> {
    return this.cacheService.get<T[]>(CacheKeys.servicesActive);
  }

  /**
   * Invalidate the active services cache (after service CRUD operations).
   * Uses delayed double-deletion for consistency.
   */
  async invalidateActiveServices(): Promise<void> {
    await this.cacheService.deleteWithDelay(CacheKeys.servicesActive, 500);
  }

  // ---------------------------------------------------------------------------
  // Available Time Slots Cache
  // Key: timeslots:available:{date} | TTL: 30 minutes
  // ---------------------------------------------------------------------------

  /**
   * Cache available time slots for a specific date.
   */
  async setAvailableTimeSlots(date: string, slots: unknown[]): Promise<void> {
    const key = CacheKeys.timeslotsAvailable(date);
    await this.cacheService.set(key, slots, CacheTTL.timeslotsAvailable);
  }

  /**
   * Get cached available time slots for a date.
   */
  async getAvailableTimeSlots<T>(date: string): Promise<T[] | null> {
    const key = CacheKeys.timeslotsAvailable(date);
    return this.cacheService.get<T[]>(key);
  }

  /**
   * Invalidate cached time slots for a date (after booking or schedule change).
   */
  async invalidateTimeSlots(date: string): Promise<void> {
    const key = CacheKeys.timeslotsAvailable(date);
    await this.cacheService.deleteWithDelay(key, 500);
  }

  // ---------------------------------------------------------------------------
  // User Profile Cache
  // Key: user:{userId}:profile | TTL: 1 day
  // ---------------------------------------------------------------------------

  /**
   * Cache a user's profile.
   */
  async setUserProfile(userId: string, profile: unknown): Promise<void> {
    const key = CacheKeys.userProfile(userId);
    await this.cacheService.set(key, profile, CacheTTL.userProfile);
  }

  /**
   * Get a cached user profile.
   */
  async getUserProfile<T>(userId: string): Promise<T | null> {
    const key = CacheKeys.userProfile(userId);
    return this.cacheService.get<T>(key);
  }

  /**
   * Invalidate user profile cache (after profile update).
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const key = CacheKeys.userProfile(userId);
    await this.cacheService.deleteWithDelay(key, 500);
  }

  // ---------------------------------------------------------------------------
  // Slot Capacity Cache (High-Concurrency Atomic Counter)
  // Key: slot:{timeSlotId}:remaining | TTL: 1 hour
  // ---------------------------------------------------------------------------

  /**
   * Initialize or set the remaining capacity for a time slot.
   */
  async setSlotRemaining(timeSlotId: string, remaining: number): Promise<void> {
    const key = CacheKeys.slotRemaining(timeSlotId);
    // Use raw SET without JSON.stringify for atomic counter operations
    if (!this.cacheService.isAvailable()) {
      this.logger.warn(`Cache SET skipped (Redis unavailable): ${key}`);
      return;
    }
    const client = this.cacheService.getClient();
    if (client) {
      try {
        await client.set(`booking:${key}`, String(remaining), 'EX', CacheTTL.slotRemaining);
      } catch (err) {
        this.logger.error(`Failed to set slot remaining for ${timeSlotId}`, (err as Error).stack);
      }
    }
  }

  /**
   * Atomically decrement slot remaining (for reservation).
   * Returns the new remaining count, or -1 if no capacity available.
   */
  async decrementSlotRemaining(timeSlotId: string): Promise<number> {
    const key = CacheKeys.slotRemaining(timeSlotId);
    return this.cacheService.decrement(key, 0);
  }

  /**
   * Get the current remaining capacity for a slot.
   */
  async getSlotRemaining(timeSlotId: string): Promise<number | null> {
    if (!this.cacheService.isAvailable()) {
      return null;
    }
    const client = this.cacheService.getClient();
    if (client) {
      try {
        const key = `booking:${CacheKeys.slotRemaining(timeSlotId)}`;
        const raw = await client.get(key);
        return raw !== null ? parseInt(raw, 10) : null;
      } catch (err) {
        this.logger.error(`Failed to get slot remaining for ${timeSlotId}`, (err as Error).stack);
        return null;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Cache Penetration Protection Wrapper
  // ---------------------------------------------------------------------------

  /**
   * Fetch and cache data with built-in penetration protection.
   * Null results are cached with a 60-second TTL.
   */
  async getCachedOrFetch<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
  ): Promise<T | null> {
    const result = await this.cacheService.cacheWithProtection(key, ttl, fetchFn);
    if (result && typeof result === 'object' && '__null__' in result) {
      return null;
    }
    return result as T | null;
  }

  // ---------------------------------------------------------------------------
  // Distributed Lock for Hot Data
  // ---------------------------------------------------------------------------

  /**
   * Acquire a lock for hot data to prevent cache breakdown.
   */
  async acquireHotDataLock(key: string, ttl = 10): Promise<boolean> {
    return this.cacheService.acquireLock(`lock:${key}`, ttl);
  }

  /**
   * Release the hot data lock.
   */
  async releaseHotDataLock(key: string): Promise<void> {
    await this.cacheService.releaseLock(`lock:${key}`);
  }
}
