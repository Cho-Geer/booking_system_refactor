import { RolesGuard } from './roles.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);

    mockRequest = {
      method: 'GET',
      url: '/api/admin/users',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when required roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      mockRequest.user = undefined;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('User not authenticated');
    });

    it('should return true when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      mockRequest.user = { id: 'user-1', role: 'ADMIN' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      mockRequest.user = { id: 'user-1', role: 'CUSTOMER' };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with descriptive message listing required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
      mockRequest.user = { id: 'user-1', role: 'CUSTOMER' };

      try {
        guard.canActivate(mockExecutionContext);
      } catch (error: any) {
        expect(error.message).toContain('Required roles:');
        expect(error.message).toContain('ADMIN');
        expect(error.message).toContain('SUPER_ADMIN');
      }
    });

    it('should allow access when user matches first required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['CUSTOMER', 'ADMIN']);
      mockRequest.user = { id: 'user-1', role: 'CUSTOMER' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when user matches second required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['CUSTOMER', 'ADMIN']);
      mockRequest.user = { id: 'user-1', role: 'ADMIN' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should log access denied attempt on role mismatch', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      mockRequest.user = { id: 'user-1', role: 'CUSTOMER' };
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);

      expect(warnSpy).toHaveBeenCalledWith(
        'Access denied - insufficient role:',
        expect.objectContaining({
          userId: 'user-1',
          userRole: 'CUSTOMER',
          requiredRoles: ['ADMIN'],
          endpoint: 'GET /api/admin/users',
        }),
      );

      warnSpy.mockRestore();
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return a Map with role hierarchy', () => {
      const hierarchy = (guard as any).getRoleHierarchy();

      expect(hierarchy).toBeInstanceOf(Map);
      expect(hierarchy.has('ADMIN')).toBe(true);
      expect(hierarchy.has('CUSTOMER')).toBe(true);
    });

    it('should define ADMIN role inheriting CUSTOMER and ADMIN', () => {
      const hierarchy = (guard as any).getRoleHierarchy();

      expect(hierarchy.get('ADMIN')).toEqual(['CUSTOMER', 'ADMIN']);
    });
  });

  describe('hasHierarchicalAccess', () => {
    it('should return true when user role has hierarchical access', () => {
      const result = (guard as any).hasHierarchicalAccess('ADMIN', 'CUSTOMER');

      expect(result).toBe(true);
    });

    it('should return true when user role matches required role exactly', () => {
      const result = (guard as any).hasHierarchicalAccess('CUSTOMER', 'CUSTOMER');

      expect(result).toBe(true);
    });

    it('should return false when user role lacks hierarchical access', () => {
      const result = (guard as any).hasHierarchicalAccess('CUSTOMER', 'ADMIN');

      expect(result).toBe(false);
    });

    it('should handle unknown roles gracefully', () => {
      const result = (guard as any).hasHierarchicalAccess('UNKNOWN_ROLE', 'ADMIN');

      expect(result).toBe(false);
    });
  });

  describe('roles array checking (FIX-P0-002)', () => {
    it('should check user.roles array instead of user.userType string', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      // User has roles as an array per contract.yaml JWT payload
      mockRequest.user = { id: 'user-1', roles: ['CUSTOMER', 'ADMIN'] };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user.roles does not contain required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      mockRequest.user = { id: 'user-1', roles: ['CUSTOMER'] };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('should allow access when user has multiple roles including required one', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
      mockRequest.user = { id: 'user-1', roles: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should check roles array even when userType exists (roles array takes precedence)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      // userType says CUSTOMER but roles array includes ADMIN - roles should win
      mockRequest.user = { id: 'user-1', userType: 'CUSTOMER', roles: ['CUSTOMER', 'ADMIN'] };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});
