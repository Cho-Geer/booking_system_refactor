import { PrismaClient } from '@prisma/client';

/**
 * General test helper utilities
 */

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; label?: string } = {},
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, label = 'operation' } = options;

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[retry] ${label} failed (attempt ${attempt}/${maxRetries}):`,
        lastError.message,
      );
      if (attempt < maxRetries) {
        await sleep(delayMs * attempt);
      }
    }
  }
  throw lastError ?? new Error(`Unknown error during ${label}`);
}

/**
 * Generate a unique test identifier
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}@example.com`;
}

/**
 * Generate a unique test phone number
 */
export function generateTestPhone(): string {
  return `+1${Date.now().toString().slice(-10)}`;
}

/**
 * Create a Prisma client with a custom database URL
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

/**
 * Deep partial type for test data overrides
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends (infer U)[]
        ? DeepPartial<U>[]
        : T[P] extends ReadonlyArray<infer U>
          ? ReadonlyArray<DeepPartial<U>>
          : DeepPartial<T[P]>;
    }
  : T;
