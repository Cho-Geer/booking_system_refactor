import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentStatus } from "@prisma/client";

export class CreateAppointmentDto {
  @ApiProperty({ description: "Time slot ID" })
  @IsUUID("4", { message: "timeSlotId must be a valid UUID" })
  timeSlotId: string;

  @ApiProperty({ description: "Service ID" })
  @IsUUID("4", { message: "serviceId must be a valid UUID" })
  serviceId: string;

  @ApiProperty({ description: "Customer info (name, email, phone)" })
  @IsOptional()
  @IsObject()
  customerInfo?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Notes must not exceed 500 characters" })
  notes?: string;

  @ApiPropertyOptional({ description: "Preferred sequence number", minimum: 0, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  preferredSequence?: number;

  @ApiPropertyOptional({ description: "Overtime minutes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeMinutes?: number;

  @ApiProperty({ description: "Appointment date-time string" })
  @IsString()
  appointmentDate: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: "Appointment status",
    enum: AppointmentStatus,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: "Cancel reason" })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class AppointmentResponseDto {
  @ApiProperty({ description: "Appointment ID" })
  id: string;

  @ApiProperty({ description: "User ID" })
  userId: string;

  @ApiProperty({ description: "Time slot ID" })
  timeSlotId: string;

  @ApiProperty({ description: "Service ID" })
  serviceId: string;

  @ApiProperty({ description: "Status", enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ description: "Customer name" })
  customerName: string;

  @ApiProperty({ description: "Customer email" })
  customerEmail: string;

  @ApiProperty({ description: "Customer phone" })
  customerPhone: string;

  @ApiPropertyOptional({ description: "Notes" })
  notes?: string;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at" })
  updatedAt: Date;
}
