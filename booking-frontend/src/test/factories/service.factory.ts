import { Service } from '../../app/shared/dto/service.dto';

/**
 * Factory for generating Service test data.
 * Produces frontend DTO-compatible Service objects.
 *
 * Usage:
 *   const service = ServiceFactory.create();
 *   const service = ServiceFactory.create({ name: 'Haircut', price: 25 });
 *   const services = ServiceFactory.createMany(5);
 */

export interface ServiceFactoryOverrides {
  id?: string;
  name?: string;
  description?: string;
  duration?: number;
  durationMinutes?: number;
  price?: number;
  active?: boolean;
}

export class ServiceFactory {
  private static counter = 0;

  private static uid(): string {
    return `${Date.now()}-${++ServiceFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Create a single Service object.
   * @param overrides - Fields to override defaults
   * @returns Service DTO object
   */
  static create(overrides: ServiceFactoryOverrides = {}): Service {
    const uid = ServiceFactory.uid();
    const duration = overrides.duration ?? overrides.durationMinutes ?? 60;

    return {
      id: overrides.id ?? `svc-${uid}`,
      name: overrides.name ?? `Service ${uid}`,
      description: overrides.description ?? `Test service for ${uid}`,
      duration,
      durationMinutes: duration,
      price: overrides.price ?? 49.99,
      active: overrides.active ?? true,
    };
  }

  /**
   * Create multiple Service objects.
   * @param count - Number of services to generate
   * @param overrides - Fields to apply to ALL generated services
   * @returns Array of Service objects
   */
  static createMany(count: number, overrides: ServiceFactoryOverrides = {}): Service[] {
    return Array.from({ length: count }, () => ServiceFactory.create(overrides));
  }

  /**
   * Create a list of common booking services.
   */
  static createCommonServices(): Service[] {
    return [
      ServiceFactory.create({ name: 'Haircut', durationMinutes: 30, price: 25 }),
      ServiceFactory.create({ name: 'Coloring', durationMinutes: 60, price: 50 }),
      ServiceFactory.create({ name: 'Styling', durationMinutes: 45, price: 35 }),
      ServiceFactory.create({ name: 'Treatment', durationMinutes: 90, price: 75 }),
    ];
  }
}
