import { ApiProperty } from "@nestjs/swagger";

export class AdminStatsDto {
  @ApiProperty({ description: "Total bookings all time" })
  totalBookings!: number;

  @ApiProperty({ description: "Bookings created today" })
  todayBookings!: number;

  @ApiProperty({ description: "Active users (logged in last 30 days)" })
  activeUsers!: number;

  @ApiProperty({ description: "Total revenue from completed bookings" })
  totalRevenue!: number;

  @ApiProperty({ description: "Booking trend for last 7 days" })
  bookingTrend!: { date: string; count: number }[];

  @ApiProperty({ description: "Service popularity ranking" })
  servicePopularity!: { serviceName: string; count: number }[];
}
