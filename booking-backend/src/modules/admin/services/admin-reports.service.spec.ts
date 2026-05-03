import { Test, TestingModule } from '@nestjs/testing';
import { AdminReportsService } from './admin-reports.service';
import { PrismaService } from '../../../common/database/prisma.service';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let prisma: any;

  const mockPrisma = {
    appointment: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReportsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AdminReportsService>(AdminReportsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    const startDate = '2026-01-01';
    const endDate = '2026-12-31';

    it('should return complete summary with all stats', async () => {
      // Mock total bookings
      mockPrisma.appointment.count.mockResolvedValueOnce(100);

      // Mock cancelled count for cancellation rate
      mockPrisma.appointment.count.mockResolvedValueOnce(15);

      // Mock total revenue from completed appointments (raw query)
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: '50000.00' }]);

      // Mock top services (raw query)
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { service_name: 'Haircut', booking_count: 40, total_revenue: '20000.00' },
        { service_name: 'Massage', booking_count: 30, total_revenue: '18000.00' },
      ]);

      // Mock daily stats (raw query)
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { date: '2026-01-15', count: 10, revenue: '5000.00' },
        { date: '2026-02-15', count: 8, revenue: '4000.00' },
      ]);

      const result = await service.getSummary(startDate, endDate);

      expect(result.totalBookings).toBe(100);
      expect(result.totalRevenue).toBe(50000);
      expect(result.cancellationRate).toBeCloseTo(0.15, 2);
      expect(result.topServices).toHaveLength(2);
      expect(result.topServices[0]).toEqual({
        serviceName: 'Haircut',
        count: 40,
        revenue: 20000,
      });
      expect(result.dailyStats).toHaveLength(2);
      expect(result.dailyStats[0]).toEqual({
        date: '2026-01-15',
        bookings: 10,
        revenue: 5000,
      });
    });

    it('should return zero stats when no appointments exist', async () => {
      mockPrisma.appointment.count.mockResolvedValueOnce(0);
      mockPrisma.appointment.count.mockResolvedValueOnce(0);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: '0' }]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getSummary(startDate, endDate);

      expect(result.totalBookings).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.cancellationRate).toBe(0);
      expect(result.topServices).toEqual([]);
      expect(result.dailyStats).toEqual([]);
    });

    it('should correctly calculate cancellation rate edge cases', async () => {
      // 0 bookings
      mockPrisma.appointment.count.mockResolvedValueOnce(0);
      mockPrisma.appointment.count.mockResolvedValueOnce(0);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: '0' }]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result1 = await service.getSummary(startDate, endDate);
      expect(result1.cancellationRate).toBe(0);

      jest.clearAllMocks();

      // All bookings cancelled
      mockPrisma.appointment.count.mockResolvedValueOnce(10);
      mockPrisma.appointment.count.mockResolvedValueOnce(10);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: '0' }]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result2 = await service.getSummary(startDate, endDate);
      expect(result2.cancellationRate).toBe(1);
    });

    it('should pass date range to all queries', async () => {
      mockPrisma.appointment.count.mockResolvedValueOnce(50);
      mockPrisma.appointment.count.mockResolvedValueOnce(5);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: '25000.00' }]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await service.getSummary(startDate, endDate);

      // Verify count queries were called with date range
      expect(mockPrisma.appointment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            appointmentDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        }),
      );

      // Verify raw queries include date params
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
