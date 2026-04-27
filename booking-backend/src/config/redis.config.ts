/**
 * Redis configuration interface and factory.
 * Reads Redis connection settings from environment variables.
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttlDefault: number;
  ttlSession: number;
}

/**
 * Creates a RedisConfig object from environment variables.
 * Provides sensible defaults for missing values.
 */
export function createRedisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "booking:",
    ttlDefault: parseInt(process.env.REDIS_TTL_DEFAULT || "3600", 10),
    ttlSession: parseInt(process.env.REDIS_TTL_SESSION || "604800", 10),
  };
}
