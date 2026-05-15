import { existsSync, unlinkSync } from "fs";

import { join } from "path";

// Type declarations for global container references

declare global {
  // eslint-disable-next-line no-var

  var __POSTGRES_CONTAINER__: import("@testcontainers/postgresql").StartedPostgreSqlContainer;

  // eslint-disable-next-line no-var

  var __REDIS_CONTAINER__: import("@testcontainers/redis").StartedRedisContainer;
}

/**

 * Global Jest teardown that stops all testcontainers.

 * Uses try/finally to ensure containers are stopped even if tests fail.

 */

module.exports = async () => {
  console.log("[GlobalTeardown] Starting testcontainers teardown...");

  try {
    // Stop PostgreSQL container

    if (global.__POSTGRES_CONTAINER__) {
      console.log("[GlobalTeardown] Stopping PostgreSQL container...");

      try {
        await global.__POSTGRES_CONTAINER__.stop();

        console.log("[GlobalTeardown] PostgreSQL container stopped");
      } catch (error) {
        console.error(
          "[GlobalTeardown] Error stopping PostgreSQL container:",

          error instanceof Error ? error.message : error,
        );
      }
    }

    // Stop Redis container

    if (global.__REDIS_CONTAINER__) {
      console.log("[GlobalTeardown] Stopping Redis container...");

      try {
        await global.__REDIS_CONTAINER__.stop();

        console.log("[GlobalTeardown] Redis container stopped");
      } catch (error) {
        console.error(
          "[GlobalTeardown] Error stopping Redis container:",

          error instanceof Error ? error.message : error,
        );
      }
    }
  } finally {
    // Clean up test environment file

    const envFile = join(__dirname, "..", "..", ".env.test");

    if (existsSync(envFile)) {
      try {
        unlinkSync(envFile);

        console.log("[GlobalTeardown] .env.test file cleaned up");
      } catch (error) {
        console.error(
          "[GlobalTeardown] Error cleaning up .env.test:",

          error instanceof Error ? error.message : error,
        );
      }
    }

    // NOTE: Coverage directory cleanup commented out to preserve coverage reports.

    // Coverage reports are needed for CI/CD quality gates and local analysis.

    // Manually clean up 'coverage/' directory when needed.

    // const coverageDir = join(__dirname, '..', '..', 'coverage');

    // if (existsSync(coverageDir)) {

    //   try {

    //     rmSync(coverageDir, { recursive: true, force: true });

    //     console.log('[GlobalTeardown] Coverage directory cleaned up');

    //   } catch (error) {

    //     console.error(

    //       '[GlobalTeardown] Error cleaning up coverage directory:',

    //       error instanceof Error ? error.message : error

    //     );

    //   }

    // }

    console.log("[GlobalTeardown] Testcontainers teardown completed");
  }
};
