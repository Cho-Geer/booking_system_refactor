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
import {
  AuthResponseDto,
  SendCodeResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';

/**
 * Helper: create a mock Express Response object
 */
function createMockRes(): any {
  const res: any = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Helper: create a mock Express Request object with cookies
 */
function createMockReq(cookies: Record<string, string> = {}): any {
  return {
    cookies: { ...cookies },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
    user: { id: 'test-user-id' },
  };
}

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
    it('should call authService.registerComplete, set cookie, and return tokens without refreshToken', async () => {
      const dto: RegisterCompleteDto = {
        contact: 'new@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'ValidPass123!',
        name: 'John Doe',
      };
      // Service returns full token pair including refreshToken
      mockAuthService.registerComplete.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      const mockRes = createMockRes();

      const result = await controller.registerComplete(dto, mockRes);

      expect(authService.registerComplete).toHaveBeenCalledWith(dto);
      // Should set HttpOnly cookie with refreshToken
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );
      // Response body should NOT contain refreshToken
      expect(result).toEqual({
        accessToken: 'access-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      expect((result as any).refreshToken).toBeUndefined();
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

      const mockRes = createMockRes();
      await expect(controller.registerComplete(dto, mockRes)).rejects.toThrow(
        '该邮箱已注册',
      );
      expect(authService.registerComplete).toHaveBeenCalledWith(dto);
    });
  });

  describe('loginPassword', () => {
    it('should call authService.loginPassword, set cookie, and return tokens without refreshToken', async () => {
      const dto: LoginPasswordDto = {
        contact: 'user@example.com',
        contactType: ContactType.EMAIL,
        password: 'ValidPass123!',
      };
      mockAuthService.loginPassword.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      const mockRes = createMockRes();
      const mockReq = createMockReq();

      const result = await controller.loginPassword(dto, mockRes, mockReq);

      expect(authService.loginPassword).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      expect((result as any).refreshToken).toBeUndefined();
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

      const mockRes = createMockRes();
      const mockReq = createMockReq();
      await expect(controller.loginPassword(dto, mockRes, mockReq)).rejects.toThrow('凭证无效');
      expect(authService.loginPassword).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
    });
  });

  describe('loginVerifyCode', () => {
    it('should call authService.loginVerifyCode, set cookie, and return tokens without refreshToken', async () => {
      const dto: LoginVerifyCodeDto = {
        contact: 'user@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
      };
      mockAuthService.loginVerifyCode.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      const mockRes = createMockRes();
      const mockReq = createMockReq();

      const result = await controller.loginVerifyCode(dto, mockRes, mockReq);

      expect(authService.loginVerifyCode).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      expect((result as any).refreshToken).toBeUndefined();
    });

    it('should propagate UnauthorizedException from authService.loginVerifyCode', async () => {
      const dto: LoginVerifyCodeDto = {
        contact: 'invalid@example.com',
        contactType: ContactType.EMAIL,
        code: '000000',
      };

      mockAuthService.loginVerifyCode.mockRejectedValue(
        new (class extends Error {
          statusCode = HttpStatus.UNAUTHORIZED;
          message = '验证码无效或已过期';
        })(),
      );

      const mockRes = createMockRes();
      const mockReq = createMockReq();
      await expect(controller.loginVerifyCode(dto, mockRes, mockReq)).rejects.toThrow(
        '验证码无效或已过期',
      );
      expect(authService.loginVerifyCode).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
    });
  });

  describe('refreshTokens', () => {
    it('should read refreshToken from cookie, call service, set new cookie, and return tokens', async () => {
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      const mockReq = createMockReq({ refreshToken: 'valid-refresh-token' });
      const mockRes = createMockRes();

      const result = await controller.refreshTokens(mockReq, mockRes);

      // Should extract refreshToken from req.cookies, not body
      expect(authService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: 'valid-refresh-token',
      });
      // Should set new HttpOnly cookie
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      // Response body should NOT contain refreshToken
      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      expect((result as any).refreshToken).toBeUndefined();
    });

    it('should throw 401 when refreshToken cookie is missing', async () => {
      const mockReq = createMockReq({}); // no refreshToken cookie
      const mockRes = createMockRes();

      await expect(controller.refreshTokens(mockReq, mockRes)).rejects.toThrow(
        'Refresh token not found',
      );
      expect(authService.refreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call authService.logout with userId and token, and clear cookie', async () => {
      mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

      const mockReq = createMockReq({ refreshToken: 'some-refresh-token' });
      mockReq.user = { id: 'test-user-id' };
      const mockRes = createMockRes();

      const result = await controller.logout(mockReq, mockRes, 'Bearer some-token');

      expect(authService.logout).toHaveBeenCalledWith(
        'test-user-id',
        'some-token',
        'some-refresh-token',
      );
      // Should clear the refreshToken cookie
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/',
      });
      expect(result.message).toBe('登出成功');
    });

    it('should handle missing Authorization header', async () => {
      mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

      const mockReq = createMockReq({ refreshToken: 'some-refresh-token' });
      mockReq.user = { id: 'test-user-id' };
      const mockRes = createMockRes();

      await controller.logout(mockReq, mockRes, '');

      expect(authService.logout).toHaveBeenCalledWith('test-user-id', '', 'some-refresh-token');
    });

    // ==================== FIX-P0-004 GREEN Phase ====================
    describe('FIX-P0-004: userId extraction from JWT (GREEN)', () => {
      it('should extract userId from req.user.id (JWT payload sub claim)', async () => {
        const mockReq = createMockReq({ refreshToken: 'some-refresh-token' });
        mockReq.user = { id: 'real-user-123', roles: ['CUSTOMER'] };
        const mockRes = createMockRes();
        mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

        await controller.logout(mockReq, mockRes, 'Bearer valid-token');

        expect(authService.logout).toHaveBeenCalledWith(
          'real-user-123',
          'valid-token',
          'some-refresh-token',
        );
      });

      it('should fallback to req.user.sub if req.user.id is not available', async () => {
        const mockReq = createMockReq({ refreshToken: 'some-refresh-token' });
        mockReq.user = { sub: 'fallback-user-456' };
        const mockRes = createMockRes();
        mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

        await controller.logout(mockReq, mockRes, 'Bearer valid-token');

        expect(authService.logout).toHaveBeenCalledWith(
          'fallback-user-456',
          'valid-token',
          'some-refresh-token',
        );
      });

      it('should throw error when JWT payload is missing userId', async () => {
        const mockReq = createMockReq({ refreshToken: 'some-refresh-token' });
        mockReq.user = {};
        const mockRes = createMockRes();

        await expect(
          controller.logout(mockReq, mockRes, 'Bearer invalid-token'),
        ).rejects.toThrow('无法获取用户身份');
      });

      it('should use different userId for different authenticated users', async () => {
        mockAuthService.logout.mockResolvedValue({ message: '登出成功' });

        // User A logout
        const mockReqA = createMockReq({ refreshToken: 'refresh-a' });
        mockReqA.user = { id: 'user-a-id' };
        const mockResA = createMockRes();
        await controller.logout(mockReqA, mockResA, 'Bearer user-a-token');
        const callA = mockAuthService.logout.mock.calls[0];

        mockAuthService.logout.mockClear();

        // User B logout
        const mockReqB = createMockReq({ refreshToken: 'refresh-b' });
        mockReqB.user = { id: 'user-b-id' };
        const mockResB = createMockRes();
        await controller.logout(mockReqB, mockResB, 'Bearer user-b-token');
        const callB = mockAuthService.logout.mock.calls[0];

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
        const dtoWithWeakPassword = {
          contact: 'test@example.com',
          contactType: ContactType.EMAIL,
          password: 'simplepassword',
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
