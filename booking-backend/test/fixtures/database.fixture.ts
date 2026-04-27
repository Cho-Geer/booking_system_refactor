import { PrismaClient, UserType, UserStatus, AppointmentStatus } from '@prisma/client';

/**
 * Database fixtures for creating test data.
 * These helpers create predictable test data and provides cleanup methods.
 */

export interface TestUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: UserType;
  status: UserStatus;
}

export interface TestService {
  id: string;
  name: string;
  categoryId: string;
  durationMinutes: number;
}

export interface TestTimeSlot {
  id: string;
  serviceId: string;
  slotTime: string;
  capacity: number;
}

export interface TestAppointment {
  id: string;
  userId: string;
  timeSlotId: string;
  serviceId: string;
  appointmentNumber: string;
  status: AppointmentStatus;
}

/**
 * Create a test user with the specified user type
 */
export async function createTestUser(
  prisma: PrismaClient,
  userType: UserType = UserType.CUSTOMER,
  overrides: Record<string, unknown> = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  return prisma.user.create({
    data: {
      name: `Test ${userType} ${timestamp}`,
      email: `test-${userType.toLowerCase()}-${timestamp}@example.com`,
      phone: `+1${String(timestamp).padStart(10, '0')}`,
      userType,
      status: UserStatus.ACTIVE,
      ...overrides,
    },
  }) as Promise<TestUser>;
}

/**
 * Create multiple test users
 */
export async function createTestUsers(
  prisma: PrismaClient,
  count: number,
  userType: UserType = UserType.CUSTOMER
): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(prisma, userType);
    users.push(user);
  }
  return users;
}

/**
 * Create a test service category
 */
export async function createTestCategory(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; name: string }> {
  const timestamp = Date.now();
  return prisma.serviceCategory.create({
    data: {
      name: `Test Category ${timestamp}`,
      description: 'Test category for integration tests',
      isActive: true,
      displayOrder: 0,
      ...overrides,
    },
  });
}

/**
 * Create a test service
 */
export async function createTestService(
  prisma: PrismaClient,
  categoryId?: string,
  overrides: Record<string, unknown> = {}
): Promise<TestService> {
  const timestamp = Date.now();

  let actualCategoryId = categoryId;
  if (!actualCategoryId) {
    const category = await createTestCategory(prisma);
    actualCategoryId = category.id;
  }

  return prisma.service.create({
    data: {
      categoryId: actualCategoryId,
      name: `Test Service ${timestamp}`,
      description: 'Test service for integration tests',
      durationMinutes: 60,
      isActive: true,
      displayOrder: 0,
      ...overrides,
    },
  }) as Promise<TestService>;
}

/**
 * Create a test time slot
 */
export async function createTestTimeSlot(
  prisma: PrismaClient,
  serviceId?: string,
  overrides: Record<string, unknown> = {}
): Promise<TestTimeSlot> {
  const timestamp = Date.now();

  let actualServiceId = serviceId;
  if (!actualServiceId) {
    const service = await createTestService(prisma);
    actualServiceId = service.id;
  }

  return prisma.timeSlot.create({
    data: {
      serviceId: actualServiceId,
      slotTime: `2026-01-01T${String(9 + timestamp % 8).padStart(2, '0')}:00:00`,
      durationMinutes: 60,
      capacity: 5,
      currentSequence: 0,
      isActive: true,
      displayOrder: 0,
      ...overrides,
    },
  }) as Promise<TestTimeSlot>;
}

/**
 * Create a test appointment
 */
export async function createTestAppointment(
  prisma: PrismaClient,
  overrides: {
    userId?: string;
    timeSlotId?: string;
    serviceId?: string;
    status?: AppointmentStatus;
  } = {}
): Promise<TestAppointment> {
  const timestamp = Date.now();

  // Create dependencies if not provided
  const userId = overrides.userId || (await createTestUser(prisma)).id;
  const serviceId = overrides.serviceId || (await createTestService(prisma)).id;
  const timeSlotId = overrides.timeSlotId || (await createTestTimeSlot(prisma, serviceId)).id;

  const appointmentNumber = `APT-${timestamp}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return prisma.appointment.create({
    data: {
      userId,
      timeSlotId,
      serviceId,
      appointmentNumber,
      appointmentDate: new Date('2026-01-01T10:00:00Z'),
      slotSequence: 1,
      status: overrides.status || AppointmentStatus.PENDING,
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
      },
    },
  }) as Promise<TestAppointment>;
}

/**
 * Clean up ALL test data from the database.
 * Deletes in reverse dependency order to avoid foreign key constraint violations.
 */
export async function cleanupAllTestData(prisma: PrismaClient): Promise<void> {
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
}

/**
 * Seed the database with a complete set of test data
 */
export async function seedTestData(prisma: PrismaClient): Promise<{
  users: { customer: TestUser; admin: TestUser; superAdmin: TestUser };
  category: { id: string; name: string };
  services: TestService[];
  timeSlots: TestTimeSlot[];
}> {
  // Create users
  const customer = await createTestUser(prisma, UserType.CUSTOMER);
  const admin = await createTestUser(prisma, UserType.ADMIN);
  const superAdmin = await createTestUser(prisma, UserType.SUPER_ADMIN);

  // Create category
  const category = await createTestCategory(prisma);

  // Create services
  const service1 = await createTestService(prisma, category.id, {
    name: 'Hair Cut',
    durationMinutes: 30,
  });
  const service2 = await createTestService(prisma, category.id, {
    name: 'Hair Color',
    durationMinutes: 90,
  });

  // Create time slots
  const timeSlot1 = await createTestTimeSlot(prisma, service1.id, {
    slotTime: '2026-01-01T09:00:00',
  });
  const timeSlot2 = await createTestTimeSlot(prisma, service1.id, {
    slotTime: '2026-01-01T10:00:00',
  });
  const timeSlot3 = await createTestTimeSlot(prisma, service2.id, {
    slotTime: '2026-01-01T11:00:00',
  });

  return {
    users: { customer, admin, superAdmin },
    category,
    services: [service1, service2],
    timeSlots: [timeSlot1, timeSlot2, timeSlot3],
  };
}
