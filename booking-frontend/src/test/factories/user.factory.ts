import { User, UserRole } from '../../app/shared/dto/user.dto';

/**
 * Factory for generating User test data.
 * Produces frontend DTO-compatible User objects.
 *
 * Usage:
 *   const user = UserFactory.create();
 *   const user = UserFactory.create({ email: 'admin@test.com', role: UserRole.ADMIN });
 *   const users = UserFactory.createMany(5);
 */

export interface UserFactoryOverrides {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  createdAt?: string;
}

export class UserFactory {
  private static counter = 0;

  private static uid(): string {
    return `${Date.now()}-${++UserFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Create a single User object.
   * @param overrides - Fields to override defaults
   * @returns User DTO object
   */
  static create(overrides: UserFactoryOverrides = {}): User {
    const uid = UserFactory.uid();

    return {
      id: overrides.id ?? `user-${uid}`,
      email: overrides.email ?? `user-${uid}@example.com`,
      name: overrides.name ?? `User ${uid}`,
      role: overrides.role ?? UserRole.USER,
      createdAt: overrides.createdAt ?? new Date().toISOString(),
    };
  }

  /**
   * Create multiple User objects.
   * @param count - Number of users to generate
   * @param overrides - Fields to apply to ALL generated users
   * @returns Array of User objects
   */
  static createMany(count: number, overrides: UserFactoryOverrides = {}): User[] {
    return Array.from({ length: count }, () => UserFactory.create(overrides));
  }

  /**
   * Create a mock LoginResponse object.
   */
  static createLoginResponse(overrides: {
    accessToken?: string;
    refreshToken?: string;
    user?: User;
  } = {}) {
    return {
      accessToken: overrides.accessToken ?? 'mock-access-token-xyz',
      refreshToken: overrides.refreshToken ?? 'mock-refresh-token-xyz',
      user: overrides.user ?? UserFactory.create(),
    };
  }

  /**
   * Create a mock admin user.
   */
  static createAdmin(overrides: UserFactoryOverrides = {}): User {
    return UserFactory.create({
      ...overrides,
      role: UserRole.ADMIN,
      name: overrides.name ?? `Admin ${UserFactory.counter}`,
    });
  }
}
