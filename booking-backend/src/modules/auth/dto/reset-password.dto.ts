import { IsString, IsEnum, IsNotEmpty, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ContactType } from "./register-send-code.dto";

export class ResetPasswordSendCodeDto {
  @ApiProperty({ description: "联系方式（手机号或邮箱原文）", example: "13800138000" })
  @IsString()
  @IsNotEmpty({ message: "Contact is required" })
  contact!: string;

  @ApiProperty({ description: "联系方式类型", enum: ContactType, example: "phone" })
  @IsEnum(ContactType, { message: "Contact type must be phone or email" })
  contactType!: ContactType;
}

export class ResetPasswordVerifyDto {
  @ApiProperty({ description: "联系方式（手机号或邮箱原文）", example: "13800138000" })
  @IsString()
  @IsNotEmpty({ message: "Contact is required" })
  contact!: string;

  @ApiProperty({ description: "联系方式类型", enum: ContactType, example: "phone" })
  @IsEnum(ContactType, { message: "Contact type must be phone or email" })
  contactType!: ContactType;

  @ApiProperty({ description: "验证码", example: "123456" })
  @IsString()
  @IsNotEmpty({ message: "Code is required" })
  code!: string;

  @ApiProperty({ description: "新密码", minLength: 8, maxLength: 72 })
  @IsString()
  @IsNotEmpty({ message: "New password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72, { message: "Password must not exceed 72 characters" })
  newPassword!: string;
}
