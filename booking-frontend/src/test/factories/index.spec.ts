import { UserFactory } from './user.factory';
import { ServiceFactory } from './service.factory';
import { TimeSlotFactory } from './time-slot.factory';
import { BookingFactory } from './booking.factory';
import { UserRole } from '../../app/shared/dto/user.dto';
import { BookingStatus } from '../../app/shared/dto/booking.dto';

describe('Test Factories', () => {
  describe('UserFactory', () => {
    it('should create a user with defaults', () => {
      const user = UserFactory.create();

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@example.com');
      expect(user.name).toBeDefined();
      expect(user.role).toBe(UserRole.USER);
      expect(user.createdAt).toBeDefined();
    });

    it('should create a user with overrides', () => {
      const user = UserFactory.create({
        email: 'custom@test.com',
        name: 'Custom User',
      });

      expect(user.email).toBe('custom@test.com');
      expect(user.name).toBe('Custom User');
    });

    it('should create multiple users', () => {
      const users = UserFactory.createMany(3);

      expect(users).toHaveLength(3);
      expect(users[0].id).not.toBe(users[1].id);
    });

    it('should create an admin user', () => {
      const admin = UserFactory.createAdmin();

      expect(admin.role).toBe(UserRole.ADMIN);
    });

    it('should create a login response', () => {
      const response = UserFactory.createLoginResponse();

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.user).toBeDefined();
    });
  });

  describe('ServiceFactory', () => {
    it('should create a service with defaults', () => {
      const service = ServiceFactory.create();

      expect(service.id).toBeDefined();
      expect(service.name).toBeDefined();
      expect(service.durationMinutes).toBe(60);
      expect(service.price).toBe(49.99);
      expect(service.active).toBe(true);
    });

    it('should create multiple services', () => {
      const services = ServiceFactory.createMany(5);

      expect(services).toHaveLength(5);
    });

    it('should create common services', () => {
      const services = ServiceFactory.createCommonServices();

      expect(services).toHaveLength(4);
      expect(services[0].name).toBe('Haircut');
      expect(services[1].name).toBe('Coloring');
    });
  });

  describe('TimeSlotFactory', () => {
    it('should create a time slot with defaults', () => {
      const slot = TimeSlotFactory.create();

      expect(slot.id).toBeDefined();
      expect(slot.startTime).toBeDefined();
      expect(slot.endTime).toBeDefined();
      expect(slot.capacity).toBe(5);
      expect(slot.bookedCount).toBe(0);
      expect(slot.available).toBe(true);
    });

    it('should create a booked slot', () => {
      const slot = TimeSlotFactory.createBookedSlot({ capacity: 3 });

      expect(slot.bookedCount).toBe(3);
      expect(slot.available).toBe(false);
    });

    it('should create day slots', () => {
      const slots = TimeSlotFactory.createDaySlots('2026-05-01');

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].startTime).toContain('2026-05-01');
    });
  });

  describe('BookingFactory', () => {
    it('should create a booking with defaults', () => {
      const booking = BookingFactory.create();

      expect(booking.id).toBeDefined();
      expect(booking.userId).toBeDefined();
      expect(booking.timeSlotId).toBeDefined();
      expect(booking.status).toBe(BookingStatus.PENDING);
    });

    it('should create a confirmed booking', () => {
      const booking = BookingFactory.createConfirmed();

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should create a cancelled booking', () => {
      const booking = BookingFactory.createCancelled();

      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });

    it('should create multiple bookings', () => {
      const bookings = BookingFactory.createMany(5);

      expect(bookings).toHaveLength(5);
    });

    it('should create a list item', () => {
      const item = BookingFactory.createListItem();

      expect(item.id).toBeDefined();
      expect(item.serviceName).toBeDefined();
      expect(item.timeSlotStart).toBeDefined();
    });

    it('should create with dependencies', () => {
      const result = BookingFactory.createWithDependencies();

      expect(result.booking).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.timeSlot).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.booking.userId).toBe(result.user.id);
      expect(result.booking.timeSlotId).toBe(result.timeSlot.id);
    });
  });
});
