import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { RegisterSendCodeDto, ContactType } from './dto/register-send-code.dto';
import { RegisterCompleteDto } from './dto/register-complete.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { LoginSendCodeDto } from './dto/login-send-code.dto';
import { LoginVerifyCodeDto } from './dto/login-verify-code.dto';
import { RefreshTokenRequestDto } from './dto/auth-response.dto';
import {
  AuthResponseDto,
  SendCodeResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    registerSendCode: jest.fn(),
    registerComplete: jest.fn(),
    loginSendCode: jest.fn(),
    loginVerifyCode: jest.fn(),
    loginPassword: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationCode: jest.fn(),
    verifyCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    })
      .overridePipe(ValidationPipe)
      .useValue(new ValidationPipe({ transform: true, whitelist: true }))
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSendCode', () => {
    it('should call authService.registerSendCode and return success', async () => {
      const dto: RegisterSendCodeDto = {
        contact: 'new@example.com',
        contactType: ContactType.EMAIL,
      };
      const response: SendCodeResponseDto = {
        maskedContact: 'n***@example.com',
        expiresIn: 300,
      };

      mockAuthService.registerSendCode.mockResolvedValue(response);

      const result = await controller.registerSendCode(dto);

      expect(authService.registerSendCode).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  describe('registerComplete', () => {
    it('should call authService.registerComplete and return tokens', async () => {
      const dto: RegisterCompleteDto = {
        contact: 'new@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'ValidPass123!',
        name: 'John Doe',
      };
      const response: AuthResponseDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      mockAuthService.registerComplete.mockResolvedValue(response);

      const result = await controller.registerComplete(dto);

      expect(authService.registerComplete).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });

    it('should propagate ConflictException from authService.registerComplete', async () => {
      const dto: RegisterCompleteDto = {
        contact: 'existing@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'ValidPass123!',
        name: 'John Doe',
      };

      mockAuthService.registerComplete.mockRejectedValue(
        new (class extends Error {
          statusCode = HttpStatus.CONFLICT;
          message = '该邮箱已注册';
        })(),
      );

      await expect(controller.registerComplete(dto)).rejects.toThrow(
        '该邮箱已注册',
      );
      expect(authService.registerComplete).toHaveBeenCalledWith(dto);
    });
  });

  describe('loginPassword', () => {
    it('should call authService.loginPassword and return tokens', async () => {
      const dto: LoginPasswordDto = {
        contact: 'user@example.com',
        contactType: ContactType.EMAIL,
        password: 'ValidPass123!',
      };
      const response: AuthResponseDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      mockAuthService.loginPassword.mockResolvedValue(response);

      const result = await controller.loginPassword(dto);

      expect(authService.loginPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });

    it('should propagate UnauthorizedException from authService.loginPassword', async () => {
      const dto: LoginPasswordDto = {
        contact: 'invalid@example.com',
        contactType: ContactType.EMAIL,
        password: 'wrong-password',
      };

      mockAuthService.loginPassword.mockRejectedValue(
        new (class extends Error {
          statusCode = HttpStatus.UNAUTHORIZED;
          message = '凭证无效';
        })(),
      );

      await expect(controller.loginPassword(dto)).rejects.toThrow('凭证无效');
      expect(authService.loginPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with userId and token extracted from header', async () => {
      mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

      const mockReq = { user: { id: 'test-user-id' } };
      const result = await controller.logout(mockReq as any, 'Bearer some-token');

      expect(authService.logout).toHaveBeenCalledWith(
        'test-user-id',
        'some-token',
        'some-token',
      );
      expect(result.message).toBe('登出成功');
    });

    it('should handle missing Authorization header', async () => {
      mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

      const mockReq = { user: { id: 'test-user-id' } };
      await controller.logout(mockReq as any, '');

      expect(authService.logout).toHaveBeenCalledWith('test-user-id', '', '');
    });

    // ==================== FIX-P0-004 GREEN Phase ====================
    // 这些测试用例验证 logout 从 JWT payload 正确提取 userId
    describe('FIX-P0-004: userId extraction from JWT (GREEN)', () => {
      it('should extract userId from req.user.id (JWT payload sub claim)', async () => {
        const mockReq = { user: { id: 'real-user-123', roles: ['CUSTOMER'] } };
        mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

        await controller.logout(mockReq as any, 'Bearer valid-token');

        // GREEN 测试：验证使用 req.user.id 而不是硬编码值
        expect(authService.logout).toHaveBeenCalledWith(
          'real-user-123',
          'valid-token',
          expect.any(String),
        );
      });

      it('should fallback to req.user.sub if req.user.id is not available', async () => {
        const mockReq = { user: { sub: 'fallback-user-456' } };
        mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

        await controller.logout(mockReq as any, 'Bearer valid-token');

        expect(authService.logout).toHaveBeenCalledWith(
          'fallback-user-456',
          'valid-token',
          expect.any(String),
        );
      });

      it('should throw error when JWT payload is missing userId', async () => {
        const mockReq = { user: {} };

        await expect(controller.logout(mockReq as any, 'Bearer invalid-token')).rejects.toThrow(
          '无法获取用户身份',
        );
      });

      it('should use different userId for different authenticated users', async () => {
        mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

        // 用户 A 登出
        const mockReqA = { user: { id: 'user-a-id' } };
        await controller.logout(mockReqA as any, 'Bearer user-a-token');
        const callA = mockAuthService.logout.mock.calls[0];

        mockAuthService.logout.mockClear();

        // 用户 B 登出
        const mockReqB = { user: { id: 'user-b-id' } };
        await controller.logout(mockReqB as any, 'Bearer user-b-token');
        const callB = mockAuthService.logout.mock.calls[0];

        // GREEN 测试：两个用户的 userId 应该不同
        expect(callA[0]).toBe('user-a-id');
        expect(callB[0]).toBe('user-b-id');
        expect(callA[0]).not.toBe(callB[0]);
      });
    });
  });

  // Validation tests for DTOs using ValidationPipe
  describe('DTO Validation', () => {
    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({ transform: true, whitelist: true });
    });

    describe('LoginPasswordDto', () => {
      it('should validate contact is not empty', async () => {
        const invalidDto = { contact: '', password: 'ValidPass123!' };
        await expect(
          validationPipe.transform(invalidDto, {
            type: 'body',
            metatype: LoginPasswordDto,
          }),
        ).rejects.toThrow();
      });

      it('should validate password minimum length', async () => {
        const invalidDto = {
          contact: 'test@example.com',
          contactType: ContactType.EMAIL,
          password: 'short',
        };
        await expect(
          validationPipe.transform(invalidDto, {
            type: 'body',
            metatype: LoginPasswordDto,
          }),
        ).rejects.toThrow();
      });

      it('should pass validation for valid data', async () => {
        const validDto = {
          contact: 'test@example.com',
          contactType: ContactType.EMAIL,
          password: 'ValidPass123!',
        };
        await expect(
          validationPipe.transform(validDto, {
            type: 'body',
            metatype: LoginPasswordDto,
          }),
        ).resolves.toEqual(validDto);
      });
    });

    describe('RegisterCompleteDto', () => {
      it('should validate password complexity requirements', async () => {
        // Since FIX-P2-002, RegisterCompleteDto uses @IsStrongPassword with 12+ char minimum
        // and complexity requirements (uppercase, lowercase, digit, special char)
        const dtoWithWeakPassword = {
          contact: 'test@example.com',
          contactType: ContactType.EMAIL,
          password: 'simplepassword', // fails: no uppercase, no digit, no special char
          name: 'John Doe',
          code: '123456',
        };
        await expect(
          validationPipe.transform(dtoWithWeakPassword, {
            type: 'body',
            metatype: RegisterCompleteDto,
          }),
        ).rejects.toThrow();
      });

      it('should accept strong password meeting all complexity requirements', async () => {
        const dtoWithStrongPassword = {
          contact: 'test@example.com',
          contactType: ContactType.EMAIL,
          password: 'StrongPass1!@#',
          name: 'John Doe',
          code: '123456',
        };
        await expect(
          validationPipe.transform(dtoWithStrongPassword, {
            type: 'body',
            metatype: RegisterCompleteDto,
          }),
        ).resolves.toEqual(dtoWithStrongPassword);
      });

      it('should require all mandatory fields', async () => {
        const invalidDto = {
          contact: 'test@example.com',
          contactType: ContactType.EMAIL,
        };
        await expect(
          validationPipe.transform(invalidDto, {
            type: 'body',
            metatype: RegisterCompleteDto,
          }),
        ).rejects.toThrow();
      });
    });
  });
});
