/**
 * Factory for generating TimeSlot test data.
 * Produces Prisma-compatible data objects.
 *
 * Usage:
 *   const slotData = TimeSlotFactory.create();
 *   const slotData = TimeSlotFactory.create({ capacity: 10, serviceId: 'some-uuid' });
 *   const many = TimeSlotFactory.createMany(5);
 */

export interface TimeSlotFactoryOverrides {
  id?: string;
  serviceId?: string;
  slotTime?: string;
  durationMinutes?: number;
  capacity?: number;
  currentSequence?: number;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TimeSlotFactory {
  private static counter = 0;
  private static lastServiceId: string | null = null;

  private static uid(): string {
    return `${Date.now()}-${++TimeSlotFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Generate a realistic slot time string (ISO 8601 format).
   * Produces times between 09:00 and 17:00 on future dates.
   */
  private static generateSlotTime(): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 30) + 1);
    const hour = 9 + Math.floor(Math.random() * 8); // 09:00 - 16:00
    const minute = Math.random() > 0.5 ? 0 : 30;
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  /**
   * Create a single TimeSlot data object.
   * @param overrides - Fields to override defaults. If no serviceId is provided,
   *                    a placeholder ID will be generated.
   * @returns Prisma TimeSlotCreateInput-compatible data object
   */
  static create(overrides: TimeSlotFactoryOverrides = {}) {
    const uid = TimeSlotFactory.uid();
    const serviceId = overrides.serviceId ?? TimeSlotFactory.lastServiceId ?? `svc-${uid}`;
    TimeSlotFactory.lastServiceId = serviceId;

    return {
      serviceId,
      slotTime: overrides.slotTime ?? TimeSlotFactory.generateSlotTime(),
      durationMinutes: overrides.durationMinutes ?? 60,
      capacity: overrides.capacity ?? 5,
      currentSequence: overrides.currentSequence ?? 0,
      isActive: overrides.isActive ?? true,
      displayOrder: overrides.displayOrder ?? 0,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...(overrides.id ? { id: overrides.id } : {}),
    };
  }

  /**
   * Create multiple TimeSlot data objects.
   * @param count - Number of time slots to generate
   * @param overrides - Fields to apply to ALL generated time slots
   * @returns Array of Prisma TimeSlotCreateInput-compatible data objects
   */
  static createMany(count: number, overrides: TimeSlotFactoryOverrides = {}) {
    return Array.from({ length: count }, () => TimeSlotFactory.create(overrides));
  }
}
