import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { Prisma } from "@prisma/client";

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface OverviewStats {
  totalUsers: number;
  totalServices: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
  recentAppointments: Array<{
    id: string;
    status: string;
    customerInfo: unknown;
    createdAt: Date;
    service: { name: string };
  }>;
}

export interface RevenueStats {
  totalRevenue: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  averageAppointmentValue: number;
}

export interface UserStats {
  usersByRole: Record<string, number>;
  usersByMonth: Array<{ month: string; count: number }>;
  activeUsers: number;
}

export interface PopularService {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
}

export interface DailyBooking {
  date: string;
  bookings: number;
  revenue: number;
}

export interface TimeDistribution {
  hour: number;
  count: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overall statistics dashboard overview
   */
  async getOverview(): Promise<OverviewStats> {
    const [
      totalUsers,
      totalServices,
      totalAppointments,
      appointmentsByStatusRaw,
      recentAppointments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.service.count(),
      this.prisma.appointment.count(),
      this.prisma.appointment.groupBy({
        by: ["status"],
        _count: true,
      }),
      this.prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          customerInfo: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      }),
    ]);

    // Initialize all statuses with 0
    const appointmentsByStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
      EXPIRED: 0,
    };

    // Fill in actual counts
    for (const item of appointmentsByStatusRaw) {
      appointmentsByStatus[item.status] = item._count;
    }

    return {
      totalUsers,
      totalServices,
      totalAppointments,
      appointmentsByStatus,
      recentAppointments,
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenue(): Promise<RevenueStats> {
    const completedAppointments = await this.prisma.appointment.groupBy({
      by: ["status"],
      _count: true,
      where: { status: "COMPLETED" },
    });

    const completedCount = completedAppointments[0]?._count ?? 0;

    // Get total revenue from completed appointments
    const totalRevenueResult = await this.prisma.$queryRaw<
      Array<{ total: number }>
    >(Prisma.sql`
      SELECT COALESCE(SUM(s.price), 0) as total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'COMPLETED'
    `);

    const totalRevenue = Number(totalRevenueResult[0]?.total ?? 0);

    // Get revenue by month (last 12 months)
    const revenueByMonthRaw = await this.prisma.$queryRaw<
      Array<{ month: string; revenue: number }>
    >(Prisma.sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', a.created_at), 'YYYY-MM') as month,
        COALESCE(SUM(s.price), 0) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'COMPLETED'
        AND a.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', a.created_at)
      ORDER BY month ASC
    `);

    const revenueByMonth = revenueByMonthRaw.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
    }));

    const averageAppointmentValue =
      completedCount > 0 ? totalRevenue / completedCount : 0;

    return {
      totalRevenue,
      revenueByMonth,
      averageAppointmentValue: Math.round(averageAppointmentValue * 100) / 100,
    };
  }

  /**
   * Get user growth statistics
   */
  async getUserStats(): Promise<UserStats> {
    const usersByRoleRaw = await this.prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    const usersByRole: Record<string, number> = {
      CUSTOMER: 0,
      ADMIN: 0,
      SUPER_ADMIN: 0,
    };

    for (const item of usersByRoleRaw) {
      usersByRole[item.role] = item._count as number;
    }

    // Get users by month (last 12 months)
    const usersByMonthRaw = await this.prisma.$queryRaw<
      Array<{ month: string; count: number }>
    >(Prisma.sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    const usersByMonth = usersByMonthRaw.map((row) => ({
      month: row.month,
      count: Number(row.count),
    }));

    // Get active users (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await this.prisma.user.count({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      usersByRole,
      usersByMonth,
      activeUsers,
    };
  }

  /**
   * Get top 10 most booked services
   */
  async getPopularServices(): Promise<PopularService[]> {
    const result = await this.prisma.$queryRaw<
      Array<{
        service_id: string;
        service_name: string;
        booking_count: number;
        total_revenue: string;
      }>
    >(Prisma.sql`
      SELECT 
        s.id as service_id,
        s.name as service_name,
        COUNT(a.id) as booking_count,
        COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) as total_revenue
      FROM services s
      LEFT JOIN appointments a ON s.id = a.service_id
      GROUP BY s.id, s.name
      HAVING COUNT(a.id) > 0
      ORDER BY booking_count DESC
      LIMIT 10
    `);

    return result.map((row) => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      bookingCount: row.booking_count,
      revenue: Number(row.total_revenue),
    }));
  }

  /**
   * Get daily booking trend for last 30 days
   */
  async getDailyBookings(): Promise<DailyBooking[]> {
    const result = await this.prisma.$queryRaw<
      Array<{
        date: string;
        count: number;
        revenue: string;
      }>
    >(Prisma.sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('day', a.created_at), 'YYYY-MM-DD') as date,
        COUNT(a.id) as count,
        COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) as revenue
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', a.created_at)
      ORDER BY date ASC
    `);

    return result.map((row) => ({
      date: row.date,
      bookings: row.count,
      revenue: Number(row.revenue),
    }));
  }

  /**
   * Get hourly time distribution of appointments
   */
  async getTimeDistribution(): Promise<TimeDistribution[]> {
    const result = await this.prisma.$queryRaw<
      Array<{ hour: number; count: number }>
    >(Prisma.sql`
      SELECT 
        EXTRACT(HOUR FROM a.appointment_date)::int as hour,
        COUNT(a.id)::int as count
      FROM appointments a
      WHERE a.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM a.appointment_date)
      ORDER BY hour ASC
    `);

    return result.map((row) => ({
      hour: Number(row.hour),
      count: Number(row.count),
    }));
  }
}
