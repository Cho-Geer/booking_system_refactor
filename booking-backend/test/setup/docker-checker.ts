import { execSync } from "child_process";

/**
 * Docker availability checker with caching.
 *
 * Strategy:
 * 1. Check DOCKER_HOST or DOCKER_SOCKET environment variables
 * 2. Attempt `docker info` command
 * 3. If either succeeds → Docker is available
 * 4. Cache the result for the process lifetime (no re-checks)
 *
 * CI behavior: If CI=true and Docker not found, logs warning but still returns false
 * (doesn't throw — the calling code handles the fallback).
 */

let dockerAvailableCache: boolean | null = null;

/**
 * Check if Docker is available on this machine.
 * Results are cached for the lifetime of the process.
 */
export function checkDockerAvailable(): boolean {
  if (dockerAvailableCache !== null) {
    return dockerAvailableCache;
  }

  // CI environment: Docker is required
  if (process.env.CI === "true") {
    try {
      execSync("docker info", { stdio: "ignore", timeout: 5000 });
      dockerAvailableCache = true;
      return true;
    } catch {
      console.warn(
        "[DockerChecker] CI environment detected but Docker is not available. " +
          "Falling back to fake infrastructure.",
      );
      dockerAvailableCache = false;
      return false;
    }
  }

  // Local development: gracefully degrade to fakes
  try {
    execSync("docker info", { stdio: "ignore", timeout: 2000 });
    dockerAvailableCache = true;
    return true;
  } catch {
    console.warn(
      "[DockerChecker] Docker not available. Using Fake infrastructure for tests. " +
        "Integration tests will be skipped. Run with Docker to enable full integration testing.",
    );
    dockerAvailableCache = false;
    return false;
  }
}

/**
 * Reset the Docker availability cache (for testing).
 */
export function resetDockerCache(): void {
  dockerAvailableCache = null;
}
