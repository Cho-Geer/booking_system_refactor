import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);

    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      const reflectorSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflectorSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call super.canActivate for non-public routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
      superCanActivate.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(superCanActivate).toHaveBeenCalledWith(mockExecutionContext);
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const user = { id: 'user-1', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, undefined);

      expect(result).toBe(user);
    });

    it('should throw original error when error is present', () => {
      const error = new Error('Auth failed');

      expect(() => guard.handleRequest(error, false, undefined)).toThrow(Error);
      expect(() => guard.handleRequest(error, false, undefined)).toThrow('Auth failed');
    });

    it('should throw UnauthorizedException when user is false and no error', () => {
      expect(() => guard.handleRequest(null, false, undefined)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, false, undefined)).toThrow('Invalid or missing authentication token');
    });

    it('should throw UnauthorizedException with specific message for TokenExpiredError', () => {
      const info = new Error('jwt expired');
      info.name = 'TokenExpiredError';

      expect(() => guard.handleRequest(null, false, info as any)).toThrow(
        'Access token has expired. Please refresh your token.',
      );
    });

    it('should throw UnauthorizedException with specific message for JsonWebTokenError', () => {
      const info = new Error('invalid token');
      info.name = 'JsonWebTokenError';

      expect(() => guard.handleRequest(null, false, info as any)).toThrow(
        'Invalid access token. Please log in again.',
      );
    });

    it('should throw UnauthorizedException with specific message for NotBeforeError', () => {
      const info = new Error('jwt not active');
      info.name = 'NotBeforeError';

      expect(() => guard.handleRequest(null, false, info as any)).toThrow(
        'Access token not yet valid.',
      );
    });

    it('should throw default message for unknown error types', () => {
      const info = new Error('unknown error');
      info.name = 'UnknownError';

      expect(() => guard.handleRequest(null, false, info as any)).toThrow(
        'Authentication failed. Please log in again.',
      );
    });

    it('should throw generic message when info is undefined', () => {
      expect(() => guard.handleRequest(null, false, undefined)).toThrow(
        'Invalid or missing authentication token',
      );
    });

    it('should throw UnauthorizedException with user inactive message when user lacks id', () => {
      const userWithoutId = { email: 'test@example.com' };

      expect(() => guard.handleRequest(null, userWithoutId, undefined)).toThrow(
        'User account is inactive or suspended',
      );
    });

    it('should throw UnauthorizedException with user inactive message when user lacks email', () => {
      const userWithoutEmail = { id: 'user-1' };

      expect(() => guard.handleRequest(null, userWithoutEmail, undefined)).toThrow(
        'User account is inactive or suspended',
      );
    });

    it('should log authentication failure with error details', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const error = new Error('Auth error');

      expect(() => guard.handleRequest(error, false, undefined)).toThrow(Error);

      expect(warnSpy).toHaveBeenCalledWith(
        'Authentication failed:',
        expect.objectContaining({
          error: expect.any(String),
          stack: expect.any(String),
        }),
      );

      warnSpy.mockRestore();
    });
  });
});
