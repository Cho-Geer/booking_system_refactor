import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from "@nestjs/common";
import Redis, { Redis as IORedisClient } from "ioredis";
import { RedisConfig } from "../../config/redis.config";

export const REDIS_CONFIG_TOKEN = "REDIS_CONFIG";
export const REDIS_CLIENT_TOKEN = "REDIS_CLIENT";

/**
 * Core cache service providing Redis-backed caching with high-concurrency optimizations.
 *
 * Implements cache penetration protection, breakdown prevention, snowflake avoidance,
 * distributed locks, and atomic operations for slot reservation.
 *
 * All cache keys are prefixed with the configured keyPrefix (default: 'booking:').
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefix: string;
  private readonly ttlDefault: number;
  private readonly ttlSession: number;
  private readonly redis: IORedisClient | null;
  private isConnected = false;

  constructor(
    @Inject(REDIS_CONFIG_TOKEN) config: RedisConfig,
  ) {
    this.prefix = config.keyPrefix;
    this.ttlDefault = config.ttlDefault;
    this.ttlSession = config.ttlSession;

    try {
      this.redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn(
              "Redis connection failed after 3 retries. Operating in degraded mode.",
            );
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        this.logger.log("Redis connected successfully");
      });

      this.redis.on("error", (err: Error) => {
        this.isConnected = false;
        this.logger.error("Redis connection error", err.stack);
      });
    } catch (err) {
      this.redis = null;
      this.isConnected = false;
      this.logger.error(
        "Failed to initialize Redis client",
        (err as Error).stack,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.ping();
        this.isConnected = true;
      } catch {
        this.isConnected = false;
        this.logger.warn(
          "Redis ping failed. Service will operate in degraded mode (no caching).",
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.quit();
    }
  }

  /**
   * Returns the prefixed cache key.
   */
  private prefixedKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get the full prefixed key for use in raw redisClient operations.
   * Ensures key prefix consistency when bypassing CacheService methods.
   */
  getPrefixedKey(key: string): string {
    return this.prefixedKey(key);
  }

  /**
   * Applies random jitter to TTL to prevent cache avalanche.
   * Jitter range: ttl * [0.9, 1.1] (plus or minus 10%)
   */
  private jitterTtl(ttl: number): number {
    return Math.round(ttl * (0.9 + Math.random() * 0.2));
  }

  // ---------------------------------------------------------------------------
  // Basic operations
  // ---------------------------------------------------------------------------

  /**
   * Get a cached value by key. Returns null if key does not exist or Redis is unavailable.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache GET skipped (Redis unavailable): ${key}`);
      return null;
    }
    try {
      const raw = await this.redis.get(this.prefixedKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.error(
        `Cache GET error for key: ${key}`,
        (err as Error).stack,
      );
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL. Applies random jitter to TTL.
   * If no TTL provided, uses the default TTL from config.
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache SET skipped (Redis unavailable): ${key}`);
      return;
    }
    try {
      const effectiveTtl = this.jitterTtl(ttl ?? this.ttlDefault);
      const serialized = JSON.stringify(value);
      await this.redis.set(
        this.prefixedKey(key),
        serialized,
        "EX",
        effectiveTtl,
      );
    } catch (err) {
      this.logger.error(
        `Cache SET error for key: ${key}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Delete a key from cache.
   */
  async delete(key: string): Promise<void> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache DELETE skipped (Redis unavailable): ${key}`);
      return;
    }
    try {
      await this.redis.del(this.prefixedKey(key));
    } catch (err) {
      this.logger.error(
        `Cache DELETE error for key: ${key}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Check if a key exists in cache.
   */
  async has(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }
    try {
      const result = await this.redis.exists(this.prefixedKey(key));
      return result === 1;
    } catch (err) {
      this.logger.error(
        `Cache HAS error for key: ${key}`,
        (err as Error).stack,
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Atomic operations for high concurrency
  // ---------------------------------------------------------------------------

  /**
   * Atomically decrement a key's value, but not below the specified minimum.
   * Returns the new value after decrement.
   * Used for atomic slot reservation (high-concurrency soft rate limiting).
   */
  async decrement(key: string, min: number): Promise<number> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache DECR skipped (Redis unavailable): ${key}`);
      return min;
    }
    try {
      const luaScript = `
        local current = tonumber(redis.call('GET', KEYS[1])) or ARGV[2]
        if current > tonumber(ARGV[1]) then
          local newVal = current - 1
          redis.call('SET', KEYS[1], tostring(newVal))
          return newVal
        end
        return current
      `;
      const result = await this.redis.eval(
        luaScript,
        1,
        this.prefixedKey(key),
        String(min),
        String(min),
      );
      return result as number;
    } catch (err) {
      this.logger.error(
        `Cache DECR error for key: ${key}`,
        (err as Error).stack,
      );
      return min;
    }
  }

  /**
   * Atomically increment a key's value. Returns the new value.
   */
  async increment(key: string): Promise<number> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache INCR skipped (Redis unavailable): ${key}`);
      return 0;
    }
    try {
      const result = await this.redis.incr(this.prefixedKey(key));
      return result;
    } catch (err) {
      this.logger.error(
        `Cache INCR error for key: ${key}`,
        (err as Error).stack,
      );
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Distributed lock
  // ---------------------------------------------------------------------------

  /**
   * Acquire a distributed lock using SET NX EX.
   * Returns true if the lock was acquired, false otherwise.
   *
   * @param key - The lock key (will be prefixed)
   * @param ttl - Lock TTL in seconds (lock auto-releases after this time)
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache LOCK skipped (Redis unavailable): ${key}`);
      return false;
    }
    try {
      const result = await this.redis.set(
        this.prefixedKey(key),
        "1",
        "EX",
        ttl,
        "NX",
      );
      return result === "OK";
    } catch (err) {
      this.logger.error(
        `Cache LOCK error for key: ${key}`,
        (err as Error).stack,
      );
      return false;
    }
  }

  /**
   * Release a distributed lock by deleting the key.
   */
  async releaseLock(key: string): Promise<void> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn(`Cache UNLOCK skipped (Redis unavailable): ${key}`);
      return;
    }
    try {
      await this.redis.del(this.prefixedKey(key));
    } catch (err) {
      this.logger.error(
        `Cache UNLOCK error for key: ${key}`,
        (err as Error).stack,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Cache strategies
  // ---------------------------------------------------------------------------

  /**
   * Fetch data with cache penetration protection.
   *
   * Strategy:
   * 1. Check cache first
   * 2. If miss, call fetchFn to get data
   * 3. Cache the result (or null value with short TTL if fetchFn returns null)
   * 4. Return the data
   *
   * Null values are cached with a 60-second TTL to prevent cache penetration.
   */
  async cacheWithProtection(
    key: string,
    ttl: number,
    fetchFn: () => Promise<unknown>,
  ): Promise<unknown> {
    // Step 1: Check cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Step 2: Fetch from source
    try {
      const data = await fetchFn();

      // Step 3: Cache result (null values get short TTL for penetration protection)
      if (data === null || data === undefined) {
        await this.set(key, { __null__: true }, 60);
        return null;
      }

      await this.set(key, data, ttl);
      return data;
    } catch (err) {
      this.logger.error(
        `cacheWithProtection fetch failed for key: ${key}`,
        (err as Error).stack,
      );
      return null;
    }
  }

  /**
   * Delete a cache key with a delay (write-through deletion with async double deletion).
   *
   * Strategy:
   * 1. Delete cache immediately
   * 2. Schedule a second delete after the specified delay
   *
   * This prevents race conditions where the cache is repopulated between the
   * database update and cache invalidation.
   */
  async deleteWithDelay(key: string, delayMs: number): Promise<void> {
    await this.delete(key);

    setTimeout(async () => {
      await this.delete(key);
    }, delayMs).unref();
  }

  // ---------------------------------------------------------------------------
  // Pipeline operations
  // ---------------------------------------------------------------------------

  /**
   * Execute multiple operations in a single pipeline (reduces network round-trips).
   *
   * Supported operations: 'set', 'get', 'del', 'incr', 'decr', 'expire', 'has'
   *
   * @param operations - Array of {op, args} tuples
   * @returns Array of results corresponding to each operation
   */
  async pipeline(
    operations: Array<{ op: string; args: unknown[] }>,
  ): Promise<unknown[]> {
    if (!this.redis || !this.isConnected) {
      this.logger.warn("Cache PIPELINE skipped (Redis unavailable)");
      return [];
    }
    try {
      const pipe = this.redis.pipeline();

      for (const { op, args } of operations) {
        const prefixedArgs = args.map((arg, idx) => {
          // Prefix string arguments that look like cache keys (first arg for most ops)
          if (
            typeof arg === "string" &&
            idx === 0 &&
            ["set", "get", "del", "incr", "decr", "expire", "has"].includes(op)
          ) {
            return this.prefixedKey(arg);
          }
          return arg;
        });

        switch (op) {
          case "set": {
            const [k, v, t] = prefixedArgs as [string, unknown, number?];
            const effectiveTtl = this.jitterTtl(t ?? this.ttlDefault);
            pipe.set(k, JSON.stringify(v), "EX", effectiveTtl);
            break;
          }
          case "get":
            pipe.get(prefixedArgs[0] as string);
            break;
          case "del":
            pipe.del(prefixedArgs[0] as string);
            break;
          case "incr":
            pipe.incr(prefixedArgs[0] as string);
            break;
          case "decr":
            pipe.decr(prefixedArgs[0] as string);
            break;
          case "expire":
            pipe.expire(prefixedArgs[0] as string, prefixedArgs[1] as number);
            break;
          case "has":
            pipe.exists(prefixedArgs[0] as string);
            break;
          default:
            this.logger.warn(`Unknown pipeline operation: ${op}`);
        }
      }

      const results = await pipe.exec();
      if (!results) return [];
      return results.map(([err, val]) => {
        if (err) {
          this.logger.error(`Pipeline operation error: ${err.message}`);
          return null;
        }
        return val;
      });
    } catch (err) {
      this.logger.error("Cache PIPELINE error", (err as Error).stack);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Session TTL helper
  // ---------------------------------------------------------------------------

  /**
   * Set a session value with the session-specific TTL.
   */
  async setSession(key: string, value: unknown): Promise<void> {
    await this.set(key, value, this.ttlSession);
  }

  /**
   * Get the raw ioredis client for advanced operations.
   * Returns null if Redis is unavailable.
   */
  getClient(): IORedisClient | null {
    return this.redis;
  }

  /**
   * Check if Redis connection is active.
   */
  isAvailable(): boolean {
    return this.isConnected;
  }
}
