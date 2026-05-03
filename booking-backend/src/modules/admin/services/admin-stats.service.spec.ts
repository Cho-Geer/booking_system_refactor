import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService } from './admin-stats.service';
import { StatsService } from '../../stats/stats.service';
import { AdminStatsDto } from '../dto/admin-stats.dto';
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
  usersByUserType: {
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

  // ─── getDashboard ─────────────────────────────────────────────────
  describe('getDashboard', () => {
    beforeEach(() => {
      mockStatsService.getOverview.mockResolvedValue(mockOverview);
      mockStatsService.getRevenue.mockResolvedValue(mockRevenue);
      mockStatsService.getUserStats.mockResolvedValue(mockUserStats);
      mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);
      mockStatsService.getDailyBookings.mockResolvedValue(mockDailyBookings);
    });

    it('should return AdminStatsDto with all fields populated', async () => {
      // Use a fixed "today" date of "2026-05-01" so filtering is deterministic
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00Z'));

      const result: AdminStatsDto = await service.getDashboard();

      expect(result).toBeDefined();
      expect(result.totalBookings).toBe(850);
      expect(result.todayBookings).toBe(25); // matches date '2026-05-01'
      expect(result.activeUsers).toBe(85);
      expect(result.totalRevenue).toBe(45000);

      // bookingTrend: last 7 days of dailyBookings (all 7 entries)
      expect(result.bookingTrend).toHaveLength(7);
      expect(result.bookingTrend).toEqual([
        { date: '2026-04-25', count: 10 },
        { date: '2026-04-26', count: 15 },
        { date: '2026-04-27', count: 8 },
        { date: '2026-04-28', count: 12 },
        { date: '2026-04-29', count: 20 },
        { date: '2026-04-30', count: 18 },
        { date: '2026-05-01', count: 25 },
      ]);

      // servicePopularity mapped correctly
      expect(result.servicePopularity).toHaveLength(3);
      expect(result.servicePopularity).toEqual([
        { serviceName: 'Haircut', count: 200 },
        { serviceName: 'Manicure', count: 150 },
        { serviceName: 'Facial', count: 100 },
      ]);

      jest.useRealTimers();
    });

    it('should call all five StatsService methods in parallel via Promise.all', async () => {
      await service.getDashboard();

      expect(statsService.getOverview).toHaveBeenCalledTimes(1);
      expect(statsService.getRevenue).toHaveBeenCalledTimes(1);
      expect(statsService.getUserStats).toHaveBeenCalledTimes(1);
      expect(statsService.getPopularServices).toHaveBeenCalledTimes(1);
      expect(statsService.getDailyBookings).toHaveBeenCalledTimes(1);
    });

    it('should return correct AdminStatsDto shape', async () => {
      const result: AdminStatsDto = await service.getDashboard();

      // Verify shape of AdminStatsDto
      expect(result).toHaveProperty('totalBookings');
      expect(result).toHaveProperty('todayBookings');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('bookingTrend');
      expect(result).toHaveProperty('servicePopularity');

      // Type checks
      expect(typeof result.totalBookings).toBe('number');
      expect(typeof result.todayBookings).toBe('number');
      expect(typeof result.activeUsers).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(Array.isArray(result.bookingTrend)).toBe(true);
      expect(Array.isArray(result.servicePopularity)).toBe(true);
    });

    it('should handle empty daily bookings and popular services gracefully', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T12:00:00Z'));

      mockStatsService.getDailyBookings.mockResolvedValue([]);
      mockStatsService.getPopularServices.mockResolvedValue([]);

      const result: AdminStatsDto = await service.getDashboard();

      expect(result.todayBookings).toBe(0);
      expect(result.bookingTrend).toEqual([]);
      expect(result.servicePopularity).toEqual([]);

      jest.useRealTimers();
    });

    it('should return 0 todayBookings when no daily booking matches today', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'));

      const result: AdminStatsDto = await service.getDashboard();

      expect(result.todayBookings).toBe(0);

      jest.useRealTimers();
    });
  });
});
