import { Test, TestingModule } from '@nestjs/testing';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from '../services/admin-settings.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

// ── Mock AdminSettingsService ─────────────────────────────────────────
const mockAdminSettingsService = {
  getBusinessHours: jest.fn(),
  updateBusinessHours: jest.fn(),
};

// ── Mock Guards ───────────────────────────────────────────────────────
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockRolesGuard = { canActivate: jest.fn(() => true) };

// ── Flattened business hours fixture ──────────────────────────────────
const mockFlattenedBusinessHours = {
  timezone: 'Asia/Shanghai',
  monday: [{ open: '09:00', close: '17:00' }],
  tuesday: [{ open: '09:00', close: '17:00' }],
  wednesday: [{ open: '09:00', close: '17:00' }],
  thursday: [{ open: '09:00', close: '17:00' }],
  friday: [{ open: '09:00', close: '17:00' }],
  saturday: [{ open: '10:00', close: '14:00' }],
  sunday: [],
  updatedAt: '2026-05-12T00:00:00.000Z',
};

describe('AdminSettingsController', () => {
  let controller: AdminSettingsController;
  let adminSettingsService: typeof mockAdminSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSettingsController],
      providers: [
        {
          provide: AdminSettingsService,
          useValue: mockAdminSettingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AdminSettingsController>(AdminSettingsController);
    adminSettingsService = module.get(AdminSettingsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ================================================================
  // GET /v1/admin/settings/business-hours
  // ================================================================
  describe('getBusinessHours', () => {
    it('[RED] should return flattened business hours (no schedule wrapper)', async () => {
      // MEDIUM-1: Response structure is { timezone, monday, ..., sunday, updatedAt }
      // This will FAIL because AdminSettingsController does not exist
      mockAdminSettingsService.getBusinessHours.mockResolvedValue(
        mockFlattenedBusinessHours,
      );

      const result = await controller.getBusinessHours();

      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('monday');
      expect(result).toHaveProperty('tuesday');
      expect(result).toHaveProperty('wednesday');
      expect(result).toHaveProperty('thursday');
      expect(result).toHaveProperty('friday');
      expect(result).toHaveProperty('saturday');
      expect(result).toHaveProperty('sunday');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('schedule');
    });

    it('[RED] should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AdminSettingsController.prototype.getBusinessHours,
      );
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });

  // ================================================================
  // PUT /v1/admin/settings/business-hours
  // ================================================================
  describe('updateBusinessHours', () => {
    const updateDto = {
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '17:00' }],
      tuesday: [],
      wednesday: [{ open: '09:00', close: '17:00' }],
      thursday: [{ open: '09:00', close: '17:00' }],
      friday: [{ open: '09:00', close: '17:00' }],
      saturday: [{ open: '10:00', close: '14:00' }],
      sunday: [],
    };

    it('[RED] should accept flattened business hours body and return success message', async () => {
      mockAdminSettingsService.updateBusinessHours.mockResolvedValue({
        message: '营业时间已更新',
      });

      const result = await controller.updateBusinessHours(updateDto);

      expect(adminSettingsService.updateBusinessHours).toHaveBeenCalledWith(
        updateDto,
      );
      expect(result).toEqual({ message: '营业时间已更新' });
    });

    it('[RED] should require SUPER_ADMIN role for updates', () => {
      const roles = Reflect.getMetadata(
        'roles',
        AdminSettingsController.prototype.updateBusinessHours,
      );
      expect(roles).toBeDefined();
      expect(roles).toContain('SUPER_ADMIN');
      expect(roles).not.toContain('CUSTOMER');
    });
  });
});
