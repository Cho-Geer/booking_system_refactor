import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SystemRole, UserStatus } from "@prisma/client";

export interface DeviceInfo {
  [key: string]: unknown;
}

export class CreateUserDto {
  @ApiProperty({ description: "User name" })
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MaxLength(100, { message: "Name must not exceed 100 characters" })
  name: string;

  @ApiPropertyOptional({ description: "User email" })
  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  @MaxLength(255, { message: "Email must not exceed 255 characters" })
  email?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "Phone must not exceed 20 characters" })
  phone?: string;

  @ApiProperty({ description: "User password" })
  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  password: string;

  @ApiPropertyOptional({
    description: "User role",
    enum: SystemRole,
    default: "CUSTOMER",
  })
  @IsOptional()
  @IsEnum(SystemRole, { message: "Invalid user role" })
  role?: SystemRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "User name" })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Name cannot be empty" })
  @MaxLength(100, { message: "Name must not exceed 100 characters" })
  name?: string;

  @ApiPropertyOptional({ description: "User email" })
  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  @MaxLength(255, { message: "Email must not exceed 255 characters" })
  email?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "Phone must not exceed 20 characters" })
  phone?: string;

  @ApiPropertyOptional({ description: "User status", enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: "Invalid user status" })
  status?: UserStatus;

  @ApiPropertyOptional({ description: "User role", enum: SystemRole })
  @IsOptional()
  @IsEnum(SystemRole, { message: "Invalid user role" })
  role?: SystemRole;
}

export class UserResponseDto {
  @ApiProperty({ description: "User ID" })
  id: string;

  @ApiProperty({ description: "User name" })
  name: string;

  @ApiPropertyOptional({ description: "User email" })
  email?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  phone?: string;

  @ApiProperty({ description: "User role", enum: SystemRole })
  role: SystemRole;

  @ApiProperty({ description: "User status", enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ description: "Last login time" })
  lastLoginAt?: Date;

  @ApiProperty({ description: "Device info" })
  deviceInfo?: DeviceInfo;

  @ApiPropertyOptional({ description: "Remarks" })
  remarks?: string;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at" })
  updatedAt: Date;
}
