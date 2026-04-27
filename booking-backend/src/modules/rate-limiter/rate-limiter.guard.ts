import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { ClsService } from "nestjs-cls";
import { RateLimiterService } from "./rate-limiter.service";
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  RateLimitKey,
  resolveRateLimitOptions,
} from "./rate-limiter.decorator";

interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    id?: string;
    [key: string]: unknown;
  };
}

/**
 * Rate limiting guard that checks rate limits before allowing request execution.
 *
 * Extracts identifier based on configuration (IP, user ID, or API key),
 * checks rate limit via RateLimiterService, and throws HTTP 429
 * if limit is exceeded.
 *
 * Adds RFC 6585 compliant rate limit headers to all responses:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests remaining in window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * - Retry-After: Seconds to wait before retrying (only on 429)
 *
 * @example
 * ```typescript
 * // Global registration in app.module.ts
 * {
 *   provide: APP_GUARD,
 *   useClass: RateLimitGuard,
 * }
 *
 * // Or per-controller/route with @RateLimit decorator
 * @RateLimit({ tier: 'strict', key: 'user' })
 * @Post('book')
 * async createBooking() { ... }
 * ```
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Disable rate limiting in test environment
    if (process.env.NODE_ENV === "test") {
      return true;
    }

    // Get rate limit configuration from metadata
    const rateLimitConfig = this.getRateLimitConfig(context);
    if (!rateLimitConfig) {
      return true;
    }

    const options = resolveRateLimitOptions(rateLimitConfig);

    // Extract identifier based on key type
    const identifier = this.extractIdentifier(request, options.key!);
    if (!identifier) {
      // If we can't extract identifier, allow the request
      this.logger.warn("Unable to extract identifier for rate limiting");
      return true;
    }

    // Get endpoint path
    const endpoint = request.path;

    // Check rate limit
    const result = await this.rateLimiterService.isAllowed(
      identifier,
      endpoint,
      options.tier,
      options.limit,
      options.window,
    );

    // Get status for headers
    const status = await this.rateLimiterService.getStatus(
      identifier,
      endpoint,
      options.tier,
      options.limit,
      options.window,
    );

    // Set rate limit headers (RFC 6585 compliant)
    this.setRateLimitHeaders(response, status, result.retryAfter);

    if (!result.allowed) {
      const requestId =
        this.cls.get<string>("requestId") ?? `req-${crypto.randomUUID()}`;
      this.logger.warn(
        `[${requestId}] Rate limit exceeded for ${identifier} on ${endpoint} ` +
          `(${result.current}/${result.limit} in ${result.window}s)`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests. Please try again later.",
          error: "Too Many Requests",
          requestId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get rate limit configuration from route handler or controller metadata.
   *
   * @param context - Execution context
   * @returns Rate limit options or undefined if not configured
   */
  private getRateLimitConfig(
    context: ExecutionContext,
  ): RateLimitOptions | undefined {
    // Check handler (method) level first, then controller (class) level
    return (
      this.reflector.get(RATE_LIMIT_KEY, context.getHandler()) ??
      this.reflector.get(RATE_LIMIT_KEY, context.getClass())
    );
  }

  /**
   * Extract identifier from request based on key type.
   *
   * @param request - HTTP request
   * @param keyType - Identifier extraction strategy
   * @returns Extracted identifier or undefined
   */
  private extractIdentifier(
    request: Request,
    keyType: RateLimitKey,
  ): string | undefined {
    switch (keyType) {
      case "ip":
        return this.extractIp(request);
      case "user":
        return this.extractUserId(request);
      case "api_key":
        return this.extractApiKey(request);
      case "email":
        return this.extractEmail(request);
      default:
        return undefined;
    }
  }

  /**
   * Extract IP address from request.
   *
   * Checks x-forwarded-for header first (for proxied requests),
   * then falls back to req.ip.
   *
   * @param request - HTTP request
   * @returns IP address or undefined
   */
  private extractIp(request: Request): string | undefined {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ips = (
        typeof forwardedFor === "string" ? forwardedFor : forwardedFor[0]
      ).split(",");
      return ips[0]?.trim();
    }
    return request.ip;
  }

  /**
   * Extract user ID from JWT token in request.
   *
   * Expects the JWT payload to be attached to request.user by JwtAuthGuard.
   *
   * @param request - HTTP request
   * @returns User ID or undefined
   */
  private extractUserId(request: Request): string | undefined {
    const req = request as AuthenticatedRequest;
    const user = req.user;
    if (user && user.sub) {
      return user.sub;
    }
    if (user && user.id) {
      return user.id;
    }
    return undefined;
  }

  /**
   * Extract API key from request headers.
   *
   * @param request - HTTP request
   * @returns API key or undefined
   */
  private extractApiKey(request: Request): string | undefined {
    return request.headers["x-api-key"] as string | undefined;
  }

  /**
   * Extract email from request body.
   *
   * Used for verification code endpoints where rate limiting
   * should be per-email rather than per-IP.
   *
   * @param request - HTTP request
   * @returns Email address or undefined
   */
  private extractEmail(request: Request): string | undefined {
    const body = request.body as Record<string, unknown> | undefined;
    if (body && typeof body.email === "string") {
      return body.email.toLowerCase().trim();
    }
    return undefined;
  }

  /**
   * Set RFC 6585 compliant rate limit headers on response.
   *
   * @param response - HTTP response
   * @param status - Current rate limit status
   * @param retryAfter - Retry-after time in milliseconds (optional)
   */
  private setRateLimitHeaders(
    response: Response,
    status: { limit: number; remaining: number; resetAt: Date },
    retryAfter?: number,
  ): void {
    response.setHeader("X-RateLimit-Limit", String(status.limit));
    response.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(0, status.remaining)),
    );
    response.setHeader(
      "X-RateLimit-Reset",
      String(Math.floor(status.resetAt.getTime() / 1000)),
    );

    if (retryAfter !== undefined) {
      // Retry-After in seconds (RFC 6585)
      response.setHeader("Retry-After", String(Math.ceil(retryAfter / 1000)));
    }
  }
}
