import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from '../services/admin-stats.service';
import {
  AdminStatsDto,
  StatCardDto,
  TimeDistributionItem,
  StaffWorkloadItem,
  SystemStatusDto,
} from '../dto/admin-stats.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

// ── Mock AdminStatsService ────────────────────────────────────────────
const mockAdminStatsService = {
  getDashboard: jest.fn(),
  getBookingTrend: jest.fn(),
  getServiceDistribution: jest.fn(),
  getTimeDistribution: jest.fn(),
  getSystemStatus: jest.fn(),
};

// ── Mock Guards ───────────────────────────────────────────────────────
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockRolesGuard = { canActivate: jest.fn(() => true) };

// ── Shared fixtures ───────────────────────────────────────────────────
const mockTimeDistribution: TimeDistributionItem[] = [
  { hour: '09:00', count: 15 },
  { hour: '10:00', count: 25 },
  { hour: '11:00', count: 20 },
  { hour: '12:00', count: 5 },
  { hour: '13:00', count: 10 },
  { hour: '14:00', count: 30 },
  { hour: '15:00', count: 22 },
  { hour: '16:00', count: 18 },
  { hour: '17:00', count: 8 },
];

const mockStaffWorkload: StaffWorkloadItem[] = [
  { serviceName: 'Haircut', workloadPercentage: 44.44, appointmentCount: 200 },
  { serviceName: 'Manicure', workloadPercentage: 33.33, appointmentCount: 150 },
  { serviceName: 'Facial', workloadPercentage: 22.22, appointmentCount: 100 },
];

describe('AdminStatsController', () => {
  let controller: AdminStatsController;
  let adminStatsService: typeof mockAdminStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatsController],
      providers: [
        {
          provide: AdminStatsService,
          useValue: mockAdminStatsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AdminStatsController>(AdminStatsController);
    adminStatsService = module.get(AdminStatsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── getStats ─────────────────────────────────────────────────────
  describe('getStats', () => {
    const sc = (value: number, change: number = 0, positive: boolean = true, target: number = 1000, progressPct: number = 0): StatCardDto => ({
      value, changePercentage: change, isPositive: positive, target, progressPercentage: progressPct,
    });

    const mockDashboard: AdminStatsDto = {
      totalBookings: sc(850, 12, true, 1000, 85),
      todayBookings: sc(25, 25, true, 50, 50),
      pendingBookings: sc(5, 0, true, 50, 10),
      activeUsers: sc(85, -5, false, 1500, 6),
      totalRevenue: sc(45000, 15, true, 10000, 100),
      bookingTrend: [
        { date: '2026-04-25', count: 10, revenue: 500 },
        { date: '2026-04-26', count: 15, revenue: 750 },
        { date: '2026-04-27', count: 8, revenue: 400 },
        { date: '2026-04-28', count: 12, revenue: 600 },
        { date: '2026-04-29', count: 20, revenue: 1000 },
        { date: '2026-04-30', count: 18, revenue: 900 },
        { date: '2026-05-01', count: 25, revenue: 1250 },
      ],
      servicePopularity: [
        { serviceName: 'Haircut', count: 200, percentage: 44.44 },
        { serviceName: 'Manicure', count: 150, percentage: 33.33 },
        { serviceName: 'Facial', count: 100, percentage: 22.22 },
      ],
      timeDistribution: mockTimeDistribution,
      staffWorkload: mockStaffWorkload,
    };

    it('should call adminStatsService.getDashboard and return AdminStatsDto', async () => {
      mockAdminStatsService.getDashboard.mockResolvedValue(mockDashboard);

      const result: AdminStatsDto = await controller.getStats();

      expect(adminStatsService.getDashboard).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDashboard);
    });

    it('should return correct AdminStatsDto shape with new fields', async () => {
      mockAdminStatsService.getDashboard.mockResolvedValue(mockDashboard);

      const result: AdminStatsDto = await controller.getStats();

      expect(result).toHaveProperty('totalBookings');
      expect(result).toHaveProperty('todayBookings');
      expect(result).toHaveProperty('pendingBookings');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('bookingTrend');
      expect(result).toHaveProperty('servicePopularity');
      expect(result).toHaveProperty('timeDistribution');
      expect(result).toHaveProperty('staffWorkload');

      expect(typeof result.totalBookings).toBe('object');
      expect(typeof result.todayBookings).toBe('object');
      expect(typeof result.pendingBookings).toBe('object');
      expect(typeof result.activeUsers).toBe('object');
      expect(typeof result.totalRevenue).toBe('object');
      expect(Array.isArray(result.bookingTrend)).toBe(true);
      expect(Array.isArray(result.servicePopularity)).toBe(true);
      expect(Array.isArray(result.timeDistribution)).toBe(true);
      expect(Array.isArray(result.staffWorkload)).toBe(true);
    });

    it('should handle empty dashboard data gracefully', async () => {
      const empty = (): StatCardDto => ({ value: 0, changePercentage: 0, isPositive: true, target: 0, progressPercentage: 0 });
      const emptyDashboard: AdminStatsDto = {
        totalBookings: empty(),
        todayBookings: empty(),
        pendingBookings: empty(),
        activeUsers: empty(),
        totalRevenue: empty(),
        bookingTrend: [],
        servicePopularity: [],
        timeDistribution: [],
        staffWorkload: [],
      };

      mockAdminStatsService.getDashboard.mockResolvedValue(emptyDashboard);

      const result: AdminStatsDto = await controller.getStats();

      expect(result.totalBookings.value).toBe(0);
      expect(result.todayBookings.value).toBe(0);
      expect(result.activeUsers.value).toBe(0);
      expect(result.totalRevenue.value).toBe(0);
      expect(result.bookingTrend).toEqual([]);
      expect(result.servicePopularity).toEqual([]);
      expect(result.timeDistribution).toEqual([]);
      expect(result.staffWorkload).toEqual([]);
    });

    it('should be protected by JwtAuthGuard', () => {
      expect(AdminStatsController).toBeDefined();
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStatsController.prototype.getStats);
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });

  // ─── getBookingTrend (DASH-002) ────────────────────────────────────
  describe('getBookingTrend', () => {
    const mockTrendData = [
      { date: '2026-04-25', count: 10, revenue: 500 },
      { date: '2026-04-26', count: 15, revenue: 750 },
    ];

    it('should call adminStatsService.getBookingTrend with timeRange params', async () => {
      mockAdminStatsService.getBookingTrend.mockResolvedValue(mockTrendData);

      const result = await controller.getBookingTrend('last7d', undefined, undefined);

      expect(adminStatsService.getBookingTrend).toHaveBeenCalledWith('last7d', undefined, undefined, undefined, undefined);
      expect(result).toEqual(mockTrendData);
    });

    it('should call adminStatsService.getBookingTrend with custom date range', async () => {
      mockAdminStatsService.getBookingTrend.mockResolvedValue(mockTrendData);

      const result = await controller.getBookingTrend('custom', '2026-04-01', '2026-04-30');

      expect(adminStatsService.getBookingTrend).toHaveBeenCalledWith('custom', '2026-04-01', '2026-04-30', undefined, undefined);
      expect(result).toEqual(mockTrendData);
    });

    it('should pass range and granularity params correctly', async () => {
      mockAdminStatsService.getBookingTrend.mockResolvedValue(mockTrendData);

      const result = await controller.getBookingTrend('last30d', undefined, undefined, 'monthly', 'week');

      expect(adminStatsService.getBookingTrend).toHaveBeenCalledWith('last30d', undefined, undefined, 'monthly', 'week');
      expect(result).toEqual(mockTrendData);
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStatsController.prototype.getBookingTrend);
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });

  // ─── getServiceDistribution (DASH-003) ─────────────────────────────
  describe('getServiceDistribution', () => {
    const mockServiceDist = [
      { serviceName: 'Haircut', count: 200, percentage: 44.44 },
      { serviceName: 'Manicure', count: 150, percentage: 33.33 },
      { serviceName: 'Facial', count: 100, percentage: 22.22 },
    ];

    it('should call adminStatsService.getServiceDistribution and return distribution data', async () => {
      mockAdminStatsService.getServiceDistribution.mockResolvedValue(mockServiceDist);

      const result = await controller.getServiceDistribution('last7d', undefined, undefined);

      expect(adminStatsService.getServiceDistribution).toHaveBeenCalledWith('last7d', undefined, undefined);
      expect(result).toEqual(mockServiceDist);
    });

    it('should return correct shape with serviceName, count, percentage', async () => {
      mockAdminStatsService.getServiceDistribution.mockResolvedValue(mockServiceDist);

      const result = await controller.getServiceDistribution();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('serviceName');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('percentage');
      expect(typeof result[0].serviceName).toBe('string');
      expect(typeof result[0].count).toBe('number');
      expect(typeof result[0].percentage).toBe('number');
    });

    it('should handle empty distribution gracefully', async () => {
      mockAdminStatsService.getServiceDistribution.mockResolvedValue([]);

      const result = await controller.getServiceDistribution();

      expect(result).toEqual([]);
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStatsController.prototype.getServiceDistribution);
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });

  // ─── getTimeDistribution (DASH-004) ────────────────────────────────
  describe('getTimeDistribution', () => {
    it('should call adminStatsService.getTimeDistribution and return time distribution data', async () => {
      mockAdminStatsService.getTimeDistribution.mockResolvedValue(mockTimeDistribution);

      const result = await controller.getTimeDistribution('last7d', undefined, undefined);

      expect(adminStatsService.getTimeDistribution).toHaveBeenCalledWith('last7d', undefined, undefined);
      expect(result).toEqual(mockTimeDistribution);
    });

    it('should return hour as string in HH:00 format', async () => {
      mockAdminStatsService.getTimeDistribution.mockResolvedValue(mockTimeDistribution);

      const result = await controller.getTimeDistribution();

      expect(Array.isArray(result)).toBe(true);
      for (const item of result) {
        expect(typeof item.hour).toBe('string');
        expect(item.hour).toMatch(/^\d{2}:00$/);
      }
    });

    it('should handle empty time distribution gracefully', async () => {
      mockAdminStatsService.getTimeDistribution.mockResolvedValue([]);

      const result = await controller.getTimeDistribution();

      expect(result).toEqual([]);
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStatsController.prototype.getTimeDistribution);
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });

  // ─── getSystemStatus (P2.4) ──────────────────────────────────────
  describe('getSystemStatus', () => {
    const mockSystemStatus: SystemStatusDto = {
      server: 'Online',
      database: 'Online',
      api: 'Online',
      redis: 'Online',
      lastBackup: '2026-05-05T02:00:00.000Z',
      uptime: '99.9%',
    };

    it('should call adminStatsService.getSystemStatus and return SystemStatusDto', async () => {
      mockAdminStatsService.getSystemStatus.mockResolvedValue(mockSystemStatus);

      const result: SystemStatusDto = await controller.getSystemStatus();

      expect(adminStatsService.getSystemStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSystemStatus);
    });

    it('should return correct SystemStatusDto shape', async () => {
      mockAdminStatsService.getSystemStatus.mockResolvedValue(mockSystemStatus);

      const result: SystemStatusDto = await controller.getSystemStatus();

      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('api');
      expect(result).toHaveProperty('lastBackup');
      expect(result).toHaveProperty('uptime');

      expect(typeof result.server).toBe('string');
      expect(typeof result.database).toBe('string');
      expect(typeof result.api).toBe('string');
      expect(typeof result.lastBackup).toBe('string');
      expect(typeof result.uptime).toBe('string');
    });

    it('should handle degraded system status gracefully', async () => {
      const degradedStatus: SystemStatusDto = {
        server: 'Degraded',
        database: 'Online',
        api: 'Degraded',
        redis: 'Online',
        lastBackup: '2026-05-04T02:00:00.000Z',
        uptime: '95.0%',
      };

      mockAdminStatsService.getSystemStatus.mockResolvedValue(degradedStatus);

      const result: SystemStatusDto = await controller.getSystemStatus();

      expect(result.server).toBe('Degraded');
      expect(result.database).toBe('Online');
      expect(result.api).toBe('Degraded');
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStatsController.prototype.getSystemStatus);
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });
});
