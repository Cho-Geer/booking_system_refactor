import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface AuthError extends Error {
  name: string;
  message: string;
}

interface JwtUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

/**
 * JWT Authentication Guard
 *
 * This guard extends the Passport JWT strategy and provides
 * additional error handling and user validation.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Controller('protected')
 * export class ProtectedController {}
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine if the request is authorized
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Handle the request after authentication
   *
   * @param err - Any error that occurred during authentication
   * @param user - The authenticated user object
   * @param info - Additional information about the authentication process
   * @returns The authenticated user
   * @throws UnauthorizedException if authentication fails
   */
  handleRequest<TUser = JwtUser>(
    err: Error | null,
    user: TUser | false,
    _info: AuthError | undefined,
  ): TUser {
    if (err || !user) {
      // Log authentication failures for security monitoring
      this.logAuthenticationFailure(_info, err);

      throw err || new UnauthorizedException(this.getErrorMessage(_info));
    }

    // Additional user validation (e.g., check if user is active)
    if (!this.isUserValid(user as unknown as JwtUser)) {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    return user as TUser;
  }

  /**
   * Log authentication failures for security monitoring
   */
  private logAuthenticationFailure(info: AuthError | undefined, err: Error | null): void {
    const errorMessage = this.getErrorMessage(info);
    const logData = {
      timestamp: new Date().toISOString(),
      error: errorMessage,
      info: info?.message,
      stack: err?.stack,
    };

    // In production, this would log to a security monitoring system
    console.warn('Authentication failed:', logData);
  }

  /**
   * Get user-friendly error message based on authentication failure
   */
  private getErrorMessage(info: AuthError | undefined): string {
    if (info instanceof Error) {
      switch (info.name) {
        case 'TokenExpiredError':
          return 'Access token has expired. Please refresh your token.';
        case 'JsonWebTokenError':
          return 'Invalid access token. Please log in again.';
        case 'NotBeforeError':
          return 'Access token not yet valid.';
        default:
          return 'Authentication failed. Please log in again.';
      }
    }

    return 'Invalid or missing authentication token';
  }

  /**
   * Validate user status (e.g., active, not suspended)
   */
  private isUserValid(user: JwtUser): boolean {
    // In a real implementation, this would check:
    // 1. User is active in the database
    // 2. User is not suspended
    // 3. User's account is not locked
    // 4. User's email is verified (if required)

    // For now, assume all authenticated users are valid
    // This should be replaced with actual database checks
    return !!(user && user.id && user.email);
  }
}
