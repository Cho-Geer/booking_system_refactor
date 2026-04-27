/**
 * Test Data Factories - Index
 *
 * Synchronous factories for generating Prisma-compatible test data objects.
 * These are complementary to `test/fixtures/database.fixture.ts` which handles
 * actual database persistence. Use these factories when you need pure data
 * objects (e.g., for mocking, DTO validation tests, or unit tests).
 *
 * For database-backed test data, prefer the async helpers in database.fixture.ts.
 *
 * Usage:
 *   import { UserFactory, ServiceFactory, AppointmentFactory, TimeSlotFactory } from 'test/factories';
 *
 *   const userData = UserFactory.create({ email: 'admin@test.com', userType: UserType.ADMIN });
 *   const serviceData = ServiceFactory.create({ name: 'Haircut' });
 *   const slotData = TimeSlotFactory.create({ capacity: 10 });
 *   const aptData = AppointmentFactory.create({ status: AppointmentStatus.CONFIRMED });
 */

export { UserFactory } from './user.factory';
export type { UserFactoryOverrides } from './user.factory';

export { ServiceCategoryFactory, ServiceFactory } from './service.factory';
export type { CategoryFactoryOverrides, ServiceFactoryOverrides } from './service.factory';

export { AppointmentFactory } from './appointment.factory';
export type { AppointmentFactoryOverrides, AppointmentDependencies } from './appointment.factory';

export { TimeSlotFactory } from './time-slot.factory';
export type { TimeSlotFactoryOverrides } from './time-slot.factory';
