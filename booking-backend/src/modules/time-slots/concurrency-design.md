# High-Concurrency Slot Reservation Design

**Document ID**: T005-CONCURRENCY-DESIGN  
**Version**: 1.0.0  
**Created**: 2026-04-15  
**Author**: @Architect  
**Status**: Ready for Implementation  

---

## 1. Overview

This document defines the high-concurrency mechanism for the booking system's slot reservation feature, designed to handle **100+ TPS** while preventing double-booking and rate abuse.

### 1.1 Design Goals

| Goal | Target | Rationale |
|------|--------|-----------|
| Throughput | ≥ 100 TPS | Peak booking scenarios (e.g., flash sales, holiday rushes) |
| Latency (p99) | < 500ms | User experience threshold |
| Idempotency | 100% | Prevent duplicate bookings on retries |
| Rate Limiting | 1 req/s/user | Prevent abuse and system overload |
| Availability | 99.9% | Graceful degradation under load |

### 1.2 Non-Goals

- Distributed lock implementation (handled by optimistic locking)
- Real-time slot availability broadcasting (WebSocket layer handles this)
- Queue-based async processing (synchronous for booking confirmation)

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Generate preferSeq = random(0, N-1)               │   │
│  │  2. Include in reservation request body               │   │
│  │  3. Handle retry with exponential backoff             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST /api/appointments
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway / NestJS Backend               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Rate Limiter Middleware (Redis Lua Script)        │   │
│  │     - Key: rate_limit:user:{userId}:slot_reservation  │   │
│  │     - TTL: 1s, Limit: 1 req/s                         │   │
│  │     - Returns 429 + Retry-After header if exceeded    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  2. Atomic Slot Reservation Service                   │   │
│  │     - Optimistic locking with version field           │   │
│  │     - PreferSeq allocation with fallback              │   │
│  │     - Max 3 retries, exponential backoff              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  3. Transaction Manager (Prisma $transaction)         │   │
│  │     - Create Appointment + Update TimeSlot atomically │   │
│  │     - Isolation: Serializable                         │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│   PostgreSQL      │          │     Redis         │
│  (Primary DB)     │          │  (Rate Limiting)  │
│                  │          │                  │
│  - TimeSlots     │          │  - INCR + EXPIRE │
│  - Appointments  │          │  - Lua Script     │
│  - version field │          │  - TTL: 1s        │
└──────────────────┘          └──────────────────┘
```

### 2.2 Data Flow

```
User Action → preferSeq Generation → API Request
    ↓
Rate Limit Check (Redis)
    ↓ [Allowed]
Atomic Slot Reservation Attempt
    ↓
  ┌─ Attempt 1: Try preferSeq
  │   ├─ Success → Create Appointment → Return 201
  │   └─ Collision → Retry with backoff
  ├─ Attempt 2: Try preferSeq + 1
  │   ├─ Success → Create Appointment → Return 201
  │   └─ Collision → Retry with backoff
  └─ Attempt 3: Try preferSeq + 2
      ├─ Success → Create Appointment → Return 201
      └─ Collision → Return 409 (Conflict)
```

---

## 3. Detailed Design

### 3.1 slot_sequence Allocation Strategy

#### 3.1.1 Frontend Generation

```typescript
// Frontend: Generate preferSeq
const N = 10; // Configurable range [0, N-1]
const preferSeq = Math.floor(Math.random() * N);

// Include in reservation request
const reservationRequest = {
  serviceId: 'service-uuid',
  timeSlotId: 'slot-uuid',
  preferSeq,
  userId: 'user-uuid',
  // ... other fields
};
```

**Rationale**: Random distribution prevents hot-spotting on specific sequence numbers.

#### 3.1.2 Backend Allocation Algorithm

```typescript
async function allocateSlotSequence(
  slotId: string,
  preferSeq: number,
  maxRetries: number = 3
): Promise<{ success: boolean; allocatedSeq?: number; reason?: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const targetSeq = (preferSeq + attempt) % N; // Wrap around to avoid out-of-bounds

    // Optimistic locking with Prisma updateMany
    const result = await prisma.timeSlot.updateMany({
      where: {
        id: slotId,
        isAvailable: true,
        slotSequence: targetSeq,
      },
      data: {
        slotSequence: { increment: 1 },
        version: { increment: 1 },
        isAvailable: false,
      },
    });

    if (result.count > 0) {
      return { success: true, allocatedSeq: targetSeq };
    }

    // Collision detected, exponential backoff before retry
    if (attempt < maxRetries - 1) {
      await sleep(100 * Math.pow(2, attempt)); // 100ms, 200ms, 400ms
    }
  }

  return {
    success: false,
    reason: 'MAX_RETRIES_EXCEEDED',
  };
}
```

**Key Design Decisions**:
- **Modulo wrap-around**: `(preferSeq + attempt) % N` prevents out-of-bounds access
- **Exponential backoff**: Reduces contention during high-load periods
- **updateMany atomicity**: PostgreSQL row-level locking ensures only one transaction succeeds

### 3.2 Redis Rate Limiting

#### 3.2.1 Key Structure

```
Key Format: rate_limit:user:{userId}:slot_reservation
Value: Integer (request counter)
TTL: 1 second
```

**Example Keys**:
```
rate_limit:user:550e8400-e29b-41d4-a716-446655440000:slot_reservation
```

#### 3.2.2 Lua Script (Atomic Operation)

```lua
-- rate_limit.lua
local key = KEYS[1]
local current = redis.call("incr", key)
if current == 1 then
    redis.call("expire", key, 1)
end
return current
```

**Why Lua Script?**
- **Atomicity**: INCR + EXPIRE execute as single operation (no race condition)
- **Performance**: Single round-trip to Redis
- **Consistency**: Key always has TTL, preventing memory leaks

#### 3.2.3 NestJS Middleware Implementation

```typescript
// rate-limiter.middleware.ts
import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private redis: Redis;
  private rateLimitScript: string;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Pre-load Lua script for performance
    this.rateLimitScript = `
      local current = redis.call("incr", KEYS[1])
      if current == 1 then
          redis.call("expire", KEYS[1], 1)
      end
      return current
    `;
  }

  async use(req: Request, res: Response, next: () => void) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const key = `rate_limit:user:${userId}:slot_reservation`;
    const count = await this.redis.eval(this.rateLimitScript, 1, key);

    if (count > 1) {
      res.set('Retry-After', '1');
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          retryAfter: 1,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    next();
  }
}
```

### 3.3 Atomic Slot Reservation Algorithm

#### 3.3.1 Complete Reservation Flow

```typescript
// slot-reservation.service.ts
import { Injectable, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import Redis from 'ioredis';

const N = 10; // Sequence range
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 100;

@Injectable()
export class SlotReservationService {
  private redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async reserveSlot(
    userId: string,
    slotId: string,
    preferSeq: number,
    appointmentData: any
  ): Promise<any> {
    // Step 1: Rate limit check
    await this.checkRateLimit(userId);

    // Step 2: Attempt slot reservation with retries
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const targetSeq = (preferSeq + attempt) % N;

      try {
        // Optimistic lock + atomic update
        const result = await this.prisma.timeSlot.updateMany({
          where: {
            id: slotId,
            isAvailable: true,
            slotSequence: targetSeq,
          },
          data: {
            slotSequence: { increment: 1 },
            version: { increment: 1 },
            isAvailable: false,
          },
        });

        if (result.count === 0) {
          // Collision detected, retry with backoff
          if (attempt < MAX_RETRIES - 1) {
            await this.sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
            continue;
          }
          throw new ConflictException('Slot reservation failed: maximum retries exceeded');
        }

        // Step 3: Create appointment in transaction
        const appointment = await this.prisma.$transaction(
          async (tx) => {
            const newAppointment = await tx.appointment.create({
              data: {
                userId,
                timeSlotId: slotId,
                serviceId: appointmentData.serviceId,
                customerName: appointmentData.customerName,
                customerEmail: appointmentData.customerEmail,
                customerPhone: appointmentData.customerPhone,
                notes: appointmentData.notes,
                status: 'PENDING',
              },
              include: {
                timeSlot: true,
                service: true,
              },
            });

            return newAppointment;
          },
          {
            isolationLevel: 'Serializable',
            timeout: 5000,
          }
        );

        return {
          success: true,
          appointment,
          allocatedSeq: targetSeq,
        };
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error;
        }

        // Other errors, retry if attempts remain
        if (attempt < MAX_RETRIES - 1) {
          await this.sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Slot reservation failed: all retry attempts exhausted');
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const key = `rate_limit:user:${userId}:slot_reservation`;
    const rateLimitScript = `
      local current = redis.call("incr", KEYS[1])
      if current == 1 then
          redis.call("expire", KEYS[1], 1)
      end
      return current
    `;

    const count = await this.redis.eval(rateLimitScript, 1, key);

    if (count > 1) {
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 1,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 3.4 Error Handling Strategy

| Error Type | HTTP Status | Retry Strategy | User Message |
|------------|-------------|----------------|--------------|
| Rate limit exceeded | 429 | Wait 1s, retry once | "Please wait before booking again" |
| Slot unavailable (collision) | 409 | Auto-retry with backoff (max 3) | "Slot taken, trying another..." |
| Database timeout | 503 | Fail fast, return error | "Service temporarily unavailable" |
| Validation error | 400 | No retry | "Invalid booking data" |
| Internal error | 500 | No retry | "Booking failed, please try again" |

### 3.5 Idempotency Guarantee

```typescript
// Idempotency key generation
function generateIdempotencyKey(userId: string, slotId: string, timestamp: number): string {
  const payload = `${userId}:${slotId}:${Math.floor(timestamp / 1000)}`; // 1-second granularity
  return createHash('sha256').update(payload).digest('hex');
}

// Check idempotency before processing
async function isIdempotentRequest(key: string): Promise<boolean> {
  const exists = await redis.get(`idempotent:${key}`);
  return exists !== null;
}

// Mark request as processed
async function markAsProcessed(key: string, result: any): Promise<void> {
  await redis.setex(`idempotent:${key}`, 60, JSON.stringify(result)); // 60s TTL
}
```

---

## 4. Sequence Diagram

```
User                    Frontend                Backend                  Redis              PostgreSQL
 │                        │                        │                        │                   │
 │── Select Slot ────────>│                        │                        │                   │
 │                        │── Generate preferSeq ──>│                        │                   │
 │                        │   random(0, N-1)       │                        │                   │
 │                        │                        │                        │                   │
 │── Book Now ───────────>│                        │                        │                   │
 │                        │── POST /appointments ──>│                        │                   │
 │                        │   {preferSeq, slotId}  │                        │                   │
 │                        │                        │                        │                   │
 │                        │                        │── Rate Limit Check ───>│                   │
 │                        │                        │   EVAL Lua Script      │                   │
 │                        │                        │<─ Count (1 or >1) ────│                   │
 │                        │                        │                        │                   │
 │                        │                        │── [If count > 1] ──────>│                   │
 │                        │                        │   Return 429 + Retry-After                 │
 │                        │<─ 429 Response ─────────────────────────────────│                   │
 │                        │                        │                        │                   │
 │                        │                        │── [If count <= 1] ────>│                   │
 │                        │                        │                        │                   │
 │                        │                        │── Attempt 1: preferSeq ───────────────────>│
 │                        │                        │   UPDATE ... WHERE     │                   │
 │                        │                        │   slotSequence=X       │                   │
 │                        │                        │<─ count=0 (collision) ─│                   │
 │                        │                        │                        │                   │
 │                        │                        │── Sleep 100ms ────────>│                   │
 │                        │                        │                        │                   │
 │                        │                        │── Attempt 2: preferSeq+1 ─────────────────>│
 │                        │                        │   UPDATE ... WHERE     │                   │
 │                        │                        │   slotSequence=X+1     │                   │
 │                        │                        │<─ count=1 (success) ──│                   │
 │                        │                        │                        │                   │
 │                        │                        │── $transaction ───────────────────────────>│
 │                        │                        │   Create Appointment   │                   │
 │                        │                        │<─ Appointment Created ─│                   │
 │                        │                        │                        │                   │
 │                        │<─ 201 Created ──────────────────────────────────│                   │
 │                        │   {appointment, seq}   │                        │                   │
 │<─ Booking Success ─────│                        │                        │                   │
```

---

## 5. Performance Benchmarks

### 5.1 Target Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Throughput | ≥ 100 TPS | Load test with k6, 100 concurrent users |
| p50 Latency | < 100ms | Application metrics (Prometheus) |
| p99 Latency | < 500ms | Application metrics (Prometheus) |
| Redis p99 | < 10ms | Redis latency monitoring |
| DB p99 | < 200ms | PostgreSQL pg_stat_statements |
| Error Rate | < 0.1% | HTTP 5xx count / total requests |

### 5.2 Load Test Configuration (k6)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Stay at 100 users for 1 minute
    { duration: '30s', target: 150 },  // Spike to 150 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],   // 99% of requests must complete within 500ms
    http_req_failed: ['rate<0.01'],     // Error rate must be < 1%
  },
};

export default function () {
  const userId = `user-${__VU}`; // Virtual user ID
  const preferSeq = Math.floor(Math.random() * 10);

  const res = http.post('http://localhost:3000/api/appointments', {
    serviceId: 'service-uuid',
    timeSlotId: 'slot-uuid',
    preferSeq,
    userId,
    customerName: `User ${__VU}`,
    customerEmail: `user${__VU}@test.com`,
    customerPhone: `+1234567890${__VU}`,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken(userId)}`,
    },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response has appointment': (r) => JSON.parse(r.body).appointment !== undefined,
  });

  sleep(1); // Respect rate limit
}
```

### 5.3 Expected Performance Breakdown

| Component | Expected Latency | Bottleneck Risk |
|-----------|------------------|-----------------|
| Redis Rate Limit | 1-5ms | Low (in-memory) |
| Prisma updateMany | 50-150ms | Medium (row lock contention) |
| Transaction (Appointment) | 100-300ms | Medium (Serializable isolation) |
| Total (p99) | 200-500ms | Within target |

---

## 6. Database Index Optimization

### 6.1 Required Indexes

```sql
-- Existing indexes (from schema)
CREATE INDEX idx_time_slots_service_id ON time_slots(service_id);
CREATE INDEX idx_time_slots_start_time ON time_slots(start_time);
CREATE INDEX idx_time_slots_is_available ON time_slots(is_available);
CREATE INDEX idx_time_slots_slot_sequence ON time_slots(slot_sequence);

-- Composite index for optimistic locking query pattern
CREATE INDEX idx_time_slots_concurrent_lookup
  ON time_slots(service_id, is_available, slot_sequence)
  WHERE is_available = true;
```

### 6.2 Index Rationale

| Index | Purpose | Query Pattern |
|-------|---------|---------------|
| `slot_sequence` | Fast sequence lookup | `WHERE slotSequence = targetSeq` |
| `service_id + is_available + slot_sequence` | Composite for atomic update | `WHERE serviceId=X AND isAvailable=true AND slotSequence=Y` |

---

## 7. Rollout Strategy

### 7.1 Phase 1: Schema Migration (Week 1)

```bash
# Generate migration
npx prisma migrate dev --name add_slot_sequence_to_time_slots

# Verify migration
npx prisma db push

# Backfill existing records
npx prisma db execute --file ./prisma/backfill-slot-sequence.sql
```

### 7.2 Phase 2: Rate Limiting Deployment (Week 2)

1. Deploy Redis infrastructure (if not existing)
2. Deploy rate limiter middleware to staging
3. Run load tests to verify 429 behavior
4. Deploy to production with feature flag

### 7.3 Phase 3: Slot Reservation Service (Week 3)

1. Deploy new `SlotReservationService` to staging
2. Run integration tests with collision simulation
3. Canary deployment to 10% traffic
4. Monitor error rates, latency metrics
5. Full rollout if metrics stable

### 7.4 Rollback Plan

| Failure Scenario | Rollback Action | Estimated Time |
|------------------|-----------------|----------------|
| Redis unavailable | Disable rate limiter, fallback to in-memory | 5 mins |
| High collision rate | Increase N (sequence range) to 20 | 10 mins |
| DB timeout spikes | Reduce concurrent requests via API gateway | 5 mins |
| Data corruption | Restore from backup, disable new bookings | 30 mins |

---

## 8. Monitoring & Alerting

### 8.1 Key Metrics to Track

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| Rate limit hit rate | > 10% of requests | Investigate abuse patterns |
| Collision rate | > 30% of attempts | Increase N or maxRetries |
| p99 latency | > 500ms | Scale DB, optimize queries |
| Error rate (5xx) | > 1% | Trigger incident response |
| Redis memory usage | > 80% | Evict old keys, scale Redis |

### 8.2 Prometheus Metrics

```typescript
// metrics.ts
import { Counter, Histogram } from 'prom-client';

export const slotReservationAttempts = new Counter({
  name: 'slot_reservation_attempts_total',
  help: 'Total number of slot reservation attempts',
  labelNames: ['success'],
});

export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit exceeded responses',
});

export const reservationLatency = new Histogram({
  name: 'slot_reservation_latency_seconds',
  help: 'Latency of slot reservation requests',
  buckets: [0.05, 0.1, 0.2, 0.5, 1.0],
});
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Rate limit allows 1 req/s | First request passes, second returns 429 |
| PreferSeq allocation succeeds | Slot reserved with requested sequence |
| Collision triggers retry | Second attempt succeeds with preferSeq+1 |
| Max retries exceeded | Returns 409 after 3 failed attempts |
| Idempotent request returns cached result | Same key returns same response |

### 9.2 Integration Tests

```typescript
// slot-reservation.integration.spec.ts
describe('SlotReservationService (Integration)', () => {
  it('should handle concurrent reservations without double-booking', async () => {
    const slotId = 'test-slot-uuid';
    const userIds = ['user-1', 'user-2', 'user-3'];

    // Simulate 3 concurrent users trying to book same slot
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        service.reserveSlot(userId, slotId, 0, {
          serviceId: 'service-uuid',
          customerName: userId,
          customerEmail: `${userId}@test.com`,
          customerPhone: '1234567890',
        })
      )
    );

    // Only one should succeed
    const successes = results.filter((r) => r.status === 'fulfilled');
    expect(successes).toHaveLength(1);

    // Verify slot is marked unavailable
    const slot = await prisma.timeSlot.findUnique({ where: { id: slotId } });
    expect(slot.isAvailable).toBe(false);
  });

  it('should enforce rate limit of 1 req/s per user', async () => {
    const userId = 'rate-limit-user';

    // First request should pass
    await service.reserveSlot(userId, 'slot-1', 0, {...});

    // Second request within 1s should fail
    await expect(
      service.reserveSlot(userId, 'slot-2', 0, {...})
    ).rejects.toThrow(HttpException);
  });
});
```

### 9.3 Load Tests

- Use k6 configuration from Section 5.2
- Run weekly in staging environment
- Track metrics against Section 5.1 targets

---

## 10. Edge Cases & Failure Handling

| Edge Case | Handling Strategy |
|-----------|-------------------|
| User clicks "Book" twice rapidly | Idempotency key prevents duplicate |
| All sequences claimed (N=10, 10 concurrent users) | 11th user gets 409, frontend shows "Sold Out" |
| Redis down | Fallback: disable rate limiter, log warning |
| Database connection lost | Return 503, frontend retries with backoff |
| Clock skew between servers | Use Redis atomic operations (no time dependency) |
| preferSeq out of range | Modulo wrap-around: `preferSeq % N` |

---

## 11. API Contract

### 11.1 Reservation Request

```typescript
POST /api/appointments

Request Body:
{
  "serviceId": "string (UUID)",
  "timeSlotId": "string (UUID)",
  "preferSeq": "number (0-9)",
  "customerName": "string",
  "customerEmail": "string (email)",
  "customerPhone": "string",
  "notes": "string (optional)"
}

Headers:
  Authorization: Bearer <jwt_token>
  Idempotency-Key: <sha256_hash> (optional but recommended)
```

### 11.2 Success Response (201)

```json
{
  "success": true,
  "appointment": {
    "id": "appointment-uuid",
    "userId": "user-uuid",
    "timeSlotId": "slot-uuid",
    "serviceId": "service-uuid",
    "status": "PENDING",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "createdAt": "2026-04-15T10:00:00Z"
  },
  "allocatedSeq": 3
}
```

### 11.3 Rate Limited Response (429)

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 1
}

Headers:
  Retry-After: 1
```

### 11.4 Conflict Response (409)

```json
{
  "statusCode": 409,
  "message": "Slot reservation failed: maximum retries exceeded"
}
```

---

## 12. Configuration Parameters

| Parameter | Default | Description | Tunable Range |
|-----------|---------|-------------|---------------|
| `N` (sequence range) | 10 | Number of slot sequences per time slot | [5, 50] |
| `MAX_RETRIES` | 3 | Maximum retry attempts per reservation | [1, 5] |
| `BACKOFF_BASE_MS` | 100 | Base delay for exponential backoff | [50, 500] |
| `RATE_LIMIT_WINDOW_S` | 1 | Rate limit window in seconds | [1, 5] |
| `RATE_LIMIT_MAX_REQUESTS` | 1 | Max requests per window | [1, 3] |
| `TRANSACTION_TIMEOUT_MS` | 5000 | Prisma transaction timeout | [3000, 10000] |

---

## 13. Future Enhancements

| Enhancement | Priority | Estimated Effort |
|-------------|----------|------------------|
| Redis Cluster support for HA | Medium | 2 weeks |
| Distributed rate limiting (sliding window) | Low | 1 week |
| Queue-based async booking (for >1000 TPS) | Low | 3 weeks |
| Real-time slot availability via WebSocket | High (already planned) | 1 week |
| Machine learning for preferSeq prediction | Low | 4 weeks |

---

## 14. References

- **Prisma Documentation**: https://context7.com/prisma/prisma
- **Redis Rate Limiting**: https://github.com/redis/docs/blob/main/content/commands/incr.md
- **NestJS Middleware**: https://docs.nestjs.com/middleware
- **Optimistic Locking Pattern**: Martin Fowler, "Patterns of Enterprise Application Architecture"

---

*Document approved by @Arbiter before implementation.*  
*Last updated: 2026-04-15*
