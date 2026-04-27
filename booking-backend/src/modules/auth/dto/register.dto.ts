import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ description: "User full name", example: "John Doe" })
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name!: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email!: string;

  @ApiPropertyOptional({
    description: "Phone number (Chinese format)",
    example: "13800138000",
  })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "Please provide a valid phone number" })
  phone?: string;

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

  @ApiProperty({
    description: "6-digit email verification code",
    example: "123456",
  })
  @IsString()
  @IsNotEmpty({ message: "Verification code is required" })
  @MinLength(6, { message: "Verification code must be 6 digits" })
  @MaxLength(6, { message: "Verification code must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "Verification code must contain only digits" })
  verifyCode!: string;
}
