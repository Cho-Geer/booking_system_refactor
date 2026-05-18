import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  StatsService,
  OverviewStats,
  RevenueStats,
  UserStats,
  PopularService,
  DailyBooking,
} from './stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Stats')
@ApiBearerAuth('JWT-auth')
@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * GET /api/v1/stats/overview
   * Overall statistics dashboard
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get overall statistics dashboard overview' })
  @ApiResponse({
    status: 200,
    description: 'Overall statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getOverview(): Promise<OverviewStats> {
    return this.statsService.getOverview();
  }

  /**
   * GET /api/v1/stats/revenue
   * Revenue statistics
   */
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Revenue statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getRevenue(): Promise<RevenueStats> {
    return this.statsService.getRevenue();
  }

  /**
   * GET /api/v1/stats/users
   * User growth statistics
   */
  @Get('users')
  @ApiOperation({ summary: 'Get user growth statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getUserStats(): Promise<UserStats> {
    return this.statsService.getUserStats();
  }

  /**
   * GET /api/v1/stats/popular-services
   * Most booked services
   */
  @Get('popular-services')
  @ApiOperation({ summary: 'Get top 10 most booked services' })
  @ApiResponse({
    status: 200,
    description: 'Popular services retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getPopularServices(): Promise<PopularService[]> {
    return this.statsService.getPopularServices();
  }

  /**
   * GET /api/v1/stats/daily-bookings
   * Daily booking trend
   */
  @Get('daily-bookings')
  @ApiOperation({ summary: 'Get daily booking trend for last 30 days' })
  @ApiResponse({
    status: 200,
    description: 'Daily bookings retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getDailyBookings(): Promise<DailyBooking[]> {
    return this.statsService.getDailyBookings();
  }
}
