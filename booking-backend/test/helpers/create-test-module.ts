import { PrismaClient } from '@prisma/client';
import { getTestDatabaseUrl } from '../setup/test-env';

/**
 * Test module interface for database integration tests.
 * Provides a fresh Prisma client connected to the test database
 * with helper methods to reset database state between tests.
 */
export interface TestModule {
  /** Prisma client connected to the test database */
  prisma: PrismaClient;
  /** Disconnect the Prisma client */
  disconnect: () => Promise<void>;
  /** Reset database state by deleting all test data */
  resetDatabase: () => Promise<void>;
}

/**
 * Clean all test data from the database.
 * Deletes in reverse dependency order to avoid FK constraint violations.
 */
async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in reverse dependency order
  await prisma.systemLog.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.appointmentHistory.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.timeSlot.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.serviceCategory.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.translationDictionary.deleteMany({});
}

/**
 * Create a test module with a Prisma client connected to the test database.
 *
 * Usage:
 * ```typescript
 * let testModule: TestModule;
 *
 * beforeAll(async () => {
 *   testModule = await createTestModule();
 * });
 *
 * afterAll(async () => {
 *   await testModule.disconnect();
 * });
 *
 * beforeEach(async () => {
 *   await testModule.resetDatabase();
 * });
 * ```
 */
export async function createTestModule(): Promise<TestModule> {
  const databaseUrl = getTestDatabaseUrl();

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Ensure connection
  await prisma.$connect();

  return {
    prisma,
    async disconnect() {
      await prisma.$disconnect();
    },
    async resetDatabase() {
      await cleanDatabase(prisma);
    },
  };
}
