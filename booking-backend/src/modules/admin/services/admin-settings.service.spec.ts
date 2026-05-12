import { Test, TestingModule } from '@nestjs/testing';
import { AdminSettingsService } from './admin-settings.service';
import { PrismaService } from '../../../common/database/prisma.service';

// ── BusinessHoursDto shape (flattened, no schedule wrapper) ──────────
interface BusinessHoursDay {
  open: string;
  close: string;
}

interface BusinessHoursDto {
  timezone: string;
  monday: BusinessHoursDay[];
  tuesday: BusinessHoursDay[];
  wednesday: BusinessHoursDay[];
  thursday: BusinessHoursDay[];
  friday: BusinessHoursDay[];
  saturday: BusinessHoursDay[];
  sunday: BusinessHoursDay[];
  updatedAt: string;
}

// ── Mock PrismaService ────────────────────────────────────────────────
const mockPrismaService = {
  systemSetting: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSettingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminSettingsService>(AdminSettingsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================================================================
  // getBusinessHours
  // ================================================================
  describe('getBusinessHours', () => {
    it('[RED] should return flattened business hours (no schedule wrapper)', async () => {
      // MEDIUM-1: Response should be { timezone, monday, ..., sunday, updatedAt }
      // This will FAIL because AdminSettingsService does not exist
      const result: BusinessHoursDto = await service.getBusinessHours();

      // Assert flattened structure: days at TOP level, no `schedule` wrapper
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('monday');
      expect(result).toHaveProperty('tuesday');
      expect(result).toHaveProperty('wednesday');
      expect(result).toHaveProperty('thursday');
      expect(result).toHaveProperty('friday');
      expect(result).toHaveProperty('saturday');
      expect(result).toHaveProperty('sunday');
      expect(result).toHaveProperty('updatedAt');

      // Ensure the days are arrays of { open, close } objects
      expect(Array.isArray(result.monday)).toBe(true);
      expect(Array.isArray(result.tuesday)).toBe(true);
    });

    it('[RED] should return timezone as IANA string', async () => {
      mockPrismaService.systemSetting.findUnique.mockResolvedValue({
        settingKey: 'business_hours',
        settingValue: JSON.stringify({
          timezone: 'Asia/Shanghai',
          monday: [{ open: '09:00', close: '17:00' }],
        }),
        updatedAt: new Date('2026-05-12T00:00:00Z'),
      });

      const result: BusinessHoursDto = await service.getBusinessHours();

      expect(result.timezone).toBe('Asia/Shanghai');
    });
  });

  // ================================================================
  // updateBusinessHours
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

    it('[RED] should accept flattened business hours body (no schedule wrapper)', async () => {
      // MEDIUM-1: PUT body should accept { timezone, monday, ..., sunday }
      // This will FAIL because AdminSettingsService does not exist
      const result = await service.updateBusinessHours(updateDto);

      expect(result).toBeDefined();
      expect(prisma.systemSetting.upsert).toHaveBeenCalled();
    });
  });
});
