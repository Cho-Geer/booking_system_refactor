import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import helmet from "helmet";

/**
 * Helmet Security Middleware
 *
 * Applies security headers to all HTTP responses using the helmet library.
 * Configures Content-Security-Policy, HSTS, X-Frame-Options, and other
 * security headers to protect against common web vulnerabilities.
 *
 * @example
 * ```typescript
 * // In main.ts or app.module.ts
 * app.use(HelmetMiddleware);
 * ```
 */
@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  private helmetMiddleware: ReturnType<typeof helmet>;

  constructor() {
    this.helmetMiddleware = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    });
  }

  /**
   * Apply helmet security headers to the response.
   * @param req - The incoming HTTP request
   * @param res - The outgoing HTTP response
   * @param next - The next middleware function in the chain
   */
  use(req: Request, res: Response, next: NextFunction): void {
    this.helmetMiddleware(req, res, next);
  }
}
