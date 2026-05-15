/**
 * FakeRateLimiter — In-memory sliding window rate limiter.
 *
 * Replaces: RateLimiterService (Redis-based)
 *
 * Features:
 * - Sliding window algorithm (not fixed window — more accurate)
 * - Configurable window size and max requests
 * - Per-key tracking
 * - Returns realistic rate limit info (remaining, reset time)
 *
 * @example
 * ```ts
 * const limiter = new FakeRateLimiter({ windowMs: 60000, max: 100 });
 * const result = limiter.check('user:123');
 * expect(result.allowed).toBe(true);
 * expect(result.remaining).toBe(99);
 * ```
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number; // Unix timestamp ms
  limit: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export class FakeRateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private timestamps: Map<string, number[]> = new Map();

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  /**
   * Check if a request is allowed for the given key.
   * Uses sliding window algorithm: counts requests within the last windowMs.
   */
  check(key: string): RateLimitResult {
    this.cleanExpired(key);

    const entries = this.timestamps.get(key) || [];
    const currentCount = entries.length;

    if (this.max === 0) {
      // Unlimited
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + this.windowMs,
        limit: 0,
      };
    }

    if (currentCount >= this.max) {
      // Blocked — calculate when the window resets
      const oldestEntry = entries[0];
      const resetTime = oldestEntry + this.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit: this.max,
      };
    }

    // Allow the request
    const now = Date.now();
    entries.push(now);
    this.timestamps.set(key, entries);

    return {
      allowed: true,
      remaining: this.max - currentCount - 1,
      resetTime: now + this.windowMs,
      limit: this.max,
    };
  }

  /**
   * Reset the rate limit counter for a specific key.
   */
  reset(key: string): void {
    this.timestamps.delete(key);
  }

  /**
   * Reset all rate limit counters.
   */
  resetAll(): void {
    this.timestamps.clear();
  }

  /**
   * Remove expired timestamps for a given key.
   */
  private cleanExpired(key: string): void {
    const entries = this.timestamps.get(key);
    if (!entries || entries.length === 0) return;

    const now = Date.now();
    const cutoff = now - this.windowMs;

    const valid = entries.filter((ts) => ts > cutoff);
    if (valid.length === 0) {
      this.timestamps.delete(key);
    } else {
      this.timestamps.set(key, valid);
    }
  }
}
