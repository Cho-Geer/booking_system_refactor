import { config } from 'dotenv';

// Load .env.test first if it exists (created by global-setup.ts)
const envTestPath = require('path').join(__dirname, '..', '..', '.env.test');
config({ path: envTestPath });

// Fallback to .env
config({ path: require('path').join(__dirname, '..', '..', '.env') });

// Set Jest timeout for integration tests (container startup takes time)
jest.setTimeout(30000);

/**
 * Test environment utilities
 */

/**
 * Get the test database URL from environment
 */
export function getTestDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Ensure global-setup.ts has run and created .env.test',
    );
  }
  return databaseUrl;
}

/**
 * Get the test Redis URL from environment
 */
export function getTestRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

/**
 * Check if we're running in integration test mode
 * (i.e., global-setup has run and containers are available)
 */
export function isIntegrationMode(): boolean {
  return process.env.NODE_ENV === 'test' && !!process.env.DATABASE_URL;
}

/**
 * Suppress console output during tests (optional utility)
 */
export function suppressConsole(): jest.SpyInstance[] {
  const methods: Array<'log' | 'debug' | 'info' | 'warn'> = ['log', 'debug', 'info', 'warn'];
  return methods.map((method) => jest.spyOn(console, method).mockImplementation());
}

/**
 * Restore console spies
 */
export function restoreConsole(spies: jest.SpyInstance[]): void {
  spies.forEach((spy) => spy.mockRestore());
}
