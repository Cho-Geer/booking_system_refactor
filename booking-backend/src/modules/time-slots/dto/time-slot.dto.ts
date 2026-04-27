import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsInt,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTimeSlotDto {
  @ApiProperty({ description: "Service ID" })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: "Slot time (ISO string)" })
  @IsDateString()
  slotTime: string;

  @ApiPropertyOptional({ description: "Duration in minutes", default: 60 })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: "Capacity", default: 1 })
  @IsOptional()
  @IsInt()
  capacity?: number;

  @ApiPropertyOptional({ description: "Is active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Display order", default: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({ description: "Slot time (ISO string)" })
  @IsOptional()
  @IsDateString()
  slotTime?: string;

  @ApiPropertyOptional({ description: "Duration in minutes" })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: "Capacity" })
  @IsOptional()
  @IsInt()
  capacity?: number;

  @ApiPropertyOptional({ description: "Is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Display order" })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
