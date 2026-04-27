import { SetMetadata } from "@nestjs/common";

/**
 * Rate limit tier definitions defining request limits and time windows.
 *
 * - strict: 1 request per second (booking operations)
 * - auth: 5 requests per minute (login, registration, password reset)
 * - api: 30 requests per minute (general API endpoints)
 * - public: 100 requests per minute (public endpoints)
 */
export type RateLimitTier = "strict" | "auth" | "api" | "public";

/**
 * Identifier extraction strategy for rate limiting.
 *
 * - ip: Extract from request IP or x-forwarded-for header
 * - user: Extract from JWT token (user ID)
 * - api_key: Extract from x-api-key header
 * - email: Extract from request body email field (for verification code endpoints)
 */
export type RateLimitKey = "ip" | "user" | "api_key" | "email";

/**
 * Configuration options for the @RateLimit decorator.
 */
export interface RateLimitOptions {
  /** Rate limit tier defining requests per window */
  tier: RateLimitTier;
  /** Identifier extraction strategy */
  key?: RateLimitKey;
  /** Override the default limit for this endpoint */
  limit?: number;
  /** Override the default window (in seconds) for this endpoint */
  window?: number;
}

/**
 * Metadata key used to store rate limit configuration on route handlers.
 */
export const RATE_LIMIT_KEY = "rate_limit_config";

/**
 * Default configuration for each rate limit tier.
 */
export const RATE_LIMIT_DEFAULTS: Record<
  RateLimitTier,
  { limit: number; window: number }
> = {
  strict: { limit: 1, window: 1 },
  auth: { limit: 5, window: 60 },
  api: { limit: 30, window: 60 },
  public: { limit: 100, window: 60 },
};

/**
 * Apply rate limiting to a route handler or controller.
 *
 * @example
 * ```typescript
 * @RateLimit({ tier: 'strict', key: 'user' })
 * @Post('book')
 * async createBooking() { ... }
 *
 * @RateLimit({ tier: 'auth', key: 'ip' })
 * @Post('login')
 * async login() { ... }
 * ```
 *
 * @param options - Rate limit configuration options
 */
export function RateLimit(options: RateLimitOptions) {
  return SetMetadata(RATE_LIMIT_KEY, options);
}

/**
 * Get rate limit configuration from reflection metadata.
 *
 * @param limitConfig - Raw metadata from decorator
 * @returns Resolved rate limit options with defaults applied
 */
export function resolveRateLimitOptions(
  limitConfig: RateLimitOptions | undefined,
): RateLimitOptions {
  if (!limitConfig) {
    return { tier: "api", key: "ip" };
  }

  const defaults = RATE_LIMIT_DEFAULTS[limitConfig.tier];

  return {
    tier: limitConfig.tier,
    key: limitConfig.key || "ip",
    limit: limitConfig.limit ?? defaults.limit,
    window: limitConfig.window ?? defaults.window,
  };
}
