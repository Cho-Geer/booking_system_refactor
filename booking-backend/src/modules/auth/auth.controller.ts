import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Headers,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterSendCodeDto } from "./dto/register-send-code.dto";
import { RegisterCompleteDto } from "./dto/register-complete.dto";
import { LoginSendCodeDto } from "./dto/login-send-code.dto";
import { LoginVerifyCodeDto } from "./dto/login-verify-code.dto";
import { LoginPasswordDto } from "./dto/login-password.dto";
import {
  ResetPasswordSendCodeDto,
  ResetPasswordVerifyDto,
} from "./dto/reset-password.dto";
import {
  AuthResponseDto,
  SendCodeResponseDto,
  LogoutResponseDto,
} from "./dto/auth-response.dto";
import { Public } from "../../common/decorators/public.decorator";
import { RateLimit } from "../rate-limiter/rate-limiter.decorator";

@ApiTags("authentication")
@Controller("auth")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** HttpOnly cookie configuration for refresh token */
  private readonly REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };

  /** Cookie name for refresh token */
  private readonly REFRESH_COOKIE_NAME = "refreshToken";

  // ==================== 注册流程 ====================

  @Public()
  @Post("register/send-code")
  @RateLimit({ tier: "auth", key: "email" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "注册第一步：发送验证码" })
  @ApiBody({ type: RegisterSendCodeDto })
  @ApiResponse({
    status: 200,
    description: "验证码发送成功",
    type: SendCodeResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "手机号/邮箱已注册",
  })
  @ApiResponse({
    status: 429,
    description: "超出限流",
  })
  async registerSendCode(
    @Body() sendDto: RegisterSendCodeDto,
  ): Promise<SendCodeResponseDto> {
    return this.authService.registerSendCode(sendDto);
  }

  @Public()
  @Post("register/complete")
  @RateLimit({ tier: "auth", key: "ip", limit: 10 })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "注册第二步：完成注册" })
  @ApiBody({ type: RegisterCompleteDto })
  @ApiResponse({
    status: 201,
    description: "注册成功，返回 Token（refreshToken 通过 HttpOnly Cookie 传输）",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "验证码无效或已过期",
  })
  @ApiResponse({
    status: 409,
    description: "手机号/邮箱已注册（并发）",
  })
  async registerComplete(
    @Body() completeDto: RegisterCompleteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto & { _message: string }> {
    const result = await this.authService.registerComplete(completeDto);
    this.setRefreshCookie(res, result.refreshToken);
    return { ...this.stripRefreshToken(result), _message: "注册成功" };
  }

  // ==================== 登录流程 ====================

  @Public()
  @Post("login/send-code")
  @RateLimit({ tier: "auth", key: "email" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "登录第一步：发送验证码" })
  @ApiBody({ type: LoginSendCodeDto })
  @ApiResponse({
    status: 200,
    description: "验证码发送成功（防枚举，用户不存在也返回 200）",
    type: SendCodeResponseDto,
  })
  async loginSendCode(
    @Body() sendDto: LoginSendCodeDto,
  ): Promise<SendCodeResponseDto> {
    return this.authService.loginSendCode(sendDto);
  }

  @Public()
  @Post("login/verify-code")
  @RateLimit({ tier: "auth", key: "email", limit: 10 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "验证码登录" })
  @ApiBody({ type: LoginVerifyCodeDto })
  @ApiResponse({
    status: 200,
    description: "登录成功，返回 Token（refreshToken 通过 HttpOnly Cookie 传输）",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "验证码无效或已过期",
  })
  @ApiResponse({
    status: 404,
    description: "用户不存在",
  })
  async loginVerifyCode(
    @Body() verifyDto: LoginVerifyCodeDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<AuthResponseDto & { _message: string }> {
    const result = await this.authService.loginVerifyCode(
      verifyDto,
      req.ip,
      req.headers["user-agent"],
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { ...this.stripRefreshToken(result), _message: "登录成功" };
  }

  @Public()
  @Post("login/password")
  @RateLimit({ tier: "auth", key: "email" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "密码登录" })
  @ApiBody({ type: LoginPasswordDto })
  @ApiResponse({
    status: 200,
    description: "登录成功，返回 Token（refreshToken 通过 HttpOnly Cookie 传输）",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "凭证无效",
  })
  @ApiResponse({
    status: 429,
    description: "超出限流",
  })
  async loginPassword(
    @Body() loginDto: LoginPasswordDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<AuthResponseDto & { _message: string }> {
    const result = await this.authService.loginPassword(
      loginDto,
      req.ip,
      req.headers["user-agent"],
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { ...this.stripRefreshToken(result), _message: "登录成功" };
  }

  // ==================== 重置密码流程 ====================

  @Public()
  @Post("reset-password/send-code")
  @RateLimit({ tier: "auth", key: "email" })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "重置密码第一步：发送验证码" })
  @ApiBody({ type: ResetPasswordSendCodeDto })
  @ApiResponse({
    status: 200,
    description: "验证码发送成功（防枚举，用户不存在也返回 200）",
    type: SendCodeResponseDto,
  })
  async resetPasswordSendCode(
    @Body() sendDto: ResetPasswordSendCodeDto,
  ): Promise<SendCodeResponseDto> {
    return this.authService.resetPasswordSendCode(sendDto);
  }

  @Public()
  @Post("reset-password/verify")
  @RateLimit({ tier: "auth", key: "email", limit: 10 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "重置密码第二步：验证码校验并更新密码" })
  @ApiBody({ type: ResetPasswordVerifyDto })
  @ApiResponse({
    status: 200,
    description: "密码重置成功",
  })
  @ApiResponse({
    status: 400,
    description: "验证码无效或已过期",
  })
  async resetPasswordVerify(
    @Body() verifyDto: ResetPasswordVerifyDto,
  ): Promise<{ _message: string } & { message: string }> {
    const result = await this.authService.resetPasswordVerify(verifyDto);
    return { ...result, _message: "密码重置成功" };
  }

  // ==================== Token 管理 ====================

  @Public()
  @Post("refresh")
  @RateLimit({ tier: "auth", key: "ip", limit: 10 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "刷新 Token（旋转模式，refreshToken 来自 Cookie）" })
  @ApiResponse({
    status: 200,
    description: "刷新成功，返回新 Token（refreshToken 通过 HttpOnly Cookie 传输）",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Refresh Token 无效或已过期",
  })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not found");
    }
    const result = await this.authService.refreshTokens({ refreshToken });
    this.setRefreshCookie(res, result.refreshToken);
    return this.stripRefreshToken(result);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "登出" })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({
    status: 200,
    description: "登出成功",
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未认证",
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers("Authorization") authHeader: string,
  ): Promise<LogoutResponseDto> {
    const accessToken = authHeader?.replace("Bearer ", "") || "";
    const refreshToken =
      req.cookies?.[this.REFRESH_COOKIE_NAME] || "";
    const user = req.user as { id?: string; sub?: string } | undefined;
    const userId = user?.id || user?.sub;

    if (!userId) {
      throw new UnauthorizedException("无法获取用户身份");
    }

    this.clearRefreshCookie(res);
    return this.authService.logout(userId, accessToken, refreshToken);
  }

  // ==================== Helpers ====================

  /**
   * Set the HttpOnly refresh token cookie on the response.
   */
  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(this.REFRESH_COOKIE_NAME, token, this.REFRESH_COOKIE_OPTIONS);
  }

  /**
   * Clear the refresh token cookie.
   */
  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.REFRESH_COOKIE_NAME, {
      path: this.REFRESH_COOKIE_OPTIONS.path,
    });
  }

  /**
   * Strip the refreshToken from the response body before sending JSON.
   * The refreshToken is transmitted via HttpOnly cookie, not in the response body.
   */
  private stripRefreshToken(
    result: AuthResponseDto & { refreshToken: string },
  ): AuthResponseDto {
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    };
  }
}
