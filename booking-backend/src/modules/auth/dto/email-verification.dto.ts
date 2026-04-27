import { IsEmail, IsString, IsNotEmpty, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Enumeration of verification code types.
 * Maps to the `type` column in email_verification_codes table.
 */
export enum VerificationCodeType {
  REGISTER = "REGISTER",
  LOGIN = "LOGIN",
  RESET = "RESET",
}

export class SendVerificationCodeDto {
  @ApiProperty({
    description: "Email address to send verification code",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "邮箱格式不正确" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string;

  @ApiProperty({
    description: "Type of verification code",
    enum: VerificationCodeType,
    example: VerificationCodeType.REGISTER,
  })
  @IsEnum(VerificationCodeType, { message: "验证码类型无效" })
  @IsNotEmpty({ message: "验证码类型不能为空" })
  type: VerificationCodeType;
}

export class VerifyVerificationCodeDto {
  @ApiProperty({
    description: "Email address to verify",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "邮箱格式不正确" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string;

  @ApiProperty({ description: "Verification code", example: "123456" })
  @IsString()
  @IsNotEmpty({ message: "验证码不能为空" })
  code: string;

  @ApiProperty({
    description: "Type of verification code",
    enum: VerificationCodeType,
    example: VerificationCodeType.REGISTER,
  })
  @IsEnum(VerificationCodeType, { message: "验证码类型无效" })
  @IsNotEmpty({ message: "验证码类型不能为空" })
  type: VerificationCodeType;
}
