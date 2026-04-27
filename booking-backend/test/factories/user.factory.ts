import { UserType, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Factory for generating User test data.
 * Produces Prisma-compatible `data` objects for `prisma.user.create()`.
 *
 * Usage:
 *   const data = UserFactory.create();
 *   const data = UserFactory.create({ email: 'custom@test.com' });
 *   const many = UserFactory.createMany(5);
 */

export interface UserFactoryOverrides {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  passwordHash?: string;
  userType?: UserType;
  status?: UserStatus;
  lastLoginAt?: Date;
  deviceInfo?: Record<string, unknown>;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserFactory {
  private static counter = 0;

  /** Generate a unique identifier suffix */
  private static uid(): string {
    return `${Date.now()}-${++UserFactory.counter}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Hash a string using SHA-256 with the test pepper.
   * This matches the HashService implementation in the backend.
   */
  private static hashValue(value: string): string {
    const PEPPER = 'test-pepper-for-integration-tests-only';
    return crypto.createHash('sha256').update(value + PEPPER).digest('hex');
  }

  /**
   * Create a single User data object.
   * @param overrides - Fields to override defaults
   * @returns Prisma UserCreateInput-compatible data object
   */
  static create(overrides: UserFactoryOverrides = {}) {
    const uid = UserFactory.uid();
    const email = overrides.email ?? `user-${uid}@example.com`;
    const phone = overrides.phone ?? `+1555${String(1000000 + Math.floor(Math.random() * 9000000))}`;

    return {
      name: overrides.name ?? `User ${uid}`,
      phone,
      email,
      phoneHash: this.hashValue(phone),
      emailHash: this.hashValue(email),
      passwordHash: overrides.passwordHash ?? '$2b$12$LJ3m4ys4Lk0RHBmRFr4xMOuMqBNfT8nVbV8oWqYqJ5ZmJvZqVqHmG',
      userType: overrides.userType ?? UserType.CUSTOMER,
      status: overrides.status ?? UserStatus.ACTIVE,
      lastLoginAt: overrides.lastLoginAt ?? new Date(),
      deviceInfo: overrides.deviceInfo ?? { browser: 'Chrome', os: 'Linux' },
      remarks: overrides.remarks ?? null,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...(overrides.id ? { id: overrides.id } : {}),
    };
  }

  /**
   * Create multiple User data objects.
   * @param count - Number of users to generate
   * @param overrides - Fields to apply to ALL generated users
   * @returns Array of Prisma UserCreateInput-compatible data objects
   */
  static createMany(count: number, overrides: UserFactoryOverrides = {}) {
    return Array.from({ length: count }, () => UserFactory.create(overrides));
  }
}
