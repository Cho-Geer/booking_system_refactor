import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString } from "class-validator";
import { Type } from "class-transformer";

export class AdminUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ description: "Masked email" })
  email?: string;

  @ApiPropertyOptional({ description: "Masked phone" })
  phone?: string;

  @ApiProperty({ description: "User role mapped from userType" })
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

  @ApiProperty({ minLength: 8 })
  password!: string;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] })
  role?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "BLOCKED"] })
  status?: string;
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
  @IsString()
  role?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE", "BLOCKED"] })
  @IsOptional()
  @IsString()
  status?: string;
}
