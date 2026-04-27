import { Booking, BookingStatus, BookingListItem, CreateBookingResponse } from '../../app/shared/dto/booking.dto';
import { UserFactory, type UserFactoryOverrides } from './user.factory';
import { TimeSlotFactory, type TimeSlotFactoryOverrides } from './time-slot.factory';
import { ServiceFactory, type ServiceFactoryOverrides } from './service.factory';

/**
 * Factory for generating Booking test data.
 * Produces frontend DTO-compatible Booking objects with auto-generated dependencies.
 *
 * Usage:
 *   const booking = BookingFactory.create();
 *   const booking = BookingFactory.create({ status: BookingStatus.CONFIRMED });
 *   const bookings = BookingFactory.createMany(5);
 */

export interface BookingFactoryOverrides {
  id?: string;
  userId?: string;
  timeSlotId?: string;
  appointmentDate?: string;
  status?: BookingStatus;
  slotSequence?: number;
  createdAt?: string;
  notes?: string;
}

export interface BookingListItemOverrides {
  id?: string;
  timeSlotId?: string;
  appointmentDate?: string;
  status?: BookingStatus;
  serviceName?: string;
  timeSlotStart?: string;
  timeSlotEnd?: string;
}

export class BookingFactory {
  private static counter = 0;

  private static uid(): string {
    return `${Date.now()}-${++BookingFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Generate a future appointment date string.
   */
  private static generateAppointmentDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 30) + 1);
    d.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
    return d.toISOString();
  }

  /**
   * Create a single Booking object.
   * @param overrides - Fields to override defaults
   * @returns Booking DTO object
   */
  static create(overrides: BookingFactoryOverrides = {}): Booking {
    const uid = BookingFactory.uid();

    return {
      id: overrides.id ?? `booking-${uid}`,
      userId: overrides.userId ?? `user-${uid}`,
      timeSlotId: overrides.timeSlotId ?? `slot-${uid}`,
      appointmentDate: overrides.appointmentDate ?? BookingFactory.generateAppointmentDate(),
      status: overrides.status ?? BookingStatus.PENDING,
      slotSequence: overrides.slotSequence ?? 1,
      createdAt: overrides.createdAt ?? new Date().toISOString(),
      notes: overrides.notes ?? null,
    };
  }

  /**
   * Create multiple Booking objects.
   * @param count - Number of bookings to generate
   * @param overrides - Fields to apply to ALL generated bookings
   * @returns Array of Booking objects
   */
  static createMany(count: number, overrides: BookingFactoryOverrides = {}): Booking[] {
    return Array.from({ length: count }, () => BookingFactory.create(overrides));
  }

  /**
   * Create a BookingListItem object (for list views).
   */
  static createListItem(overrides: BookingListItemOverrides = {}): BookingListItem {
    const uid = BookingFactory.uid();

    return {
      id: overrides.id ?? `booking-${uid}`,
      timeSlotId: overrides.timeSlotId ?? `slot-${uid}`,
      appointmentDate: overrides.appointmentDate ?? BookingFactory.generateAppointmentDate(),
      status: overrides.status ?? BookingStatus.PENDING,
      serviceName: overrides.serviceName ?? `Service ${uid}`,
      timeSlotStart: overrides.timeSlotStart ?? new Date().toISOString(),
      timeSlotEnd: overrides.timeSlotEnd ?? new Date(Date.now() + 3600000).toISOString(),
    };
  }

  /**
   * Create a CreateBookingResponse object.
   */
  static createCreateBookingResponse(overrides: {
    booking?: Booking;
  } = {}): CreateBookingResponse {
    return {
      booking: overrides.booking ?? BookingFactory.create(),
    };
  }

  /**
   * Create a confirmed booking.
   */
  static createConfirmed(overrides: BookingFactoryOverrides = {}): Booking {
    return BookingFactory.create({
      ...overrides,
      status: BookingStatus.CONFIRMED,
    });
  }

  /**
   * Create a cancelled booking.
   */
  static createCancelled(overrides: BookingFactoryOverrides = {}): Booking {
    return BookingFactory.create({
      ...overrides,
      status: BookingStatus.CANCELLED,
    });
  }

  /**
   * Create bookings with realistic related data.
   * Returns an object with booking, user, timeSlot, and service.
   */
  static createWithDependencies(
    bookingOverrides: BookingFactoryOverrides = {},
    userOverrides: UserFactoryOverrides = {},
    timeSlotOverrides: TimeSlotFactoryOverrides = {},
    serviceOverrides: ServiceFactoryOverrides = {}
  ) {
    const user = UserFactory.create(userOverrides);
    const timeSlot = TimeSlotFactory.create(timeSlotOverrides);
    const service = ServiceFactory.create(serviceOverrides);

    const booking = BookingFactory.create({
      ...bookingOverrides,
      userId: user.id,
      timeSlotId: timeSlot.id,
    });

    return { booking, user, timeSlot, service };
  }
}
