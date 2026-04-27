/**
 * Factory for generating Service and ServiceCategory test data.
 * Produces Prisma-compatible data objects.
 *
 * Usage:
 *   const catData = ServiceFactory.createCategory();
 *   const svcData = ServiceFactory.create();
 *   const svcData = ServiceFactory.create({ name: 'Massage', categoryId: catData.id });
 *   const many = ServiceFactory.createMany(5);
 */

export interface CategoryFactoryOverrides {
  id?: string;
  name?: string;
  description?: string;
  iconUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ServiceFactoryOverrides {
  id?: string;
  categoryId?: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number | string;
  imageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ServiceCategoryFactory {
  private static counter = 0;

  private static uid(): string {
    return `${Date.now()}-${++ServiceCategoryFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  static create(overrides: CategoryFactoryOverrides = {}) {
    const uid = ServiceCategoryFactory.uid();

    return {
      name: overrides.name ?? `Category ${uid}`,
      description: overrides.description ?? `Test category for ${uid}`,
      iconUrl: overrides.iconUrl ?? null,
      isActive: overrides.isActive ?? true,
      displayOrder: overrides.displayOrder ?? 0,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...(overrides.id ? { id: overrides.id } : {}),
    };
  }

  static createMany(count: number, overrides: CategoryFactoryOverrides = {}) {
    return Array.from({ length: count }, () => ServiceCategoryFactory.create(overrides));
  }
}

export class ServiceFactory {
  private static counter = 0;
  private static lastCategoryId: string | null = null;

  private static uid(): string {
    return `${Date.now()}-${++ServiceFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Create a single Service data object.
   * @param overrides - Fields to override defaults. If no categoryId is provided,
   *                    one will be auto-generated via ServiceCategoryFactory.
   * @returns Prisma ServiceCreateInput-compatible data object
   */
  static create(overrides: ServiceFactoryOverrides = {}) {
    const uid = ServiceFactory.uid();
    const categoryId = overrides.categoryId ?? ServiceFactory.lastCategoryId ?? ServiceCategoryFactory.create().id;
    ServiceFactory.lastCategoryId = categoryId ?? null;

    return {
      categoryId,
      name: overrides.name ?? `Service ${uid}`,
      description: overrides.description ?? `Test service for ${uid}`,
      durationMinutes: overrides.durationMinutes ?? 60,
      price: overrides.price ?? 49.99,
      imageUrl: overrides.imageUrl ?? null,
      isActive: overrides.isActive ?? true,
      displayOrder: overrides.displayOrder ?? 0,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...(overrides.id ? { id: overrides.id } : {}),
    };
  }

  /**
   * Create multiple Service data objects.
   * @param count - Number of services to generate
   * @param overrides - Fields to apply to ALL generated services
   * @returns Array of Prisma ServiceCreateInput-compatible data objects
   */
  static createMany(count: number, overrides: ServiceFactoryOverrides = {}) {
    return Array.from({ length: count }, () => ServiceFactory.create(overrides));
  }
}
