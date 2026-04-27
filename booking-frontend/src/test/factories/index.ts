/**
 * Test data factories for booking-frontend.
 *
 * These factories provide centralized, reusable test data generation
 * to eliminate inline mock data duplication across test files.
 *
 * Usage:
 *   import { UserFactory, ServiceFactory, TimeSlotFactory, BookingFactory } from 'src/test/factories';
 *
 *   const user = UserFactory.create();
 *   const admin = UserFactory.createAdmin();
 *   const services = ServiceFactory.createMany(5);
 *   const slots = TimeSlotFactory.createDaySlots('2026-05-01');
 *   const booking = BookingFactory.createConfirmed();
 */

export { UserFactory } from './user.factory';
export type { UserFactoryOverrides } from './user.factory';

export { ServiceFactory } from './service.factory';
export type { ServiceFactoryOverrides } from './service.factory';

export { TimeSlotFactory } from './time-slot.factory';
export type { TimeSlotFactoryOverrides } from './time-slot.factory';

export { BookingFactory } from './booking.factory';
export type { BookingFactoryOverrides, BookingListItemOverrides } from './booking.factory';
