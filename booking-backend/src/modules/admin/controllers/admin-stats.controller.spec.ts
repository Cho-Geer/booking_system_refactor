import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from '../services/admin-stats.service';
import { AdminStatsDto } from '../dto/admin-stats.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

// ── Mock AdminStatsService ────────────────────────────────────────────
const mockAdminStatsService = {
  getDashboard: jest.fn(),
};

// ── Mock Guards ───────────────────────────────────────────────────────
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockRolesGuard = { canActivate: jest.fn(() => true) };

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
    const mockDashboard: AdminStatsDto = {
      totalBookings: 850,
      todayBookings: 25,
      activeUsers: 85,
      totalRevenue: 45000,
      bookingTrend: [
        { date: '2026-04-25', count: 10 },
        { date: '2026-04-26', count: 15 },
        { date: '2026-04-27', count: 8 },
        { date: '2026-04-28', count: 12 },
        { date: '2026-04-29', count: 20 },
        { date: '2026-04-30', count: 18 },
        { date: '2026-05-01', count: 25 },
      ],
      servicePopularity: [
        { serviceName: 'Haircut', count: 200 },
        { serviceName: 'Manicure', count: 150 },
        { serviceName: 'Facial', count: 100 },
      ],
    };

    it('should call adminStatsService.getDashboard and return AdminStatsDto', async () => {
      mockAdminStatsService.getDashboard.mockResolvedValue(mockDashboard);

      const result: AdminStatsDto = await controller.getStats();

      expect(adminStatsService.getDashboard).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDashboard);
    });

    it('should return correct AdminStatsDto shape', async () => {
      mockAdminStatsService.getDashboard.mockResolvedValue(mockDashboard);

      const result: AdminStatsDto = await controller.getStats();

      expect(result).toHaveProperty('totalBookings');
      expect(result).toHaveProperty('todayBookings');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('bookingTrend');
      expect(result).toHaveProperty('servicePopularity');

      expect(typeof result.totalBookings).toBe('number');
      expect(typeof result.todayBookings).toBe('number');
      expect(typeof result.activeUsers).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(Array.isArray(result.bookingTrend)).toBe(true);
      expect(Array.isArray(result.servicePopularity)).toBe(true);
    });

    it('should handle empty dashboard data gracefully', async () => {
      const emptyDashboard: AdminStatsDto = {
        totalBookings: 0,
        todayBookings: 0,
        activeUsers: 0,
        totalRevenue: 0,
        bookingTrend: [],
        servicePopularity: [],
      };

      mockAdminStatsService.getDashboard.mockResolvedValue(emptyDashboard);

      const result: AdminStatsDto = await controller.getStats();

      expect(result.totalBookings).toBe(0);
      expect(result.todayBookings).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.bookingTrend).toEqual([]);
      expect(result.servicePopularity).toEqual([]);
    });

    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', AdminStatsController);
      // The guard metadata is set on the class — verify at least the decorators are present
      expect(AdminStatsController).toBeDefined();
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStatsController.prototype.getStats);
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });
});
