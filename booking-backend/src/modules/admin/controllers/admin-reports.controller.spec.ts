import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from '../services/admin-reports.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminReportSummaryDto } from '../dto/admin-report.dto';

// Mock JwtAuthGuard - always pass
const mockJwtAuthGuard = {
  canActivate: jest.fn().mockImplementation((context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'admin-id', userType: 'ADMIN' };
    return true;
  }),
};

// Mock RolesGuard - always pass
const mockRolesGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

// Mock AdminReportsService
const mockAdminReportsService = {
  getSummary: jest.fn(),
};

describe('AdminReportsController', () => {
  let controller: AdminReportsController;
  let service: typeof mockAdminReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReportsController],
      providers: [
        {
          provide: AdminReportsService,
          useValue: mockAdminReportsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AdminReportsController>(AdminReportsController);
    service = module.get(AdminReportsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    const validQuery = { startDate: '2026-01-01', endDate: '2026-12-31' };

    it('should return summary when valid dates provided', async () => {
      const expectedResult: AdminReportSummaryDto = {
        totalBookings: 100,
        totalRevenue: 50000,
        cancellationRate: 0.15,
        topServices: [
          { serviceName: 'Haircut', count: 40, revenue: 20000 },
        ],
        dailyStats: [
          { date: '2026-01-15', bookings: 10, revenue: 5000 },
        ],
      };

      mockAdminReportsService.getSummary.mockResolvedValue(expectedResult);

      const result = await controller.getSummary(validQuery);

      expect(service.getSummary).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
      expect(result).toEqual(expectedResult);
    });

    it('should propagate service errors', async () => {
      mockAdminReportsService.getSummary.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.getSummary(validQuery)).rejects.toThrow('Database error');
    });
  });
});
