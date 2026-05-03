import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

export class AdminAppointmentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"] })
  status?: string;

  @ApiPropertyOptional({ format: "date" })
  startDate?: string;

  @ApiPropertyOptional({ format: "date" })
  endDate?: string;

  @ApiPropertyOptional()
  serviceId?: string;

  @ApiPropertyOptional()
  userId?: string;
}
