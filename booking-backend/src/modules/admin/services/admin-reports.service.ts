import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/database/prisma.service";
import { Prisma } from "@prisma/client";
import { AdminReportSummaryDto } from "../dto/admin-report.dto";

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get aggregated admin report summary within a date range.
   * Returns totals for bookings, revenue, cancellation rate, top services, and daily stats.
   */
  async getSummary(
    startDate: string,
    endDate: string,
  ): Promise<AdminReportSummaryDto> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const where = {
      appointmentDate: {
        gte: start,
        lte: end,
      },
    };

    // 1. Total bookings in range
    const totalBookings = await this.prisma.appointment.count({ where });

    // 2. Cancelled count for cancellation rate
    const cancelledCount = await this.prisma.appointment.count({
      where: {
        ...where,
        status: "CANCELLED",
      },
    });

    const cancellationRate =
      totalBookings > 0 ? cancelledCount / totalBookings : 0;

    // 3. Total revenue from COMPLETED appointments (SUM of service.price)
    const revenueResult = await this.prisma.$queryRaw<
      Array<{ total: string }>
    >(
      Prisma.sql`
        SELECT COALESCE(SUM(s.price), 0) as total
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.status = 'COMPLETED'
          AND a.appointment_date >= ${start}::date
          AND a.appointment_date <= ${end}::date
      `,
    );
    const totalRevenue = Number(revenueResult[0]?.total ?? 0);

    // 4. Top services (service name + booking count + revenue, ordered by count DESC, LIMIT 10)
    const topServicesRaw = await this.prisma.$queryRaw<
      Array<{
        service_name: string;
        booking_count: bigint;
        total_revenue: string;
      }>
    >(
      Prisma.sql`
        SELECT
          s.name as service_name,
          COUNT(a.id) as booking_count,
          COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) as total_revenue
        FROM services s
        LEFT JOIN appointments a ON s.id = a.service_id
          AND a.appointment_date >= ${start}::date
          AND a.appointment_date <= ${end}::date
        GROUP BY s.id, s.name
        HAVING COUNT(a.id) > 0
        ORDER BY booking_count DESC
        LIMIT 10
      `,
    );

    const topServices = topServicesRaw.map((row) => ({
      serviceName: row.service_name,
      count: Number(row.booking_count),
      revenue: Number(row.total_revenue),
    }));

    // 5. Daily stats (group by DATE_TRUNC('day', appointmentDate), count + revenue)
    const dailyStatsRaw = await this.prisma.$queryRaw<
      Array<{
        date: string;
        count: bigint;
        revenue: string;
      }>
    >(
      Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('day', a.appointment_date), 'YYYY-MM-DD') as date,
          COUNT(a.id) as count,
          COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) as revenue
        FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.appointment_date >= ${start}::date
          AND a.appointment_date <= ${end}::date
        GROUP BY DATE_TRUNC('day', a.appointment_date)
        ORDER BY date ASC
      `,
    );

    const dailyStats = dailyStatsRaw.map((row) => ({
      date: row.date,
      bookings: Number(row.count),
      revenue: Number(row.revenue),
    }));

    return {
      totalBookings,
      totalRevenue,
      cancellationRate,
      topServices,
      dailyStats,
    };
  }
}
