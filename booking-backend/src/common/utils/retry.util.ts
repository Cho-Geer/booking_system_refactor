import { Logger } from '@nestjs/common';
import { sleep } from './sleep.util';

/**
 * Reusable retry-with-exponential-backoff utility.
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  operationName: string;
  logger?: Logger;
}

/**
 * Re-export sleep for backward compatibility.
 * New code should import directly from './sleep.util'.
 */
export { sleep } from './sleep.util';

/**
 * Determines whether an error is a transient database error.
 */
export function isTransientDbError(error: unknown): boolean {
  const err = error as Record<string, unknown>;
  return (
    err['code'] === 'P2034' ||
    (typeof err['message'] === 'string' && (err['message'] as string).includes('timeout'))
  );
}

/**
 * Executes `fn` with exponential backoff retry.
 * Stops after `maxRetries` attempts and throws the last error.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, operationName, logger } = options;
  const log = logger ?? new Logger('RetryUtil');

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error: unknown) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        log.warn(
          `${operationName} failed on attempt ${attempt + 1}/${maxRetries}, retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
  }

  log.error(`${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}
