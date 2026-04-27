import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CacheModule } from "../cache/cache.module";
import { RateLimiterService } from "./rate-limiter.service";
import { RateLimitGuard } from "./rate-limiter.guard";
import { RateLimitInterceptor } from "./rate-limiter.interceptor";

/**
 * Rate limiter module providing Redis-based distributed rate limiting.
 *
 * Exports:
 * - RateLimiterService: Core rate limiting service
 * - RateLimitGuard: Guard for enforcing rate limits (auto-registered)
 * - RateLimitInterceptor: Interceptor for logging and diagnostics
 *
 * The guard and interceptor are registered as global providers via APP_GUARD
 * and APP_INTERCEPTOR tokens. Rate limiting is only applied when the
 * @RateLimit decorator is used on controllers or route handlers.
 */
@Module({
  imports: [CacheModule],
  providers: [
    RateLimiterService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
  exports: [RateLimiterService],
})
export class RateLimiterModule {}
