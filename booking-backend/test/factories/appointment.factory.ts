import { AppointmentStatus } from '@prisma/client';
import { UserFactory, type UserFactoryOverrides } from './user.factory';
import {
  ServiceFactory,
  ServiceCategoryFactory,
  type ServiceFactoryOverrides,
} from './service.factory';
import { TimeSlotFactory, type TimeSlotFactoryOverrides } from './time-slot.factory';

/**
 * Factory for generating Appointment test data.
 * Produces Prisma-compatible data objects with auto-generated dependencies.
 *
 * Usage:
 *   const aptData = AppointmentFactory.create();
 *   const aptData = AppointmentFactory.create({ status: AppointmentStatus.CONFIRMED });
 *   const many = AppointmentFactory.createMany(5);
 */

export interface AppointmentFactoryOverrides {
  id?: string;
  userId?: string;
  timeSlotId?: string;
  serviceId?: string;
  appointmentNumber?: string;
  appointmentDate?: Date;
  slotSequence?: number;
  status?: AppointmentStatus;
  customerInfo?: Record<string, unknown>;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Pre-built dependencies for batch creation */
export interface AppointmentDependencies {
  userId: string;
  timeSlotId: string;
  serviceId: string;
}

export class AppointmentFactory {
  private static counter = 0;

  private static uid(): string {
    return `${Date.now()}-${++AppointmentFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Generate a deterministic appointment number.
   */
  private static generateAppointmentNumber(): string {
    const seq = String(++AppointmentFactory.counter).padStart(4, '0');
    return `APT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${seq}`;
  }

  /**
   * Create shared dependencies for batch appointment creation.
   * This ensures all appointments in a batch share the same user/service/timeslot
   * unless explicitly overridden per-item.
   */
  static createSharedDependencies(
    userOverrides: UserFactoryOverrides = {},
    serviceOverrides: ServiceFactoryOverrides = {},
    timeSlotOverrides: TimeSlotFactoryOverrides = {},
  ): AppointmentDependencies {
    const categoryData = ServiceCategoryFactory.create();
    const serviceData = ServiceFactory.create({ ...serviceOverrides, categoryId: categoryData.id });
    const timeSlotData = TimeSlotFactory.create({
      ...timeSlotOverrides,
      serviceId: serviceData.id,
    });
    const userData = UserFactory.create(userOverrides);

    return {
      userId: userData.id ?? `user-${AppointmentFactory.counter}`,
      serviceId: serviceData.id ?? `svc-${AppointmentFactory.counter}`,
      timeSlotId: timeSlotData.id ?? `slot-${AppointmentFactory.counter}`,
    };
  }

  /**
   * Create a single Appointment data object.
   * @param overrides - Fields to override defaults. If foreign keys are not
   *                    provided, new dependent entities will be auto-generated.
   * @returns Prisma AppointmentCreateInput-compatible data object
   */
  static create(overrides: AppointmentFactoryOverrides = {}) {
    const uid = AppointmentFactory.uid();
    const serviceId = overrides.serviceId ?? `svc-${uid}`;
    const timeSlotId = overrides.timeSlotId ?? `slot-${uid}`;
    const userId = overrides.userId ?? `user-${uid}`;

    // Generate a future appointment date by default
    const appointmentDate =
      overrides.appointmentDate ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + Math.floor(Math.random() * 30) + 1);
        d.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
        return d;
      })();

    return {
      userId,
      timeSlotId,
      serviceId,
      appointmentNumber:
        overrides.appointmentNumber ?? AppointmentFactory.generateAppointmentNumber(),
      appointmentDate,
      slotSequence: overrides.slotSequence ?? 1,
      status: overrides.status ?? AppointmentStatus.PENDING,
      customerInfo: overrides.customerInfo ?? {
        name: `Customer ${uid}`,
        email: `customer-${uid}@example.com`,
        phone: `+1555${String(1000000 + Math.floor(Math.random() * 9000000))}`,
      },
      remarks: overrides.remarks ?? null,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...(overrides.id ? { id: overrides.id } : {}),
    };
  }

  /**
   * Create multiple Appointment data objects.
   * When sharedDeps is provided, all appointments share the same foreign keys.
   * When omitted, each appointment gets unique auto-generated foreign keys.
   *
   * @param count - Number of appointments to generate
   * @param overrides - Fields to apply to ALL generated appointments
   * @param sharedDeps - Optional shared foreign keys for all appointments
   * @returns Array of Prisma AppointmentCreateInput-compatible data objects
   */
  static createMany(
    count: number,
    overrides: AppointmentFactoryOverrides = {},
    sharedDeps?: AppointmentDependencies,
  ) {
    return Array.from({ length: count }, () =>
      AppointmentFactory.create({
        userId: sharedDeps?.userId ?? overrides.userId,
        timeSlotId: sharedDeps?.timeSlotId ?? overrides.timeSlotId,
        serviceId: sharedDeps?.serviceId ?? overrides.serviceId,
        ...overrides,
      }),
    );
  }
}
