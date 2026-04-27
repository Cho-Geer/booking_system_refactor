/**
 * Shared sleep/delay utility for use across the application.
 * Provides a Promise-based delay mechanism for retry backoff, throttling, etc.
 */

/**
 * Promise-based sleep/delay.
 *
 * @param ms - Number of milliseconds to sleep
 * @returns A promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
