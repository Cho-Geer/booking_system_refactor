import { TimeSlot } from '../../app/shared/dto/time-slot.dto';

/**
 * Factory for generating TimeSlot test data.
 * Produces frontend DTO-compatible TimeSlot objects.
 *
 * Usage:
 *   const slot = TimeSlotFactory.create();
 *   const slot = TimeSlotFactory.create({ available: false, bookedCount: 5 });
 *   const slots = TimeSlotFactory.createMany(10);
 */

export interface TimeSlotFactoryOverrides {
  id?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  bookedCount?: number;
  available?: boolean;
}

export class TimeSlotFactory {
  private static counter = 0;

  private static uid(): string {
    return `${Date.now()}-${++TimeSlotFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Generate a realistic start time string (ISO 8601 format).
   * Produces times between 09:00 and 17:00 on future dates.
   */
  private static generateStartTime(): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 30) + 1);
    const hour = 9 + Math.floor(Math.random() * 8); // 09:00 - 16:00
    const minute = Math.random() > 0.5 ? 0 : 30;
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  /**
   * Generate an end time based on start time and duration.
   */
  private static generateEndTime(startTime: string, durationMinutes: number = 60): string {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return end.toISOString();
  }

  /**
   * Create a single TimeSlot object.
   * @param overrides - Fields to override defaults
   * @returns TimeSlot DTO object
   */
  static create(overrides: TimeSlotFactoryOverrides = {}): TimeSlot {
    const uid = TimeSlotFactory.uid();
    const startTime = overrides.startTime ?? TimeSlotFactory.generateStartTime();
    const capacity = overrides.capacity ?? 5;
    const bookedCount = overrides.bookedCount ?? 0;

    return {
      id: overrides.id ?? `slot-${uid}`,
      startTime,
      endTime: overrides.endTime ?? TimeSlotFactory.generateEndTime(startTime),
      capacity,
      bookedCount,
      available: overrides.available ?? bookedCount < capacity,
    };
  }

  /**
   * Create multiple TimeSlot objects.
   * @param count - Number of time slots to generate
   * @param overrides - Fields to apply to ALL generated time slots
   * @returns Array of TimeSlot objects
   */
  static createMany(count: number, overrides: TimeSlotFactoryOverrides = {}): TimeSlot[] {
    return Array.from({ length: count }, () => TimeSlotFactory.create(overrides));
  }

  /**
   * Create a day's worth of time slots for a specific date.
   * @param date - The date to generate slots for (YYYY-MM-DD)
   * @param intervalMinutes - Interval between slots (default: 60)
   */
  static createDaySlots(date: string, intervalMinutes: number = 60): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const baseDate = new Date(`${date}T09:00:00`);

    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const startTime = new Date(baseDate);
        startTime.setHours(hour, minute, 0, 0);

        const endTime = new Date(startTime.getTime() + intervalMinutes * 60 * 1000);
        const uid = TimeSlotFactory.uid();

        slots.push({
          id: `slot-${date}-${hour}-${minute}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          capacity: 5,
          bookedCount: 0,
          available: true,
        });
      }
    }

    return slots;
  }

  /**
   * Create a fully booked time slot.
   */
  static createBookedSlot(overrides: TimeSlotFactoryOverrides = {}): TimeSlot {
    const capacity = overrides.capacity ?? 5;
    return TimeSlotFactory.create({
      ...overrides,
      bookedCount: capacity,
      available: false,
    });
  }
}
