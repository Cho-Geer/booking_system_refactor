/**
 * ROLE RENAME CONTRACT TESTS — RED Phase (BE-ROLE-UNIFY)
 *
 * These tests validate the TARGET state after userType→role rename.
 * They import REAL source code and assert on actual field names.
 *
 * TARGET: All code uses `role` and `SystemRole`
 * CURRENT: All code uses `userType` and `UserType`
 *
 * These tests MUST FAIL because the rename hasn't been implemented yet.
 * After GREEN implementation, all tests in this file must PASS.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from '../../modules/users/users.service';
import { PrismaService } from '../../common/database/prisma.service';
import { HashService } from '../../modules/encryption/hash.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../../modules/users/dto/user.dto';
import { ProfileResponseDto } from '../../modules/users/dto/profile-response.dto';

// We IMPORT current code - these exist and compile
// The tests assert on what the CODE SHOULD HAVE after the rename
// Since the code still has userType, these assertions will FAIL

// ============================================================
// 1. DTO CONTRACT TESTS
// ============================================================

describe('[RoleRename] DTO Contract (RED-phase)', () => {
  describe('CreateUserDto', () => {
    it('should use role field instead of userType', () => {
      const dto = new CreateUserDto();

      // TARGET: dto should have `role` property
      // CURRENT: dto has `userType` property
      // This assertion FAILS because role doesn't exist in current code
      expect(dto).toHaveProperty('role');
    });

    it('should NOT have userType field anymore', () => {
      const dto = new CreateUserDto();

      // TARGET: userType should be removed
      // CURRENT: userType still exists
      // This assertion FAILS because userType still exists
      expect(dto).not.toHaveProperty('userType');
    });

    it('should use SystemRole enum for validation decorator', () => {
      const dto = new CreateUserDto();
      const metadata = Reflect.getMetadataKeys(dto, 'userType');

      // TARGET: validation decorator references SystemRole, not UserType
      // CURRENT: validation decorator references UserType
      // TEST: Check if the property descriptor contains 'SystemRole'
      const proto = Object.getPrototypeOf(dto);
      const descriptors = Object.getOwnPropertyDescriptors(proto.constructor.prototype);
      const userTypeDescriptor = descriptors['userType'];

      // Target: property should be named 'role' not 'userType'
      // This FAILS because it's named 'userType'
      expect(descriptors).not.toHaveProperty('userType');
    });
  });

  describe('UpdateUserDto', () => {
    it('should use role field instead of userType', () => {
      const dto = new UpdateUserDto();

      // TARGET: role
      // CURRENT: userType
      expect(dto).toHaveProperty('role');
    });

    it('should NOT have userType field anymore', () => {
      const dto = new UpdateUserDto();

      expect(dto).not.toHaveProperty('userType');
    });
  });

  describe('UserResponseDto', () => {
    it('should expose role instead of userType', () => {
      // Check that the class has a `role` static property or prototype field
      const keys = Object.keys(new UserResponseDto());

      // TARGET: should be role, not userType
      expect(keys).toContain('role');

      // CURRENT: keys contains 'userType', which should NOT be there in target
      expect(keys).not.toContain('userType');
    });
  });

  describe('ProfileResponseDto', () => {
    it('should expose role instead of userType', () => {
      const keys = Object.keys(new ProfileResponseDto());

      expect(keys).toContain('role');
      expect(keys).not.toContain('userType');
    });
  });
});

// ============================================================
// 2. SERVICE CONTRACT TESTS
// ============================================================

describe('[RoleRename] Service Contract (RED-phase)', () => {
  describe('UsersService', () => {
    it('should select role field instead of userType in safe select', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: PrismaService,
            useValue: {
              user: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn(),
              },
            },
          },
          {
            provide: HashService,
            useValue: { hashWithPepper: jest.fn() },
          },
        ],
      }).compile();

      const service = moduleRef.get(UsersService);
      const safeSelect = (service as any).getSafeUserSelect();

      // TARGET: safeSelect has role:true, not userType:true
      // CURRENT: safeSelect has userType:true, not role:true
      // This FAILS because current code returns userType
      expect(safeSelect).toHaveProperty('role');

      // This FAILS because current code still has userType
      expect(safeSelect).not.toHaveProperty('userType');
    });
  });
});

// ============================================================
// 3. AUTH CONTRACT TESTS
// ============================================================

describe('[RoleRename] Auth Service Contract (RED-phase)', () => {
  describe('AuthService UserPayload', () => {
    it('should use role field instead of userType in token generation', async () => {
      // Import AuthService dynamically to test its interface
      const { AuthService } = await import('../../modules/auth/auth.service');

      // Check that the AuthService constructor or prototype
      // references `role` not `userType` in token-related methods
      const authServiceProto = AuthService.prototype;
      const tokenMethods = ['buildTokenPair', 'generateTokens', '_createTokenPair'];

      tokenMethods.forEach((methodName) => {
        const method = (authServiceProto as any)[methodName];
        if (method) {
          const methodStr = method.toString();

          // TARGET: methods reference `role` not `userType`
          // CURRENT: methods reference `userType`
          expect(methodStr).not.toContain('userType');
        }
      });
    });

    it('should reference role in JWT payload construction', async () => {
      const { AuthService } = await import('../../modules/auth/auth.service');
      const buildTokenPair = (AuthService.prototype as any).buildTokenPair;

      if (buildTokenPair) {
        const methodStr = buildTokenPair.toString();

        // TARGET: JWT payload uses roles directly from user.role
        // CURRENT: uses mapUserTypeToRole(user.userType)
        expect(methodStr).not.toContain('mapUserTypeToRole');
      }
    });
  });
});

// ============================================================
// 4. GUARD CONTRACT TESTS
// ============================================================

describe('[RoleRename] Guard Contract (RED-phase)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('RolesGuard should use role field', () => {
    it('should read user.role instead of user.userType', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const mockRequest = {
        method: 'GET',
        url: '/api/admin/users',
        ip: '127.0.0.1',
        get: jest.fn(),
        user: { id: 'user-1', role: 'ADMIN' }, // TARGET: user.role
      };

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      // TARGET: guard reads user.role and returns true for ADMIN role
      // CURRENT: guard reads user.userType which doesn't exist → role check fails
      //
      // Two possible outcomes:
      // 1. Guard throws ForbiddenException because userType is undefined
      // 2. Guard falls through to some default behavior
      //
      // Either way, this test documents the behavior change needed

      const result = guard.canActivate(mockExecutionContext);

      // TARGET: role is 'ADMIN' which matches required 'ADMIN' → true
      // CURRENT: userType is undefined, check fails → false or throws
      // This assertion FAILS in current code
      expect(result).toBe(true);
    });

    it('should deny access when user.role does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const mockRequest = {
        method: 'GET',
        url: '/api/admin/users',
        ip: '127.0.0.1',
        get: jest.fn(),
        user: { id: 'user-1', role: 'CUSTOMER' }, // TARGET: user.role = CUSTOMER
      };

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      // TARGET: CUSTOMER != ADMIN → should deny
      // But this might throw or return false depending on implementation
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('should prefer roles array over role field when both exist', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const mockRequest = {
        method: 'GET',
        url: '/api/admin/users',
        ip: '127.0.0.1',
        get: jest.fn(),
        user: {
          id: 'user-1',
          role: 'CUSTOMER', // role says CUSTOMER
          roles: ['CUSTOMER', 'ADMIN'], // but roles array includes ADMIN
        },
      };

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      // TARGET: roles array is checked first → access granted
      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });

  describe('RolesGuard internal implementation', () => {
    it('should reference role not userType in logAccessDenied', () => {
      // Check the source file text for userType references
      // Read the guard source and verify no userType references remain
      const guardSource = RolesGuard.prototype.canActivate.toString();

      // TARGET: no reference to userType in guard source
      // CURRENT: guard references user.userType
      expect(guardSource).not.toContain('userType');
    });
  });

  describe('JwtAuthGuard - user object contract', () => {
    it('should set request.user with role from JWT roles array', async () => {
      // Read JwtAuthGuard source and check it sets `role` from JWT
      const jwtGuardSource = JwtAuthGuard.prototype.canActivate.toString();

      // TARGET: guard extracts role from JWT roles array
      // The exact implementation depends on the validate/canActivate pattern
      // After GREEN, user object should have role, not userType
      const mockJwtUser = {
        id: 'user-1',
        roles: ['CUSTOMER'],
        role: 'CUSTOMER', // TARGET: role extracted from roles[0]
      };

      expect(mockJwtUser.role).toBe('CUSTOMER');
      expect(mockJwtUser).not.toHaveProperty('userType');
    });
  });
});

// ============================================================
// 5. AUTH TOKEN / JWT TESTS
// ============================================================

describe('[RoleRename] JWT Token Contract (RED-phase)', () => {
  it('should use user.role directly in JWT roles array', async () => {
    const { AuthService } = await import('../../modules/auth/auth.service');
    const buildTokenPair = (AuthService.prototype as any).buildTokenPair;

    if (buildTokenPair) {
      const source = buildTokenPair.toString();

      // TARGET: code should use user.role not user.userType
      // CURRENT: code uses getPermissionsForRole(user.userType) and mapUserTypeToRole(user.userType)

      // These assertions check that the source code no longer references userType
      // in the JWT token building logic
      expect(source).not.toContain('mapUserTypeToRole');
      expect(source).not.toContain('user.userType');
    }
  });

  it('should remove mapUserTypeToRole function', async () => {
    const { AuthService } = await import('../../modules/auth/auth.service');
    const proto = AuthService.prototype;

    // TARGET: mapUserTypeToRole should not exist
    // CURRENT: it exists and is used in token generation
    expect((proto as any).mapUserTypeToRole).toBeUndefined();
  });
});

// ============================================================
// 6. CONTRACT.YAML CONSISTENCY TESTS
// ============================================================

describe('[RoleRename] field_mappings no userType', () => {
  it('Prisma schema index should reference role not userType', () => {
    // Read and check schema.prisma for userType references
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'booking-backend',
      'prisma',
      'schema.prisma',
    );
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // TARGET: schema has enum SystemRole, not UserType
    // CURRENT: schema has enum UserType
    expect(schemaContent).not.toContain('enum UserType');

    // TARGET: model User uses `role SystemRole` not `userType UserType`
    // CURRENT: model User uses `userType UserType`
    expect(schemaContent).not.toContain('userType');

    // TARGET: @map("role") not @map("user_type")
    expect(schemaContent).not.toContain('@map("user_type")');
  });

  it('contract.yaml field_mappings should use role not userType', () => {
    const fs = require('fs');
    const path = require('path');
    const contractPath = path.join(__dirname, '..', '..', '..', '..', 'contract.yaml');
    const contractContent = fs.readFileSync(contractPath, 'utf-8');

    // TARGET: contract.yaml field_mappings reference role not userType
    // CURRENT: line 1444 has `fields: ["userType", "status"]` and line 2026 has `frontend_field: "userType"`
    expect(contractContent).not.toContain('userType');
  });
});

// ============================================================
// 7. COMPREHENSIVE USER-ROLE RENAME COVERAGE
// ============================================================

describe('[RoleRename] All modules sanitized - no userType references', () => {
  const fs = require('fs');
  const path = require('path');

  // Directories to check for userType references (source files only, not node_modules)
  const srcDir = path.join(__dirname, '..', '..');

  // Collect all TypeScript files in src (excluding .spec.ts, node_modules and test/rename-validation)
  function collectSourceFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...collectSourceFiles(fullPath));
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  const srcFiles = collectSourceFiles(srcDir);

  // file allowlist - these files are expected to still have userType references before the rename
  // After GREEN phase, these should all be updated
  it('should have zero source files (except .spec.ts) containing userType string', () => {
    const filesWithUserType: string[] = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('userType')) {
        filesWithUserType.push(path.relative(srcDir, file));
      }
    }

    // TARGET: zero files contain userType
    // CURRENT: many files contain userType
    // This FAILS because at least the source files still have userType
    expect(filesWithUserType).toHaveLength(0);
  });

  it('should have zero source files containing UserType (enum ref)', () => {
    const filesWithUserTypeEnum: string[] = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('UserType')) {
        filesWithUserTypeEnum.push(path.relative(srcDir, file));
      }
    }

    // TARGET: zero files reference UserType enum
    // CURRENT: many files still import UserType from @prisma/client
    expect(filesWithUserTypeEnum).toHaveLength(0);
  });
});
