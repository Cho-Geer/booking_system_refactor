import { IsString, IsEnum, IsNotEmpty, MinLength, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ContactType } from "./register-send-code.dto";

export class LoginPasswordDto {
  @ApiProperty({
    description: "联系方式（手机号或邮箱原文）",
    example: "13800138000",
  })
  @IsString()
  @IsNotEmpty({ message: "Contact is required" })
  contact!: string;

  @ApiProperty({
    description: "联系方式类型",
    enum: ContactType,
    example: "phone",
  })
  @IsEnum(ContactType, { message: "Contact type must be phone or email" })
  contactType!: ContactType;

  @ApiProperty({
    description:
      "Password (min 8 chars, uppercase, lowercase, number, special char)",
    example: "SecurePass123!",
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    },
  )
  password!: string;
}
