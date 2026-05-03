import { Injectable } from "@nestjs/common";
import { StatsService } from "../../stats/stats.service";
import { AdminStatsDto } from "../dto/admin-stats.dto";

@Injectable()
export class AdminStatsService {
  constructor(private readonly statsService: StatsService) {}

  async getDashboard(): Promise<AdminStatsDto> {
    const [overview, revenue, userStats, popularServices, dailyBookings] =
      await Promise.all([
        this.statsService.getOverview(),
        this.statsService.getRevenue(),
        this.statsService.getUserStats(),
        this.statsService.getPopularServices(),
        this.statsService.getDailyBookings(),
      ]);

    const today = new Date().toISOString().slice(0, 10);
    const todayBookings = dailyBookings
      .filter((d) => d.date === today)
      .reduce((sum, d) => sum + d.bookings, 0);

    const bookingTrend = dailyBookings
      .slice(-7)
      .map((d) => ({ date: d.date, count: d.bookings }));

    const servicePopularity = popularServices.map((s) => ({
      serviceName: s.serviceName,
      count: s.bookingCount,
    }));

    return {
      totalBookings: overview.totalAppointments,
      todayBookings,
      activeUsers: userStats.activeUsers,
      totalRevenue: revenue.totalRevenue,
      bookingTrend,
      servicePopularity,
    };
  }
}
