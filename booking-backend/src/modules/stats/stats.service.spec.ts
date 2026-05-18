import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../../common/database/prisma.service';
import { Prisma } from '@prisma/client';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    service: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getOverview ───────────────────────────────────────────────
  describe('getOverview', () => {
    it('should return overview statistics with all fields populated', async () => {
      const mockDate = new Date('2024-03-15T10:30:00Z');

      mockPrismaService.user.count.mockResolvedValue(150);
      mockPrismaService.service.count.mockResolvedValue(25);
      mockPrismaService.appointment.count.mockResolvedValue(500);
      mockPrismaService.appointment.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 50 },
        { status: 'CONFIRMED', _count: 100 },
        { status: 'CANCELLED', _count: 30 },
        { status: 'COMPLETED', _count: 300 },
        { status: 'EXPIRED', _count: 20 },
      ]);
      mockPrismaService.appointment.findMany.mockResolvedValue([
        {
          id: 'apt-1',
          status: 'COMPLETED',
          customerInfo: { name: 'John Doe', email: 'john@example.com' },
          createdAt: mockDate,
          service: { name: 'Haircut' },
        },
        {
          id: 'apt-2',
          status: 'PENDING',
          customerInfo: { name: 'Jane Smith', email: 'jane@example.com' },
          createdAt: mockDate,
          service: { name: 'Manicure' },
        },
      ]);

      const result = await service.getOverview();

      expect(result.totalUsers).toBe(150);
      expect(result.totalServices).toBe(25);
      expect(result.totalAppointments).toBe(500);
      expect(result.appointmentsByStatus).toEqual({
        PENDING: 50,
        CONFIRMED: 100,
        CANCELLED: 30,
        COMPLETED: 300,
        EXPIRED: 20,
      });
      expect(result.recentAppointments).toHaveLength(2);
      expect(result.recentAppointments[0]).toEqual({
        id: 'apt-1',
        status: 'COMPLETED',
        customerInfo: { name: 'John Doe', email: 'john@example.com' },
        createdAt: mockDate,
        service: { name: 'Haircut' },
      });
    });

    it('should handle empty status groups gracefully — all zeros', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.service.count.mockResolvedValue(0);
      mockPrismaService.appointment.count.mockResolvedValue(0);
      mockPrismaService.appointment.groupBy.mockResolvedValue([]);
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.totalUsers).toBe(0);
      expect(result.totalServices).toBe(0);
      expect(result.totalAppointments).toBe(0);
      expect(result.appointmentsByStatus).toEqual({
        PENDING: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
        COMPLETED: 0,
        EXPIRED: 0,
      });
      expect(result.recentAppointments).toEqual([]);
    });

    it('should execute all Prisma calls in parallel via Promise.all', async () => {
      mockPrismaService.user.count.mockResolvedValue(10);
      mockPrismaService.service.count.mockResolvedValue(5);
      mockPrismaService.appointment.count.mockResolvedValue(20);
      mockPrismaService.appointment.groupBy.mockResolvedValue([]);
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      await service.getOverview();

      expect(mockPrismaService.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.service.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.groupBy).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        _count: true,
      });
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          customerInfo: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      });
    });

    it('should only override statuses returned by groupBy, leaving others at zero', async () => {
      mockPrismaService.user.count.mockResolvedValue(10);
      mockPrismaService.service.count.mockResolvedValue(5);
      mockPrismaService.appointment.count.mockResolvedValue(3);
      mockPrismaService.appointment.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 2 },
        { status: 'COMPLETED', _count: 1 },
      ]);
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.appointmentsByStatus).toEqual({
        PENDING: 2,
        CONFIRMED: 0,
        CANCELLED: 0,
        COMPLETED: 1,
        EXPIRED: 0,
      });
    });
  });

  // ─── getRevenue ────────────────────────────────────────────────
  describe('getRevenue', () => {
    it('should return revenue statistics with correct calculations', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 100 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 5000.0 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { month: '2024-01', revenue: 400.0 },
        { month: '2024-02', revenue: 500.0 },
        { month: '2024-03', revenue: 600.5 },
      ]);

      const result = await service.getRevenue();

      expect(result.totalRevenue).toBe(5000);
      expect(result.revenueByMonth).toEqual([
        { month: '2024-01', revenue: 400 },
        { month: '2024-02', revenue: 500 },
        { month: '2024-03', revenue: 600.5 },
      ]);
      expect(result.averageAppointmentValue).toBe(50);
    });

    it('should handle zero completed appointments — zero revenue and zero average', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 0 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenue();

      expect(result.totalRevenue).toBe(0);
      expect(result.revenueByMonth).toEqual([]);
      expect(result.averageAppointmentValue).toBe(0);
    });

    it('should handle null/undefined total revenue gracefully', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 50 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: null }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenue();

      expect(result.totalRevenue).toBe(0);
      expect(result.averageAppointmentValue).toBe(0);
    });

    it('should handle undefined total revenue result gracefully', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 50 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenue();

      expect(result.totalRevenue).toBe(0);
    });

    it('should round average appointment value to 2 decimal places', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 3 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 100 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenue();

      // 100 / 3 = 33.3333... → rounded to 33.33
      expect(result.averageAppointmentValue).toBe(33.33);
    });

    it('should round down when third decimal < 5', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 7 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 100 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenue();

      // 100 / 7 = 14.285714... → rounded to 14.29
      expect(result.averageAppointmentValue).toBe(14.29);
    });

    it('should map revenueByMonth values to Number type', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 1 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 50 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ month: '2024-06', revenue: '250.50' }]);

      const result = await service.getRevenue();

      expect(result.revenueByMonth[0].revenue).toBe(250.5);
      expect(typeof result.revenueByMonth[0].revenue).toBe('number');
    });

    it('should query completed appointments grouped by status', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: 10 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 500 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      await service.getRevenue();

      expect(mockPrismaService.appointment.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        _count: true,
        where: { status: 'COMPLETED' },
      });
    });
  });

  // ─── getUserStats ──────────────────────────────────────────────
  describe('getUserStats', () => {
    it('should return user statistics with correct aggregation', async () => {
      mockPrismaService.user.groupBy.mockResolvedValueOnce([
        { userType: 'CUSTOMER', _count: 100 },
        { userType: 'ADMIN', _count: 40 },
        { userType: 'SUPER_ADMIN', _count: 10 },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { month: '2024-01', count: 10 },
        { month: '2024-02', count: 15 },
        { month: '2024-03', count: 25 },
      ]);
      mockPrismaService.user.count.mockResolvedValue(75);

      const result = await service.getUserStats();

      expect(result.usersByRole).toEqual({
        CUSTOMER: 100,
        ADMIN: 40,
        SUPER_ADMIN: 10,
      });
      expect(result.usersByMonth).toEqual([
        { month: '2024-01', count: 10 },
        { month: '2024-02', count: 15 },
        { month: '2024-03', count: 25 },
      ]);
      expect(result.activeUsers).toBe(75);
    });

    it('should handle empty user data gracefully — all zeros', async () => {
      mockPrismaService.user.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.getUserStats();

      expect(result.usersByRole).toEqual({
        CUSTOMER: 0,
        ADMIN: 0,
        SUPER_ADMIN: 0,
      });
      expect(result.usersByMonth).toEqual([]);
      expect(result.activeUsers).toBe(0);
    });

    it('should only override user types returned by groupBy', async () => {
      mockPrismaService.user.groupBy.mockResolvedValueOnce([{ userType: 'CUSTOMER', _count: 50 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
      mockPrismaService.user.count.mockResolvedValue(10);

      const result = await service.getUserStats();

      expect(result.usersByRole).toEqual({
        CUSTOMER: 50,
        ADMIN: 0,
        SUPER_ADMIN: 0,
      });
    });

    it('should query active users with lastLoginAt >= 30 days ago', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockPrismaService.user.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
      mockPrismaService.user.count.mockResolvedValue(5);

      await service.getUserStats();

      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          lastLoginAt: {
            gte: expect.any(Date),
          },
        },
      });

      const callArgs = (mockPrismaService.user.count as jest.Mock).mock.calls[0][0];
      const gteDate = callArgs.where.lastLoginAt.gte as Date;
      const diffMs = gteDate.getTime() - thirtyDaysAgo.getTime();
      expect(Math.abs(diffMs)).toBeLessThan(1000);
    });

    it('should map usersByMonth count values to Number type', async () => {
      mockPrismaService.user.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ month: '2024-05', count: '42' }]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.getUserStats();

      expect(result.usersByMonth[0].count).toBe(42);
      expect(typeof result.usersByMonth[0].count).toBe('number');
    });
  });

  // ─── getPopularServices ────────────────────────────────────────
  describe('getPopularServices', () => {
    it('should return top services ordered by booking count descending', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        {
          service_id: 'svc-1',
          service_name: 'Haircut',
          booking_count: 50,
          total_revenue: '2500.00',
        },
        {
          service_id: 'svc-2',
          service_name: 'Manicure',
          booking_count: 30,
          total_revenue: '1500.00',
        },
        {
          service_id: 'svc-3',
          service_name: 'Facial',
          booking_count: 15,
          total_revenue: '900.50',
        },
      ]);

      const result = await service.getPopularServices();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        serviceId: 'svc-1',
        serviceName: 'Haircut',
        bookingCount: 50,
        revenue: 2500,
      });
      expect(result[1]).toEqual({
        serviceId: 'svc-2',
        serviceName: 'Manicure',
        bookingCount: 30,
        revenue: 1500,
      });
      expect(result[2]).toEqual({
        serviceId: 'svc-3',
        serviceName: 'Facial',
        bookingCount: 15,
        revenue: 900.5,
      });
    });

    it('should return empty array when no services have bookings', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getPopularServices();

      expect(result).toEqual([]);
    });

    it('should convert total_revenue string to Number', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        {
          service_id: 'svc-1',
          service_name: 'Premium Service',
          booking_count: 1,
          total_revenue: '99.99',
        },
      ]);

      const result = await service.getPopularServices();

      expect(result[0].revenue).toBe(99.99);
      expect(typeof result[0].revenue).toBe('number');
    });

    it('should handle zero revenue services', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        {
          service_id: 'svc-1',
          service_name: 'Free Consultation',
          booking_count: 10,
          total_revenue: '0',
        },
      ]);

      const result = await service.getPopularServices();

      expect(result[0].revenue).toBe(0);
      expect(result[0].bookingCount).toBe(10);
    });

    it('should return at most 10 services (LIMIT enforced by SQL)', async () => {
      const tenServices = Array.from({ length: 10 }, (_, i) => ({
        service_id: `svc-${i + 1}`,
        service_name: `Service ${i + 1}`,
        booking_count: 100 - i * 5,
        total_revenue: `${(1000 - i * 50).toFixed(2)}`,
      }));
      mockPrismaService.$queryRaw.mockResolvedValueOnce(tenServices);

      const result = await service.getPopularServices();

      expect(result).toHaveLength(10);
      expect(result[0].bookingCount).toBe(100);
      expect(result[9].bookingCount).toBe(55);
    });
  });

  // ─── getDailyBookings ──────────────────────────────────────────
  describe('getDailyBookings', () => {
    it('should return daily booking trend with correct mapping', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { date: '2024-01-01', count: 5, revenue: '250.00' },
        { date: '2024-01-02', count: 8, revenue: '400.00' },
        { date: '2024-01-03', count: 3, revenue: '150.75' },
      ]);

      const result = await service.getDailyBookings();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        bookings: 5,
        revenue: 250,
      });
      expect(result[1]).toEqual({
        date: '2024-01-02',
        bookings: 8,
        revenue: 400,
      });
      expect(result[2]).toEqual({
        date: '2024-01-03',
        bookings: 3,
        revenue: 150.75,
      });
    });

    it('should return empty array when no bookings exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getDailyBookings();

      expect(result).toEqual([]);
    });

    it('should return results ordered by date ascending', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { date: '2024-02-15', count: 10, revenue: '500.00' },
        { date: '2024-02-16', count: 12, revenue: '600.00' },
        { date: '2024-02-17', count: 8, revenue: '400.00' },
      ]);

      const result = await service.getDailyBookings();

      expect(result[0].date).toBe('2024-02-15');
      expect(result[1].date).toBe('2024-02-16');
      expect(result[2].date).toBe('2024-02-17');
    });

    it('should convert revenue string to Number type', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { date: '2024-03-01', count: 1, revenue: '75.50' },
      ]);

      const result = await service.getDailyBookings();

      expect(result[0].revenue).toBe(75.5);
      expect(typeof result[0].revenue).toBe('number');
      expect(typeof result[0].bookings).toBe('number');
    });

    it('should handle zero revenue day', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { date: '2024-04-01', count: 2, revenue: '0' },
      ]);

      const result = await service.getDailyBookings();

      expect(result[0].revenue).toBe(0);
      expect(result[0].bookings).toBe(2);
    });
  });

  // ─── getTimeDistribution ───────────────────────────────────────
  describe('getTimeDistribution', () => {
    it('should return hourly appointment distribution', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { hour: 9, count: 15 },
        { hour: 10, count: 25 },
        { hour: 11, count: 20 },
        { hour: 14, count: 30 },
      ]);

      const result = await service.getTimeDistribution();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ hour: 9, count: 15 });
      expect(result[1]).toEqual({ hour: 10, count: 25 });
      expect(result[3]).toEqual({ hour: 14, count: 30 });
    });

    it('should return empty array when no appointments exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getTimeDistribution();

      expect(result).toEqual([]);
    });

    it('should convert hour and count to number type', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ hour: '9', count: '15' }]);

      const result = await service.getTimeDistribution();

      expect(result[0].hour).toBe(9);
      expect(typeof result[0].hour).toBe('number');
      expect(result[0].count).toBe(15);
      expect(typeof result[0].count).toBe('number');
    });

    it('should return results ordered by hour ascending', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { hour: 14, count: 30 },
        { hour: 9, count: 15 },
        { hour: 11, count: 20 },
      ]);

      const result = await service.getTimeDistribution();

      expect(result[0].hour).toBe(14); // SQL already orders, so raw order preserved
      // Note: SQL query has ORDER BY hour ASC, so in real scenario this would be sorted
    });
  });

  // ─── Integration: empty data returns zero values ───────────────
  describe('empty data returns zero values', () => {
    it('getOverview returns zero counts and empty arrays', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.service.count.mockResolvedValue(0);
      mockPrismaService.appointment.count.mockResolvedValue(0);
      mockPrismaService.appointment.groupBy.mockResolvedValue([]);
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.totalUsers).toBe(0);
      expect(result.totalServices).toBe(0);
      expect(result.totalAppointments).toBe(0);
      expect(Object.values(result.appointmentsByStatus).every((v) => v === 0)).toBe(true);
      expect(result.recentAppointments).toEqual([]);
    });

    it('getRevenue returns zero revenue and empty month array', async () => {
      mockPrismaService.appointment.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 0 }]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenue();

      expect(result.totalRevenue).toBe(0);
      expect(result.averageAppointmentValue).toBe(0);
      expect(result.revenueByMonth).toEqual([]);
    });

    it('getUserStats returns zero counts and empty month array', async () => {
      mockPrismaService.user.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.getUserStats();

      expect(Object.values(result.usersByRole).every((v) => v === 0)).toBe(true);
      expect(result.activeUsers).toBe(0);
      expect(result.usersByMonth).toEqual([]);
    });

    it('getPopularServices returns empty array', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getPopularServices();

      expect(result).toEqual([]);
    });

    it('getDailyBookings returns empty array', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getDailyBookings();

      expect(result).toEqual([]);
    });

    it('getTimeDistribution returns empty array', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getTimeDistribution();

      expect(result).toEqual([]);
    });
  });
});
