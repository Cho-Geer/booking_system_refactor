import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailService } from '../email/email.service';
import { VerificationService } from '../verification/verification.service';
import { CacheService } from '../cache/cache.service';
import { EncryptionService } from '../encryption/encryption.service';
import { HashService } from '../encryption/hash.service';
import { AuthService } from './auth.service';
import { ContactType } from './dto/register-send-code.dto';

// Mock PrismaService using jest.createMockFromModule to avoid Prisma delegate typing issues
const mockPrismaService = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const TEST_JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  const TEST_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      signAsync: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: VerificationService,
          useValue: {
            generateCode: jest.fn().mockResolvedValue('123456'),
            verifyCode: jest.fn().mockResolvedValue({ success: true }),
            deleteCode: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CacheService,
          useValue: { setSession: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn().mockResolvedValue({
              iv: 'test-iv',
              authTag: 'test-auth-tag',
              ciphertext: 'test-ciphertext',
            }),
            decrypt: jest.fn(),
          },
        },
        {
          provide: HashService,
          useValue: {
            hashWithPepper: jest.fn().mockReturnValue('mocked-hash-value'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('JWT expiration from ConfigService', () => {
    it('should read JWT_EXPIRATION and JWT_REFRESH_EXPIRATION from ConfigService', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRATION') return '3600';
        if (key === 'JWT_REFRESH_EXPIRATION') return '604800';
        return undefined;
      });

      // Create a user payload directly (bypass register flow)
      const userPayload = {
        id: 'test-user-id',
        name: 'Test User',
        role: 'CUSTOMER' as const,
        passwordHash: 'hash123',
        phone: null,
        phoneHash: null,
        email: 'test@example.com',
        emailHash: 'hash456',
        createdAt: new Date(),
      };

      // Mock userSession.create to return a session ID
      mockPrismaService.userSession.create.mockResolvedValue({ id: 'session-1' });

      // Act - call loginPassword to trigger token generation
      mockPrismaService.user.findFirst.mockResolvedValue(userPayload);
      (authService as any).constantTimeLoginDelay = jest.fn().mockResolvedValue(undefined);
      // We need to also mock bcrypt compare to return true for password login
      // Directly call _createTokenPair via registerComplete

      // Register complete flow:
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)  // First findFirst: no existing user
        .mockResolvedValueOnce(null); // Second findFirst: still no existing user
      mockPrismaService.user.create.mockResolvedValue(userPayload);
      mockPrismaService.userSession.create.mockResolvedValue({ id: 'session-1' });

      return authService.registerComplete({
        contact: 'newuser@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'SecurePass123!',
        name: 'New User',
      }).then(() => {
        // Then: ConfigService.get should have been called for both JWT_EXPIRATION and JWT_REFRESH_EXPIRATION
        expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRATION');
        expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_EXPIRATION');
      });
    });

    it('should pass JWT_EXPIRATION from ConfigService to JwtService.sign as expiresIn', async () => {
      // Arrange
      const configExpiration = '3600'; // 1 hour
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRATION') return configExpiration;
        if (key === 'JWT_REFRESH_EXPIRATION') return '604800';
        return undefined;
      });

      const userPayload = {
        id: 'test-user-id',
        name: 'Test User',
        role: 'CUSTOMER' as const,
        passwordHash: 'hash123',
        phone: null,
        phoneHash: null,
        email: 'test@example.com',
        emailHash: 'hash456',
        createdAt: new Date(),
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValue(userPayload);
      mockPrismaService.userSession.create.mockResolvedValue({ id: 'session-1' });

      // Act
      await authService.registerComplete({
        contact: 'newuser@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'SecurePass123!',
        name: 'New User',
      });

      // Assert: JwtService.sign should be called with the config value as expiresIn
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: configExpiration,
        }),
      );
    });

    it('should pass JWT_REFRESH_EXPIRATION from ConfigService to JwtService.sign for refresh token', async () => {
      // Arrange
      const configRefreshExpiration = '1209600'; // 14 days
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRATION') return '900';
        if (key === 'JWT_REFRESH_EXPIRATION') return configRefreshExpiration;
        return undefined;
      });

      const userPayload = {
        id: 'test-user-id',
        name: 'Test User',
        role: 'CUSTOMER' as const,
        passwordHash: 'hash123',
        phone: null,
        phoneHash: null,
        email: 'test@example.com',
        emailHash: 'hash456',
        createdAt: new Date(),
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValue(userPayload);
      mockPrismaService.userSession.create.mockResolvedValue({ id: 'session-1' });

      // Track sign calls
      const signCalls: Array<{ payload: any; options: any }> = [];
      jwtService.sign.mockImplementation((payload, options) => {
        signCalls.push({ payload, options });
        return 'mock-token-' + signCalls.length;
      });

      // Act
      await authService.registerComplete({
        contact: 'newuser@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'SecurePass123!',
        name: 'New User',
      });

      // Assert: Second sign call (refresh token) should use config value
      expect(signCalls.length).toBeGreaterThanOrEqual(2);
      const refreshTokenCall = signCalls[1];
      expect(refreshTokenCall.options.expiresIn).toBe(configRefreshExpiration);
    });

    it('should fall back to hardcoded ACCESS_TOKEN_EXPIRES_IN_SECONDS (900) when JWT_EXPIRATION is not configured', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined); // No JWT_EXPIRATION configured

      const userPayload = {
        id: 'test-user-id',
        name: 'Test User',
        role: 'CUSTOMER' as const,
        passwordHash: 'hash123',
        phone: null,
        phoneHash: null,
        email: 'test@example.com',
        emailHash: 'hash456',
        createdAt: new Date(),
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValue(userPayload);
      mockPrismaService.userSession.create.mockResolvedValue({ id: 'session-1' });

      const signCalls: Array<{ payload: any; options: any }> = [];
      jwtService.sign.mockImplementation((payload, options) => {
        signCalls.push({ payload, options });
        return 'mock-token-' + signCalls.length;
      });

      // Act
      await authService.registerComplete({
        contact: 'newuser@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'SecurePass123!',
        name: 'New User',
      });

      // Assert: Default expiresIn should be 900 (15 min) for access token
      const accessTokenCall = signCalls[0];
      expect(accessTokenCall.options.expiresIn).toBe(900);
    });

    it('should fall back to hardcoded REFRESH_TOKEN_EXPIRES_IN_SECONDS (604800) when JWT_REFRESH_EXPIRATION is not configured', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined); // No JWT_REFRESH_EXPIRATION configured

      const userPayload = {
        id: 'test-user-id',
        name: 'Test User',
        role: 'CUSTOMER' as const,
        passwordHash: 'hash123',
        phone: null,
        phoneHash: null,
        email: 'test@example.com',
        emailHash: 'hash456',
        createdAt: new Date(),
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValue(userPayload);
      mockPrismaService.userSession.create.mockResolvedValue({ id: 'session-1' });

      const signCalls: Array<{ payload: any; options: any }> = [];
      jwtService.sign.mockImplementation((payload, options) => {
        signCalls.push({ payload, options });
        return 'mock-token-' + signCalls.length;
      });

      // Act
      await authService.registerComplete({
        contact: 'newuser@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'SecurePass123!',
        name: 'New User',
      });

      // Assert: Default expiresIn should be 604800 (7 days) for refresh token
      const refreshTokenCall = signCalls[1];
      expect(refreshTokenCall.options.expiresIn).toBe(604800);
    });
  });
});
