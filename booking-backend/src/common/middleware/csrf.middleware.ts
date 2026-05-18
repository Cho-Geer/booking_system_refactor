import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';

/**
 * CSRF configuration options
 */
export interface CsrfOptions {
  /** HTTP methods that bypass CSRF validation (default: GET, HEAD, OPTIONS) */
  bypassMethods?: string[];
  /** Header name for CSRF token (default: X-CSRF-Token) */
  tokenHeader?: string;
  /** Cookie name for CSRF token (default: XSRF-TOKEN) */
  cookieName?: string;
  /** Token length in bytes (default: 32) */
  tokenLength?: number;
  /** Paths that bypass CSRF validation (e.g., webhooks) */
  bypassPaths?: string[];
}

/**
 * Default CSRF configuration
 */
const DEFAULT_CSRF_OPTIONS: CsrfOptions = {
  bypassMethods: ['GET', 'HEAD', 'OPTIONS'],
  tokenHeader: 'X-CSRF-Token',
  cookieName: 'XSRF-TOKEN',
  tokenLength: 32,
  bypassPaths: [],
};

/**
 * CSRF Middleware
 *
 * Implements Cross-Site Request Forgery protection using the
 * Synchronizer Token Pattern. GET, HEAD, and OPTIONS requests
 * are exempt from CSRF validation as they should be idempotent.
 *
 * @example
 * ```typescript
 * // In main.ts or app.module.ts
 * app.use(CsrfMiddleware);
 * ```
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private options: CsrfOptions;

  constructor(options?: Partial<CsrfOptions>) {
    this.options = { ...DEFAULT_CSRF_OPTIONS, ...options };
  }

  /**
   * Validate CSRF token for state-changing requests.
   * @param req - The incoming HTTP request
   * @param res - The outgoing HTTP response
   * @param next - The next middleware function in the chain
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Bypass CSRF for safe methods
    if (this.isMethodBypassed(req.method)) {
      next();
      return;
    }

    // Bypass CSRF for configured paths
    if (this.isPathBypassed(req.path)) {
      next();
      return;
    }

    // Extract and validate CSRF token
    const token = this.extractToken(req);
    const secret = this.extractSecret(req);

    if (!token || !secret) {
      res.status(403).json({
        statusCode: 403,
        message: 'CSRF token missing',
        error: 'Forbidden',
      });
      return;
    }

    if (!this.validateToken(token, secret)) {
      res.status(403).json({
        statusCode: 403,
        message: 'CSRF token validation failed',
        error: 'Forbidden',
      });
      return;
    }

    next();
  }

  /**
   * Generate a new CSRF token pair (token + secret).
   * The token should be sent in the X-CSRF-Token header.
   * The secret should be stored in a cookie or session.
   * @returns Object containing token and secret
   */
  generateToken(): { token: string; secret: string } {
    const secret = randomBytes(this.options.tokenLength!).toString('base64');
    const token = this.createToken(secret);
    return { token, secret };
  }

  /**
   * Check if the HTTP method is exempt from CSRF validation.
   * @param method - The HTTP method
   * @returns True if the method is bypassed
   */
  private isMethodBypassed(method: string): boolean {
    const bypassMethods = this.options.bypassMethods!.map((m) => m.toUpperCase());
    return bypassMethods.includes(method.toUpperCase());
  }

  /**
   * Check if the request path is exempt from CSRF validation.
   * @param path - The request path
   * @returns True if the path is bypassed
   */
  private isPathBypassed(path: string): boolean {
    const bypassPaths = this.options.bypassPaths || [];
    return bypassPaths.some((bypassPath) => {
      // Support exact match
      if (bypassPath === path) {
        return true;
      }
      // Support wildcard prefix match
      if (bypassPath.endsWith('/*')) {
        const prefix = bypassPath.slice(0, -2);
        return path.startsWith(prefix);
      }
      // Support regex
      if (bypassPath.startsWith('/') && bypassPath.endsWith('/')) {
        const regex = new RegExp(bypassPath.slice(1, -1));
        return regex.test(path);
      }
      return false;
    });
  }

  /**
   * Extract the CSRF token from the request header.
   * @param req - The incoming HTTP request
   * @returns The CSRF token or null if not found
   */
  private extractToken(req: Request): string | null {
    const tokenHeader = this.options.tokenHeader!;
    const token = req.headers[tokenHeader.toLowerCase()];
    return typeof token === 'string' ? token : null;
  }

  /**
   * Extract the CSRF secret from the request cookie.
   * @param req - The incoming HTTP request
   * @returns The CSRF secret or null if not found
   */
  private extractSecret(req: Request): string | null {
    const cookieName = this.options.cookieName!;
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      acc[name] = rest.join('=');
      return acc;
    }, {});

    const raw = cookies[cookieName];
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }

  /**
   * Create a CSRF token from the secret using HMAC.
   * @param secret - The secret to create token from
   * @returns The generated token
   */
  private createToken(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Validate the CSRF token against the secret.
   * @param token - The token to validate
   * @param secret - The secret to validate against
   * @returns True if the token is valid
   */
  private validateToken(token: string, secret: string): boolean {
    const expectedToken = this.createToken(secret);
    return token === expectedToken;
  }
}
