import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString, IsEnum, MinLength, Matches } from "class-validator";
import { Type } from "class-transformer";
import { SystemRole, UserStatus } from "@prisma/client";

export class AdminUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ description: "Masked email" })
  email?: string;

  @ApiPropertyOptional({ description: "Masked phone" })
  phone?: string;

  @ApiProperty({ description: "User role" })
  role!: string;

  @ApiProperty({ description: "User status" })
  status!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class CreateAdminUserDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty({ enum: ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] })
  role!: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  @IsOptional()
  password?: string;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] })
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "BLOCKED"] })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Search by name, email, or phone" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] })
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "BLOCKED"] })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
