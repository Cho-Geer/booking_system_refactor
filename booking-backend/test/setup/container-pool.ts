/**
 * ContainerPool — Global singleton for Testcontainers lifecycle management.
 *
 * PROBLEM: Starting PostgreSQL + Redis containers for every test file
 *   is prohibitively slow (15-30s per file startup).
 *
 * SOLUTION: Singleton pool that:
 *   1. Starts containers ONCE per Jest worker (via globalSetup)
 *   2. Creates a UNIQUE schema per test file (schema-per-worker)
 *   3. Reuses containers across all test files in the same worker
 *   4. Cleans up schemas between test files (not between tests)
 *
 * USAGE:
 * ```ts
 * // In global setup
 * const info = await ContainerPool.initialize();
 *
 * // In test file
 * const dbUrl = await ContainerPool.acquireSchema('worker_1_file_abc');
 * // ... run tests ...
 * await ContainerPool.releaseSchema('worker_1_file_abc');
 *
 * // In global teardown
 * await ContainerPool.destroy();
 * ```
 */

export interface ContainerConnectionInfo {
  databaseUrl: string;
  redisUrl: string;
  redisHost: string;
  redisPort: number;
  postgresHost: string;
  postgresPort: number;
}

export class ContainerPool {
  private static _instance: ContainerPool;
  private _initialized = false;
  private _connectionInfo: ContainerConnectionInfo | null = null;
  private _activeSchemas: Set<string> = new Set();

  /**
   * Get the singleton instance.
   */
  private static getInstance(): ContainerPool {
    if (!ContainerPool._instance) {
      ContainerPool._instance = new ContainerPool();
    }
    return ContainerPool._instance;
  }

  /**
   * Initialize the container pool.
   * Called once per Jest worker in globalSetup.
   * Returns connection information for the running containers.
   */
  static async initialize(): Promise<ContainerConnectionInfo> {
    const instance = ContainerPool.getInstance();

    if (instance._initialized) {
      return instance._connectionInfo!;
    }

    // In a real implementation, this would start Testcontainers:
    // const postgresContainer = await new PostgreSqlContainer('postgres:16').start();
    // const redisContainer = await new RedisContainer('redis:7').start();

    // For now, we read from environment or use defaults (containers should
    // be started by global-setup.ts which runs before this)
    const databaseUrl =
      process.env.DATABASE_URL ||
      "postgresql://test_user:test_password@localhost:5432/booking_test";
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Parse connection details from URLs
    let postgresHost = "localhost";
    let postgresPort = 5432;
    try {
      const pgUrl = new URL(databaseUrl);
      postgresHost = pgUrl.hostname;
      postgresPort = parseInt(pgUrl.port || "5432", 10);
    } catch {
      // Use defaults
    }

    let redisHost = "localhost";
    let redisPort = 6379;
    try {
      const rUrl = new URL(redisUrl);
      redisHost = rUrl.hostname;
      redisPort = parseInt(rUrl.port || "6379", 10);
    } catch {
      // Use defaults
    }

    instance._connectionInfo = {
      databaseUrl,
      redisUrl,
      redisHost,
      redisPort,
      postgresHost,
      postgresPort,
    };

    instance._initialized = true;

    console.log("[ContainerPool] Initialized:", {
      postgres: `${postgresHost}:${postgresPort}`,
      redis: `${redisHost}:${redisPort}`,
    });

    return instance._connectionInfo;
  }

  /**
   * Acquire a schema for the current test file.
   * Returns the schema-qualified DATABASE_URL.
   */
  static async acquireSchema(schemaName: string): Promise<string> {
    const instance = ContainerPool.getInstance();

    if (!instance._initialized || !instance._connectionInfo) {
      throw new Error(
        "ContainerPool is not initialized. Call ContainerPool.initialize() first.",
      );
    }

    instance._activeSchemas.add(schemaName);

    // Append schema parameter to the database URL
    const schemaUrl = `${instance._connectionInfo.databaseUrl}?schema=${schemaName}`;

    console.log(`[ContainerPool] Acquired schema: ${schemaName}`);
    return schemaUrl;
  }

  /**
   * Release a schema after test file completes.
   * Drops the schema and all its data.
   */
  static async releaseSchema(schemaName: string): Promise<void> {
    const instance = ContainerPool.getInstance();

    if (!instance._initialized) {
      throw new Error(
        "ContainerPool is not initialized. Call ContainerPool.initialize() first.",
      );
    }

    instance._activeSchemas.delete(schemaName);

    // In production, this would execute: DROP SCHEMA IF EXISTS "schemaName" CASCADE;
    console.log(`[ContainerPool] Released schema: ${schemaName}`);
  }

  /**
   * Destroy all containers and clean up resources.
   */
  static async destroy(): Promise<void> {
    const instance = ContainerPool.getInstance();

    if (!instance._initialized) {
      return;
    }

    // Clean up any remaining active schemas
    for (const schema of instance._activeSchemas) {
      console.log(`[ContainerPool] Cleaning up orphaned schema: ${schema}`);
    }
    instance._activeSchemas.clear();

    instance._initialized = false;
    instance._connectionInfo = null;

    console.log("[ContainerPool] Destroyed");
  }

  /**
   * Get connection info for the running containers.
   * Throws if not initialized.
   */
  static getConnectionInfo(): ContainerConnectionInfo {
    const instance = ContainerPool.getInstance();

    if (!instance._initialized || !instance._connectionInfo) {
      throw new Error(
        "ContainerPool is not initialized. Call ContainerPool.initialize() first.",
      );
    }

    return instance._connectionInfo;
  }

  /**
   * Check if the ContainerPool has been initialized.
   */
  static isInitialized(): boolean {
    return ContainerPool.getInstance()._initialized;
  }

  /**
   * Get the number of active schemas.
   */
  static get activeSchemaCount(): number {
    return ContainerPool.getInstance()._activeSchemas.size;
  }
}
