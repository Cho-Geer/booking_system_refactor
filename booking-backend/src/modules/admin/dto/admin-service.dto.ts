import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString, IsBoolean } from "class-validator";
import { Type } from "class-transformer";

export class AdminServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: "Duration in minutes" })
  duration!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty({ description: "Whether the service is active" })
  active!: boolean;

  @ApiPropertyOptional({ description: "Price per minute (auto-calculated)" })
  pricePerMinute?: number;

  @ApiPropertyOptional({ description: "Image URL (placeholder)" })
  imageUrl?: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class CreateAdminServiceDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ description: "Duration in minutes" })
  duration!: number;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional({ default: true })
  active?: boolean;

  @ApiPropertyOptional({ description: "Price per minute (auto-calculated)" })
  pricePerMinute?: number;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class UpdateAdminServiceDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Duration in minutes" })
  duration?: number;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: "Price per minute (auto-calculated)" })
  pricePerMinute?: number;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class AdminServicesQueryDto {
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

  @ApiPropertyOptional({ description: "Search by service name or description" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
