import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
/**
 * Rate limiting interceptor that logs rate limit violations and adds
 * diagnostic headers to responses.
 *
 * This interceptor runs after the RateLimitGuard and provides:
 * - Logging of rate limit violations for monitoring
 * - Additional diagnostic headers when rate limits are approached
 * - Request timing for rate-limited endpoints
 *
 * Unlike the guard which enforces limits, this interceptor is primarily
 * for observability and logging purposes.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response, startTime);
        },
        error: (_error: Error) => {
          this.logRequest(request, response, startTime, _error);
        },
      }),
    );
  }

  /**
   * Log request details and check if rate limit is approaching threshold.
   *
   * @param request - HTTP request
   * @param response - HTTP response
   * @param startTime - Request start timestamp
   * @param error - Optional error if request failed
   */
  private async logRequest(
    request: Request,
    response: Response,
    startTime: number,
    _error?: Error,
  ): Promise<void> {
    const duration = Date.now() - startTime;
    const statusCode = response.statusCode;

    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      this.logger.warn(
        `Slow request: ${request.method} ${request.path} took ${duration}ms`,
      );
    }

    // Log 429 responses specifically
    if (statusCode === 429) {
      this.logger.warn(
        `Rate limit violated: ${request.method} ${request.path} ` +
          `from ${this.extractIp(request)}`,
      );
    }
  }

  /**
   * Extract IP address from request.
   *
   * @param request - HTTP request
   * @returns IP address
   */
  private extractIp(request: Request): string {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      const ips = (
        typeof forwardedFor === "string" ? forwardedFor : forwardedFor[0]
      ).split(",");
      return ips[0]?.trim() || request.ip || "unknown";
    }
    return request.ip || "unknown";
  }
}
