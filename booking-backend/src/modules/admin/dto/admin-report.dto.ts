import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReportQueryDto {
  @ApiProperty({ format: "date" })
  startDate!: string;

  @ApiProperty({ format: "date" })
  endDate!: string;
}

export class AdminReportSummaryDto {
  @ApiProperty()
  totalBookings!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty({ description: "Cancellation rate (0-1)" })
  cancellationRate!: number;

  @ApiProperty({ description: "Top services ranking" })
  topServices!: { serviceName: string; count: number; revenue: number }[];

  @ApiProperty({ description: "Daily statistics for the date range" })
  dailyStats!: { date: string; bookings: number; revenue: number }[];
}
