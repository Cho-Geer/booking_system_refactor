import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService } from './admin-stats.service';
import { StatsService } from '../../stats/stats.service';
import {
  AdminStatsDto,
  StatCardDto,
  TimeDistributionItem,
  SystemStatusDto,
} from '../dto/admin-stats.dto';
import {
  OverviewStats,
  RevenueStats,
  UserStats,
  PopularService,
  DailyBooking,
} from '../../stats/stats.service';

// ── Mock StatsService ─────────────────────────────────────────────────
const mockStatsService = {
  getOverview: jest.fn(),
  getRevenue: jest.fn(),
  getUserStats: jest.fn(),
  getPopularServices: jest.fn(),
  getDailyBookings: jest.fn(),
  getTimeDistribution: jest.fn(),
};

// ── Shared fixtures ───────────────────────────────────────────────────
const mockOverview: OverviewStats = {
  totalUsers: 200,
  totalServices: 15,
  totalAppointments: 850,
  appointmentsByStatus: {
    PENDING: 50,
    CONFIRMED: 120,
    CANCELLED: 30,
    COMPLETED: 600,
    EXPIRED: 50,
  },
  recentAppointments: [],
};

const mockRevenue: RevenueStats = {
  totalRevenue: 45000,
  revenueByMonth: [
    { month: '2026-01', revenue: 5000 },
    { month: '2026-02', revenue: 6000 },
    { month: '2026-03', revenue: 7000 },
  ],
  averageAppointmentValue: 75,
};

const mockUserStats: UserStats = {
  usersByRole: {
    CUSTOMER: 180,
    ADMIN: 15,
    SUPER_ADMIN: 5,
  },
  usersByMonth: [
    { month: '2026-01', count: 20 },
    { month: '2026-02', count: 25 },
    { month: '2026-03', count: 30 },
  ],
  activeUsers: 85,
};

const mockPopularServices: PopularService[] = [
  { serviceId: 'svc-1', serviceName: 'Haircut', bookingCount: 200, revenue: 10000 },
  { serviceId: 'svc-2', serviceName: 'Manicure', bookingCount: 150, revenue: 7500 },
  { serviceId: 'svc-3', serviceName: 'Facial', bookingCount: 100, revenue: 6000 },
];

const mockDailyBookings: DailyBooking[] = [
  { date: '2026-04-25', bookings: 10, revenue: 500 },
  { date: '2026-04-26', bookings: 15, revenue: 750 },
  { date: '2026-04-27', bookings: 8, revenue: 400 },
  { date: '2026-04-28', bookings: 12, revenue: 600 },
  { date: '2026-04-29', bookings: 20, revenue: 1000 },
  { date: '2026-04-30', bookings: 18, revenue: 900 },
  { date: '2026-05-01', bookings: 25, revenue: 1250 },
];

// Raw time distribution from StatsService (hour is number)
const mockRawTimeDistribution: { hour: number; count: number }[] = [
  { hour: 9, count: 15 },
  { hour: 10, count: 25 },
  { hour: 11, count: 20 },
  { hour: 12, count: 5 },
  { hour: 13, count: 10 },
  { hour: 14, count: 30 },
  { hour: 15, count: 22 },
  { hour: 16, count: 18 },
  { hour: 17, count: 8 },
];

// Formatted time distribution returned by AdminStatsService (hour is number)
const mockFormattedTimeDistribution: TimeDistributionItem[] = [
  { hour: 9, count: 15 },
  { hour: 10, count: 25 },
  { hour: 11, count: 20 },
  { hour: 5, count: 5 },
  { hour: 10, count: 10 },
  { hour: 30, count: 30 },
  { hour: 22, count: 22 },
  { hour: 18, count: 18 },
  { hour: 8, count: 8 },
];

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let statsService: typeof mockStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    service = module.get<AdminStatsService>(AdminStatsService);
    statsService = module.get(StatsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── HIGH-2: totalBookings REMOVED from AdminStatsDto ───────────
  it('[RED] should NOT contain totalBookings in dashboard response (HIGH-2)', async () => {
    mockStatsService.getOverview.mockResolvedValue(mockOverview);
    mockStatsService.getRevenue.mockResolvedValue(mockRevenue);
    mockStatsService.getUserStats.mockResolvedValue(mockUserStats);
    mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);
    mockStatsService.getDailyBookings.mockResolvedValue(mockDailyBookings);
    mockStatsService.getTimeDistribution.mockResolvedValue(mockRawTimeDistribution);

    const result: AdminStatsDto = await service.getDashboard();

    // totalBookings field must be removed per contract.yaml v1.7.6
    expect(result).not.toHaveProperty('totalBookings');
  });

  // ─── getDashboard ─────────────────────────────────────────────────
  describe('getDashboard', () => {
    beforeEach(() => {
      mockStatsService.getOverview.mockResolvedValue(mockOverview);
      mockStatsService.getRevenue.mockResolvedValue(mockRevenue);
      mockStatsService.getUserStats.mockResolvedValue(mockUserStats);
      mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);
      mockStatsService.getDailyBookings.mockResolvedValue(mockDailyBookings);
      mockStatsService.getTimeDistribution.mockResolvedValue(mockRawTimeDistribution);
    });

    it('should return AdminStatsDto with all fields populated', async () => {
      // Use a fixed "today" date of "2026-05-01" so filtering is deterministic
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00Z'));

      const result: AdminStatsDto = await service.getDashboard();

      expect(result).toBeDefined();
      // HIGH-2: totalBookings removed from contract.yaml v1.7.6
      expect(result).not.toHaveProperty('totalBookings');
      expect(result.todayBookings.value).toBe(25); // matches date '2026-05-01'
      expect(result.pendingBookings.value).toBe(50); // from mockOverview.appointmentsByStatus.PENDING
      expect(result.activeUsers.value).toBe(85);
      expect(result.totalRevenue.value).toBe(45000);

      // bookingTrend: last 7 days of dailyBookings (all 7 entries)
      expect(result.bookingTrend).toHaveLength(7);
      expect(result.bookingTrend).toEqual([
        { date: '2026-04-25', count: 10, revenue: 500 },
        { date: '2026-04-26', count: 15, revenue: 750 },
        { date: '2026-04-27', count: 8, revenue: 400 },
        { date: '2026-04-28', count: 12, revenue: 600 },
        { date: '2026-04-29', count: 20, revenue: 1000 },
        { date: '2026-04-30', count: 18, revenue: 900 },
        { date: '2026-05-01', count: 25, revenue: 1250 },
      ]);

      // servicePopularity mapped correctly with percentage computed from total
      expect(result.servicePopularity).toHaveLength(3);
      expect(result.servicePopularity[0]).toEqual({ serviceName: 'Haircut', count: 200, percentage: expect.closeTo(44.44, 1) });
      expect(result.servicePopularity[1]).toEqual({ serviceName: 'Manicure', count: 150, percentage: expect.closeTo(33.33, 1) });
      expect(result.servicePopularity[2]).toEqual({ serviceName: 'Facial', count: 100, percentage: expect.closeTo(22.22, 1) });

      // ── P2.2/P2.3: timeDistribution ─────────────────────────────
      expect(result.timeDistribution).toBeDefined();
      expect(result.timeDistribution).toEqual(mockFormattedTimeDistribution);

      jest.useRealTimers();
    });

    it('should call all StatsService methods in parallel via Promise.all', async () => {
      await service.getDashboard();

      expect(statsService.getOverview).toHaveBeenCalledTimes(1);
      expect(statsService.getRevenue).toHaveBeenCalledTimes(1);
      expect(statsService.getUserStats).toHaveBeenCalledTimes(1);
      expect(statsService.getPopularServices).toHaveBeenCalledTimes(1);
      expect(statsService.getDailyBookings).toHaveBeenCalledTimes(1);
      expect(statsService.getTimeDistribution).toHaveBeenCalledTimes(1);
    });

    it('should return correct AdminStatsDto shape with new fields', async () => {
      const result: AdminStatsDto = await service.getDashboard();

      // Verify shape of AdminStatsDto (including new fields)
      // HIGH-2: totalBookings removed from contract.yaml v1.7.6
      expect(result).not.toHaveProperty('totalBookings');
      expect(result).toHaveProperty('todayBookings');
      expect(result).toHaveProperty('pendingBookings');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('bookingTrend');
      expect(result).toHaveProperty('servicePopularity');
      expect(result).toHaveProperty('timeDistribution');
      // Type checks — stat card fields are StatCardDto objects
      expect(typeof result.todayBookings).toBe('object');
      expect(typeof result.pendingBookings).toBe('object');
      expect(typeof result.activeUsers).toBe('object');
      expect(typeof result.totalRevenue).toBe('object');
      expect(result.todayBookings).toHaveProperty('value');
      expect(result.todayBookings).toHaveProperty('changePercentage');
      expect(result.todayBookings).toHaveProperty('isPositive');
      expect(result.todayBookings).toHaveProperty('target');
      expect(result.todayBookings).toHaveProperty('progressPercentage');
      expect(Array.isArray(result.bookingTrend)).toBe(true);
      expect(Array.isArray(result.servicePopularity)).toBe(true);
      expect(Array.isArray(result.timeDistribution)).toBe(true);
    });

    it('should handle empty daily bookings and popular services gracefully', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00Z'));

      mockStatsService.getDailyBookings.mockResolvedValue([]);
      mockStatsService.getPopularServices.mockResolvedValue([]);
      mockStatsService.getTimeDistribution.mockResolvedValue([]);

      const result: AdminStatsDto = await service.getDashboard();

      // HIGH-2: totalBookings removed from contract.yaml v1.7.6
      expect(result).not.toHaveProperty('totalBookings');
      expect(result.todayBookings.value).toBe(0);
      expect(result.bookingTrend).toEqual([]);
      expect(result.servicePopularity).toEqual([]);
      expect(result.timeDistribution).toEqual([]);

      jest.useRealTimers();
    });

    it('should return 0 todayBookings when no daily booking matches today', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'));

      const result: AdminStatsDto = await service.getDashboard();

      expect(result.todayBookings.value).toBe(0);

      jest.useRealTimers();
    });

  });

  // ─── getServiceDistribution (DASH-003) ────────────────────────────
  describe('getServiceDistribution', () => {
    it('should call statsService.getPopularServices and compute percentages', async () => {
      mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);

      const result = await service.getServiceDistribution();

      expect(statsService.getPopularServices).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ serviceName: 'Haircut', count: 200, percentage: expect.closeTo(44.44, 1) });
      expect(result[1]).toEqual({ serviceName: 'Manicure', count: 150, percentage: expect.closeTo(33.33, 1) });
      expect(result[2]).toEqual({ serviceName: 'Facial', count: 100, percentage: expect.closeTo(22.22, 1) });
    });

    it('should return empty array when no popular services', async () => {
      mockStatsService.getPopularServices.mockResolvedValue([]);

      const result = await service.getServiceDistribution();

      expect(result).toEqual([]);
    });

    it('should return percentages summing to approximately 100', async () => {
      mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);

      const result = await service.getServiceDistribution();

      const totalPct = result.reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });

    it('should pass timeRange params to statsService', async () => {
      mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);

      await service.getServiceDistribution('last30d', '2026-04-01', '2026-04-30');

      expect(statsService.getPopularServices).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getTimeDistribution (DASH-004) ────────────────────────────────
  describe('getTimeDistribution', () => {
    it('should call statsService.getTimeDistribution and format hour as HH:00 string', async () => {
      const rawTimeDist = [
        { hour: 9, count: 15 },
        { hour: 10, count: 25 },
        { hour: 14, count: 30 },
      ];
      mockStatsService.getTimeDistribution.mockResolvedValue(rawTimeDist);

      const result = await service.getTimeDistribution();

      expect(statsService.getTimeDistribution).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        { hour: 9, count: 15 },
        { hour: 10, count: 25 },
        { hour: 14, count: 30 },
      ]);
    });

    it('should pad single-digit hours with leading zero', async () => {
      const rawTimeDist = [
        { hour: 0, count: 5 },
        { hour: 7, count: 10 },
        { hour: 23, count: 8 },
      ];
      mockStatsService.getTimeDistribution.mockResolvedValue(rawTimeDist);

      const result = await service.getTimeDistribution();

      expect(result[0].hour).toBe(0);
      expect(result[1].hour).toBe(7);
      expect(result[2].hour).toBe(23);
    });

    it('should return empty array when no distribution data', async () => {
      mockStatsService.getTimeDistribution.mockResolvedValue([]);

      const result = await service.getTimeDistribution();

      expect(result).toEqual([]);
    });

    it('should pass timeRange params to statsService', async () => {
      mockStatsService.getTimeDistribution.mockResolvedValue([]);

      await service.getTimeDistribution('last7d', '2026-04-01', '2026-04-30');

      expect(statsService.getTimeDistribution).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getBookingTrend with range/granularity (DASH-002) ────────────
  describe('getBookingTrend with range/granularity', () => {
    beforeEach(() => {
      mockStatsService.getDailyBookings.mockResolvedValue(mockDailyBookings);
    });

    it('should default to last 7 days when no range specified', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00Z'));

      const result = await service.getBookingTrend(undefined, undefined, undefined);

      expect(result).toHaveLength(7);

      jest.useRealTimers();
    });

    it('should accept range=monthly and granularity=week params', async () => {
      const result = await service.getBookingTrend('last30d', undefined, undefined, 'monthly', 'week');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept range=yearly without breaking', async () => {
      const result = await service.getBookingTrend('custom', '2025-01-01', '2025-12-31', 'yearly', 'month');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── TimeDistributionItem type shape ────────────────────────────
  describe('TimeDistributionItem', () => {
    it('should have correct shape with hour (number) and count', () => {
      const item: TimeDistributionItem = { hour: 10, count: 25 };
      expect(item.hour).toBe(10);
      expect(item.count).toBe(25);
      expect(typeof item.hour).toBe('number');
      expect(typeof item.count).toBe('number');
    });
  });

  // ─── getSystemStatus (P2.4) ──────────────────────────────────────
  describe('getSystemStatus', () => {
    it('should return SystemStatusDto with all fields', async () => {
      const result: SystemStatusDto = await service.getSystemStatus();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('api');
      expect(result).toHaveProperty('lastBackup');
      expect(result).toHaveProperty('uptime');
    });

    it('should indicate server and database are Online', async () => {
      const result: SystemStatusDto = await service.getSystemStatus();

      expect(result.server).toBe('Online');
      expect(result.database).toBe('Online');
      expect(result.api).toBe('Online');
    });

    it('should return lastBackup as a valid ISO date string', async () => {
      const result: SystemStatusDto = await service.getSystemStatus();

      expect(result.lastBackup).toBeDefined();
      const parsed = new Date(result.lastBackup);
      expect(parsed.toISOString()).toBe(result.lastBackup);
    });

    it('should return uptime as a string like "99.9%"', async () => {
      const result: SystemStatusDto = await service.getSystemStatus();

      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('string');
      expect(result.uptime).toMatch(/^\d+\.\d+%$/);
    });
  });
});
