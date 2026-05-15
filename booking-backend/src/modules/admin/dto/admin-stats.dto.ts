import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
} from "class-validator";

export interface TimeDistributionItem {
  hour: number;
  count: number;
}

export interface ServiceDistributionItem {
  serviceName: string;
  count: number;
  percentage: number;
}

export class StatCardDto {
  @ApiProperty({ description: "Current value" })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: "Percentage change vs previous period" })
  @IsNumber()
  changePercentage!: number;

  @ApiProperty({ description: "Whether the change is positive (upward trend)" })
  @IsBoolean()
  isPositive!: boolean;

  @ApiProperty({ description: "Target value for progress tracking" })
  @IsNumber()
  target!: number;

  @ApiProperty({ description: "Progress toward target as percentage (0-100)" })
  @IsNumber()
  progressPercentage!: number;
}

export class AdminStatsDto {
  @ApiProperty({ description: "Today's bookings stat card" })
  todayBookings!: StatCardDto;

  @ApiProperty({ description: "Pending confirmation bookings stat card" })
  pendingBookings!: StatCardDto;

  @ApiProperty({ description: "Active users stat card" })
  activeUsers!: StatCardDto;

  @ApiProperty({ description: "Total revenue stat card" })
  totalRevenue!: StatCardDto;

  @ApiProperty({ description: "Booking trend for last 7 days" })
  bookingTrend!: { date: string; count: number; revenue: number }[];

  @ApiProperty({ description: "Service popularity ranking" })
  servicePopularity!: {
    serviceName: string;
    count: number;
    percentage: number;
  }[];

  @ApiProperty({
    description: "Hourly booking distribution",
    type: "array",
    items: {
      type: "object",
      properties: { hour: { type: "integer" }, count: { type: "integer" } },
    },
  })
  timeDistribution!: TimeDistributionItem[];

}

export class SystemStatusDto {
  @ApiProperty({
    description: "Server status indicator (Online/Degraded/Offline)",
  })
  @IsString()
  server!: string;

  @ApiProperty({
    description: "Database status indicator (Online/Degraded/Offline)",
  })
  @IsString()
  database!: string;

  @ApiProperty({
    description: "API status indicator (Online/Degraded/Offline)",
  })
  @IsString()
  api!: string;

  @ApiProperty({
    description: "Redis status indicator (Online/Degraded/Offline)",
  })
  @IsString()
  redis!: string;

  @ApiProperty({ description: "Timestamp of last database backup (ISO 8601)" })
  @IsString()
  lastBackup!: string;

  @ApiProperty({
    description: "Uptime percentage display string (e.g. '99.9%')",
  })
  @IsString()
  uptime!: string;
}

export class SystemMetricsDto {
  @ApiProperty({ description: "CPU usage percentage (0-100)" })
  @IsNumber()
  cpuUsage!: number;

  @ApiProperty({ description: "Memory usage percentage (0-100)" })
  @IsNumber()
  memoryUsage!: number;

  @ApiProperty({ description: "Disk usage percentage (0-100)" })
  @IsNumber()
  diskUsage!: number;
}
