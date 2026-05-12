import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { AdminStatsService } from "../services/admin-stats.service";
import {
  AdminStatsDto,
  ServiceDistributionItem,
  SystemStatusDto,
  SystemMetricsDto,
  TimeDistributionItem,
} from "../dto/admin-stats.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";

@ApiTags("Admin Stats")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get("stats")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get admin dashboard stats" })
  async getStats(): Promise<AdminStatsDto> {
    return this.adminStatsService.getDashboard();
  }

  @Get("stats/booking-trends")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get booking trend data filtered by time range" })
  @ApiQuery({
    name: "timeRange",
    required: false,
    enum: ["last24h", "last7d", "last30d", "thisMonth", "lastMonth", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({
    name: "range",
    required: false,
    enum: ["weekly", "monthly", "yearly"],
  })
  @ApiQuery({
    name: "granularity",
    required: false,
    enum: ["day", "week", "month"],
  })
  async getBookingTrend(
    @Query("timeRange") timeRange?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("range") range?: string,
    @Query("granularity") granularity?: string,
  ): Promise<{ date: string; count: number; revenue: number }[]> {
    return this.adminStatsService.getBookingTrend(
      timeRange,
      startDate,
      endDate,
      range,
      granularity,
    );
  }

  @Get("stats/service-distribution")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({
    summary: "Get service distribution with percentages (DASH-003)",
  })
  @ApiQuery({
    name: "timeRange",
    required: false,
    enum: ["last24h", "last7d", "last30d", "thisMonth", "lastMonth", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async getServiceDistribution(
    @Query("timeRange") timeRange?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ): Promise<ServiceDistributionItem[]> {
    return this.adminStatsService.getServiceDistribution(
      timeRange,
      startDate,
      endDate,
    );
  }

  @Get("stats/time-distribution")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({
    summary:
      "Get hourly time distribution with formatted hour strings (DASH-004)",
  })
  @ApiQuery({
    name: "timeRange",
    required: false,
    enum: ["last24h", "last7d", "last30d", "thisMonth", "lastMonth", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async getTimeDistribution(
    @Query("timeRange") timeRange?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ): Promise<TimeDistributionItem[]> {
    return this.adminStatsService.getTimeDistribution(
      timeRange,
      startDate,
      endDate,
    );
  }

  @Get("system/health")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get system health status for dashboard" })
  async getSystemStatus(): Promise<SystemStatusDto> {
    return this.adminStatsService.getSystemStatus();
  }

  @Get("system/metrics")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get detailed system metrics (CPU, memory, disk)" })
  async getSystemMetrics(): Promise<SystemMetricsDto> {
    return this.adminStatsService.getSystemMetrics();
  }
}
