import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString, IsNotEmpty, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class AdminAppointmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: "Display ID for admin panel" })
  appointmentNumber!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  userName!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  timeSlotId!: string;

  @ApiProperty({ format: "date-time" })
  appointmentDate!: string;

  @ApiProperty({ enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"] })
  status!: string;

  @ApiPropertyOptional({ description: "Duration in minutes" })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: "Price" })
  price?: number;

  @ApiPropertyOptional({ description: "Tax rate" })
  taxRate?: number;

  @ApiPropertyOptional({ description: "Tax included amount" })
  taxIncludedAmount?: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"] })
  status!: string;

  @ApiPropertyOptional({ description: "Reason for status change" })
  reason?: string;
}

export class BatchCancelDto {
  @ApiProperty({ type: [String] })
  ids!: string[];

  @ApiPropertyOptional()
  reason?: string;
}

export class BatchCancelResponseDto {
  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty({ type: [String] })
  failedIds!: string[];
}

export class CreateAdminAppointmentDto {
  @ApiProperty({ description: "Customer user ID" })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: "Service ID" })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ format: "date-time", description: "Appointment date and time" })
  @IsString()
  @IsNotEmpty()
  appointmentDate!: string;

  @ApiProperty({ description: "Time slot ID" })
  @IsString()
  @IsNotEmpty()
  timeSlotId!: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Overtime minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeMinutes?: number;
}

export class AdminAppointmentsQueryDto {
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

  @ApiPropertyOptional({ enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Search by appointment number, customer name, or service name" })
  @IsOptional()
  @IsString()
  search?: string;
}
