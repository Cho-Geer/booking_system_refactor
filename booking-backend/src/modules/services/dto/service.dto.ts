import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  IsPositive,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateServiceDto {
  @ApiPropertyOptional({ description: "Service category ID" })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiProperty({ description: "Service name" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Service description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Duration in minutes" })
  @IsNumber()
  @IsPositive()
  durationMinutes: number;

  @ApiProperty({ description: "Service price" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "Maximum capacity", default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxCapacity?: number;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ description: "Service category ID" })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ description: "Service name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Service description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Duration in minutes" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: "Service price" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "Is service active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Maximum capacity" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxCapacity?: number;
}
