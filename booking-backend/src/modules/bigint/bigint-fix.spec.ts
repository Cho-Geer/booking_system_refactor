import { AdminServicesService } from '../admin/services/admin-services.service';
import { AdminAppointmentsService } from '../admin/services/admin-appointments.service';
import { AdminUsersService } from '../admin/services/admin-users.service';
import { AdminNotificationsService } from '../admin/services/admin-notifications.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ServicesService } from '../services/services.service';
import { UsersService } from '../users/users.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';
import { StatsService } from '../stats/stats.service';

// ============================================================================
// RED Phase — BigInt Fix Test (T-001-BIGINT)
// ============================================================================
// These tests verify that when Prisma 6.x .count() returns BigInt at runtime
// (despite TS typing it as number), the service pagination methods do NOT
// throw TypeError: Cannot mix BigInt and other types.
//
// Each test mocks .count() to return BigInt(5), and verifies that:
// 1. No TypeError is thrown during Math.ceil(total / limit)
// 2. TotalPages equals the expected numeric value
// ============================================================================

function createMockPrisma(bigIntCount: bigint = BigInt(5)) {
  return {
    service: {
      count: jest.fn().mockResolvedValue(bigIntCount),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _avg: { price: null } }),
      groupBy: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      count: jest.fn().mockResolvedValue(bigIntCount),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      count: jest.fn().mockResolvedValue(bigIntCount),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    timeSlot: {
      count: jest.fn().mockResolvedValue(bigIntCount),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: {
      count: jest.fn().mockResolvedValue(bigIntCount),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
    translationDictionary: {
      count: jest.fn().mockResolvedValue(bigIntCount),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    serviceCategory: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    activityLog: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

function createMockEmailService() {
  return {
    sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
    sendAppointmentCancellation: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockNotificationService() {
  return {
    notifyBookingConfirmation: jest.fn(),
    notifyAppointmentUpdate: jest.fn(),
    notifyCancellation: jest.fn(),
  };
}

function createMockNotificationsGateway() {
  return {
    sendAppointmentStatusChanged: jest.fn(),
    sendTranslationsUpdated: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockCacheService() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockHashService() {
  return {
    hashWithPepper: jest.fn().mockReturnValue('mocked-hash'),
  };
}

function createMockAdminSettingsService() {
  return {
    getBusinessHours: jest.fn().mockResolvedValue({
      timezone: 'Asia/Shanghai',
      monday: [{ open: '09:00', close: '18:00' }],
    }),
  };
}

// We won't import the real services for time-slots, appointments (too many deps)
// Instead, test functions in isolation for the critical "getSummary" and pagination patterns

describe('BigInt Fix for Prisma .count() returning BigInt at runtime', () => {
  describe('AdminServicesService — Math.ceil(total / limit) + subtraction', () => {
    it('should not throw TypeError when .count() returns BigInt in findAll pagination', async () => {
      const mockPrisma = createMockPrisma(BigInt(5));
      const service = new AdminServicesService(mockPrisma as any, null as any);

      const result = await (service as any).findAll({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(5);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should not throw TypeError when .count() returns BigInt in getSummary subtraction', async () => {
      const mockPrisma = createMockPrisma(BigInt(100));
      const service = new AdminServicesService(mockPrisma as any, null as any);

      const summary = await service.getSummary();

      expect(summary.totalServices).toBe(100);
      expect(summary.activeServicesCount).toBe(100);
      // inactive = total - active (both BigInt) — should be number
      expect(summary.inactiveServicesCount).toBe(0);
      expect(typeof summary.inactiveServicesCount).toBe('number');
    });
  });

  describe('AdminAppointmentsService — Math.ceil(total / limit)', () => {
    it('should not throw TypeError when .count() returns BigInt', async () => {
      const mockPrisma = createMockPrisma(BigInt(7));
      const service = new AdminAppointmentsService(mockPrisma as any);

      const result = await (service as any).findAll({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(7);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNext).toBe(false);
    });

    it('should compute totalPages correctly when BigInt count > limit', async () => {
      const mockPrisma = createMockPrisma(BigInt(25));
      const service = new AdminAppointmentsService(mockPrisma as any);

      const result = await (service as any).findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('AppointmentsService — Math.ceil(total / limit)', () => {
    it('should not throw TypeError when .count() returns BigInt', async () => {
      const mockPrisma = createMockPrisma(BigInt(3));
      const emailService = createMockEmailService();
      const notificationService = createMockNotificationService();
      const notificationsGateway = createMockNotificationsGateway();
      const service = new AppointmentsService(
        mockPrisma as any,
        emailService as any,
        notificationService as any,
        notificationsGateway as any,
      );

      const result = await (service as any).findAll(1, 10);

      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('ServicesService — Math.ceil(total / pageSize)', () => {
    it('should not throw TypeError when .count() returns BigInt', async () => {
      const mockPrisma = createMockPrisma(BigInt(15));
      const service = new ServicesService(mockPrisma as any);

      const result = await (service as any).findAll(1, 10);

      expect(result.meta.total).toBe(15);
      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('UsersService — Math.ceil(total / pageSize)', () => {
    it('should not throw TypeError when .count() returns BigInt', async () => {
      const mockPrisma = createMockPrisma(BigInt(12));
      const hashService = createMockHashService();
      const service = new UsersService(mockPrisma as any, hashService as any);

      const result = await (service as any).findAll(1, 10);

      expect(result.meta.total).toBe(12);
      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('AdminUsersService — Math.ceil(total / limit)', () => {
    it('should not throw TypeError when .count() returns BigInt', async () => {
      const mockPrisma = createMockPrisma(BigInt(8));
      const service = new AdminUsersService(mockPrisma as any, null as any);

      const result = await (service as any).findAll({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(8);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});

// ============================================================================
// Separate suite for services that need more complex mocking
// ============================================================================

describe('BigInt Fix — AdminNotificationsService', () => {
  it('should not throw TypeError when .count() returns BigInt', async () => {
    const mockPrisma = createMockPrisma(BigInt(5));
    const service = new AdminNotificationsService(mockPrisma as any);

    const result = await (service as any).findAll('user-1', 1, 10);

    expect(result.meta.total).toBe(5);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.hasNext).toBe(false);
  });
});

describe('BigInt Fix — TimeSlotsService', () => {
  it('should not throw TypeError in findAll pagination when .count() returns BigInt', async () => {
    const mockPrisma = createMockPrisma(BigInt(5));
    const adminSettingsService = createMockAdminSettingsService();
    const service = new TimeSlotsService(mockPrisma as any, adminSettingsService as any);

    const result = await (service as any).findAll(undefined, undefined, 1, 10);

    expect(result.meta.total).toBe(5);
    expect(result.meta.totalPages).toBe(1);
  });

  it('should not throw TypeError when comparing capacity > _count.appointments (BigInt)', async () => {
    // Mock findMany to return a slot where _count.appointments is BigInt
    const mockSlots = [
      {
        id: 'slot-1',
        capacity: 5,
        startTime: new Date('2026-05-17T10:00:00Z'),
        endTime: new Date('2026-05-17T11:00:00Z'),
        service: { id: 'svc-1', name: 'Test' },
        isActive: true,
        _count: { appointments: BigInt(3) },
      },
    ];
    const mockFindMany = jest.fn().mockResolvedValue(mockSlots);
    const mockServiceFindUnique = jest.fn().mockResolvedValue({
      id: 'svc-1',
      name: 'Test',
      durationMinutes: 60,
    });
    const mockPrisma = {
      ...createMockPrisma(BigInt(5)),
      timeSlot: {
        ...createMockPrisma(BigInt(5)).timeSlot,
        findMany: mockFindMany,
      },
      service: {
        ...createMockPrisma(BigInt(5)).service,
        findUnique: mockServiceFindUnique,
      },
    };

    const adminSettingsService = createMockAdminSettingsService();
    const service = new TimeSlotsService(mockPrisma as any, adminSettingsService as any);

    const slots = await service.getAvailableSlots(
      'svc-1',
      new Date('2026-05-17'),
      new Date('2026-05-17'),
    );

    expect(slots[0].available).toBe(true); // capacity(5) > appointments(3) → true
    expect(slots[0].bookedCount).toBe(3);
    expect(typeof slots[0].bookedCount).toBe('number');
    expect(typeof slots[0].available).toBe('boolean');
  });
});

describe('BigInt Fix — TranslationService', () => {
  it('should not throw TypeError in getAdminTranslations when .count() returns BigInt', async () => {
    const mockPrisma = createMockPrisma(BigInt(22));
    const cacheService = createMockCacheService();
    const notificationsGateway = createMockNotificationsGateway();
    const { TranslationService } = require('../translations/translations.service');

    const service = new TranslationService(
      mockPrisma as any,
      cacheService as any,
      notificationsGateway as any,
    );

    const result = await service.getAdminTranslations(1, 10);

    expect(result.meta.total).toBe(22);
    expect(result.meta.totalPages).toBe(3); // ceil(22 / 10) = 3
  });
});

describe('BigInt Fix — StatsService activeUsers', () => {
  it('should return activeUsers as number not BigInt', async () => {
    const mockPrisma = createMockPrisma(BigInt(42));
    // Override user.count for the active users query specifically
    mockPrisma.user.count = jest.fn().mockResolvedValue(BigInt(42));
    mockPrisma.user.groupBy = jest.fn().mockResolvedValue([]);

    const service = new StatsService(mockPrisma as any);

    const result = await service.getUserStats();

    expect(result.activeUsers).toBe(42);
    expect(typeof result.activeUsers).toBe('number');
  });
});
