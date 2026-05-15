/**
 * Seed Script Tests
 *
 * These tests verify that:
 * 1. seedDefaultTranslations() is called during seed execution
 * 2. The seed script properly creates admin user, service categories, and services
 * 3. Error handling works correctly
 *
 * Note: jest.config.js has resetMocks: true, so mocks are reset between tests.
 * We use a factory function to create fresh mocks in beforeEach.
 */

import { seedDefaultTranslations } from '../src/modules/translations/translations-seed.service';

// Import the module under test (main function)
import { main } from './seed';

// Mock dependencies BEFORE imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock(
  '../src/modules/translations/translations-seed.service',
  () => ({
    seedDefaultTranslations: jest.fn(),
  }),
);

describe('Seed Script', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock prisma instance
    mockPrisma = {
      user: { upsert: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      serviceCategory: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      service: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'svc-1' }),
      },
      translationDictionary: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 302 }),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    // Setup PrismaClient mock to return our mock instance
    const PrismaClientMock = jest.requireMock('@prisma/client').PrismaClient;
    PrismaClientMock.mockReturnValue(mockPrisma);

    // Setup bcrypt mock
    const bcryptMock = jest.requireMock('bcryptjs');
    bcryptMock.hash.mockResolvedValue('$2a$12$hashedpassword');

    // Setup seed default translations mock
    (seedDefaultTranslations as jest.Mock).mockResolvedValue(undefined);
  });

  describe('translation seeding', () => {
    it('should call seedDefaultTranslations during seed execution', async () => {
      await main(mockPrisma);

      expect(seedDefaultTranslations).toHaveBeenCalledTimes(1);
      expect(seedDefaultTranslations).toHaveBeenCalledWith(mockPrisma);
    });

    it('should handle bcrypt import failure gracefully', async () => {
      const bcryptMock = jest.requireMock('bcryptjs');
      bcryptMock.hash.mockRejectedValueOnce(new Error('bcrypt error'));

      await expect(main(mockPrisma)).rejects.toThrow('bcrypt error');
    });

    it('should create admin user, service categories, and services', async () => {
      await main(mockPrisma);

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.serviceCategory.findFirst).toHaveBeenCalled();
      expect(mockPrisma.serviceCategory.create).toHaveBeenCalled();
    });
  });

  describe('module-level auto-execution', () => {
    it('should export main function', () => {
      expect(typeof main).toBe('function');
    });
  });
});
