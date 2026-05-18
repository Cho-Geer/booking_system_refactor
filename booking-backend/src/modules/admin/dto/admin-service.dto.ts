import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: 'Duration in minutes' })
  duration!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty({ description: 'Whether the service is active' })
  active!: boolean;

  @ApiPropertyOptional({ description: 'Price per minute (auto-calculated)' })
  pricePerMinute?: number;

  @ApiPropertyOptional({ description: 'Image URL (placeholder)' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Tax rate in percentage (e.g., 8 for 8%)' })
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Service category name' })
  category?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class CreateAdminServiceDto {
  @ApiPropertyOptional({ description: 'Service category name' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Price per minute (auto-calculated)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerMinute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Tax rate in percentage (e.g., 8 for 8%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class UpdateAdminServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Price per minute (auto-calculated)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerMinute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Tax rate in percentage (e.g., 8 for 8%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Service category name' })
  @IsOptional()
  @IsString()
  category?: string;
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

  @ApiPropertyOptional({ description: 'Search by service name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class AdminServiceSummaryDto {
  @ApiProperty({ description: 'Total number of services' })
  totalServices!: number;

  @ApiProperty({ description: 'Number of active services' })
  activeServicesCount!: number;

  @ApiProperty({ description: 'Number of inactive services' })
  inactiveServicesCount!: number;

  @ApiProperty({ description: 'Average price across all services' })
  averagePrice!: number;

  @ApiProperty({ description: 'Service count grouped by category' })
  categories!: { category: string; count: number }[];
}
