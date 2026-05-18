import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

// Mock StatsService
const mockStatsService = {
  getOverview: jest.fn(),
  getRevenue: jest.fn(),
  getUserStats: jest.fn(),
  getPopularServices: jest.fn(),
  getDailyBookings: jest.fn(),
};

describe('StatsController', () => {
  let controller: StatsController;
  let service: typeof mockStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    service = module.get(StatsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    const mockOverview = {
      totalAppointments: 150,
      totalUsers: 85,
      totalRevenue: 15000,
      activeServices: 12,
    };

    it('should call service.getOverview and return overview statistics', async () => {
      mockStatsService.getOverview.mockResolvedValue(mockOverview);

      const result = await controller.getOverview();

      expect(service.getOverview).toHaveBeenCalled();
      expect(result).toEqual(mockOverview);
    });
  });

  describe('getRevenue', () => {
    const mockRevenue = {
      totalRevenue: 15000,
      monthlyRevenue: [
        { month: '2024-01', revenue: 1200 },
        { month: '2024-02', revenue: 1500 },
      ],
      averagePerAppointment: 100,
    };

    it('should call service.getRevenue and return revenue statistics', async () => {
      mockStatsService.getRevenue.mockResolvedValue(mockRevenue);

      const result = await controller.getRevenue();

      expect(service.getRevenue).toHaveBeenCalled();
      expect(result).toEqual(mockRevenue);
    });
  });

  describe('getUserStats', () => {
    const mockUserStats = {
      totalUsers: 85,
      newUsersThisMonth: 10,
      growthRate: 0.13,
      usersByType: {
        CUSTOMER: 70,
        ADMIN: 5,
        STAFF: 10,
      },
    };

    it('should call service.getUserStats and return user statistics', async () => {
      mockStatsService.getUserStats.mockResolvedValue(mockUserStats);

      const result = await controller.getUserStats();

      expect(service.getUserStats).toHaveBeenCalled();
      expect(result).toEqual(mockUserStats);
    });
  });

  describe('getPopularServices', () => {
    const mockPopularServices = [
      { serviceId: 'svc-1', name: 'Haircut', bookingCount: 50 },
      { serviceId: 'svc-2', name: 'Manicure', bookingCount: 35 },
      { serviceId: 'svc-3', name: 'Facial', bookingCount: 25 },
    ];

    it('should call service.getPopularServices and return popular services', async () => {
      mockStatsService.getPopularServices.mockResolvedValue(mockPopularServices);

      const result = await controller.getPopularServices();

      expect(service.getPopularServices).toHaveBeenCalled();
      expect(result).toEqual(mockPopularServices);
    });

    it('should return empty array when no services have bookings', async () => {
      mockStatsService.getPopularServices.mockResolvedValue([]);

      const result = await controller.getPopularServices();

      expect(result).toEqual([]);
    });
  });

  describe('getDailyBookings', () => {
    const mockDailyBookings = {
      dailyTrend: [
        { date: '2024-06-01', bookings: 5 },
        { date: '2024-06-02', bookings: 8 },
        { date: '2024-06-03', bookings: 3 },
      ],
      averagePerDay: 5.33,
      peakDay: '2024-06-02',
    };

    it('should call service.getDailyBookings and return daily booking trend', async () => {
      mockStatsService.getDailyBookings.mockResolvedValue(mockDailyBookings);

      const result = await controller.getDailyBookings();

      expect(service.getDailyBookings).toHaveBeenCalled();
      expect(result).toEqual(mockDailyBookings);
    });
  });
});
