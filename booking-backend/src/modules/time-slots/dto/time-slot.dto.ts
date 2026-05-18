import { IsString, IsDateString, IsBoolean, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimeSlotDto {
  @ApiProperty({ description: 'Service ID' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ description: 'Slot start time (ISO string)' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'Slot end time (ISO string)' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ description: 'Capacity', default: 1 })
  @IsOptional()
  @IsInt()
  capacity?: number;
}

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({ description: 'Slot start time (ISO string)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Slot end time (ISO string)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Capacity' })
  @IsOptional()
  @IsInt()
  capacity?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AvailableTimeSlotDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  capacity!: number;

  @ApiProperty()
  bookedCount!: number;

  @ApiProperty()
  available!: boolean;

  @ApiPropertyOptional()
  maxOvertimeMinutes?: number;
}
