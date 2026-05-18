import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * CORS configuration options
 */
export interface CorsOptions {
  /** Allowed origins (whitelist) */
  allowedOrigins: string[];
  /** Allowed HTTP methods */
  allowedMethods?: string[];
  /** Allowed HTTP headers */
  allowedHeaders?: string[];
  /** Whether to allow credentials */
  allowCredentials?: boolean;
  /** Max age for preflight cache (in seconds) */
  maxAge?: number;
  /** Exposed headers */
  exposedHeaders?: string[];
}

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigins: ['http://localhost:4200'],
  allowedMethods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowCredentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-Request-Id'],
};

/**
 * CORS Middleware
 *
 * Implements Cross-Origin Resource Sharing with strict origin validation.
 * Only whitelisted origins are allowed. Rejects requests from non-whitelisted
 * origins with a 403 Forbidden response.
 *
 * @example
 * ```typescript
 * // In main.ts or app.module.ts
 * app.use(CorsMiddleware);
 * ```
 */
@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private options: CorsOptions;

  constructor(options?: Partial<CorsOptions>) {
    this.options = { ...DEFAULT_CORS_OPTIONS, ...options };
  }

  /**
   * Handle CORS preflight and actual requests.
   * @param req - The incoming HTTP request
   * @param res - The outgoing HTTP response
   * @param next - The next middleware function in the chain
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;

    // If no origin header, it's not a CORS request - allow it
    if (!origin) {
      next();
      return;
    }

    // Validate origin against whitelist
    if (!this.isOriginAllowed(origin)) {
      res.status(403).json({
        statusCode: 403,
        message: `Origin '${origin}' is not allowed by CORS policy`,
        error: 'Forbidden',
      });
      return;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);

    if (this.options.allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      this.handlePreflight(req, res);
      return;
    }

    // Set headers for actual requests
    if (this.options.allowedMethods) {
      res.setHeader('Access-Control-Allow-Methods', this.options.allowedMethods.join(', '));
    }

    if (this.options.allowedHeaders) {
      res.setHeader('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));
    }

    if (this.options.exposedHeaders) {
      res.setHeader('Access-Control-Expose-Headers', this.options.exposedHeaders.join(', '));
    }

    next();
  }

  /**
   * Check if the given origin is in the whitelist.
   * @param origin - The origin to check
   * @returns True if the origin is allowed, false otherwise
   */
  private isOriginAllowed(origin: string): boolean {
    return this.options.allowedOrigins.some((allowed) => {
      // Support wildcard
      if (allowed === '*') {
        return true;
      }
      // Support regex patterns
      if (allowed.startsWith('/') && allowed.endsWith('/')) {
        const regex = new RegExp(allowed.slice(1, -1));
        return regex.test(origin);
      }
      // Exact match
      return allowed === origin;
    });
  }

  /**
   * Handle CORS preflight (OPTIONS) request.
   * @param req - The incoming HTTP request
   * @param res - The outgoing HTTP response
   */
  private handlePreflight(req: Request, res: Response): void {
    if (this.options.allowedMethods) {
      res.setHeader('Access-Control-Allow-Methods', this.options.allowedMethods.join(', '));
    }

    // Use requested headers or fall back to configured allowed headers
    const requestedHeaders = req.headers['access-control-request-headers'];
    if (requestedHeaders) {
      res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
    } else if (this.options.allowedHeaders) {
      res.setHeader('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));
    }

    if (this.options.maxAge) {
      res.setHeader('Access-Control-Max-Age', String(this.options.maxAge));
    }

    res.status(204).end();
  }
}
