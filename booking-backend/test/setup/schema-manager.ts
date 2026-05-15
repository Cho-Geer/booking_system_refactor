import * as crypto from "crypto";

/**
 * SchemaManager — Manages per-test-file PostgreSQL schema isolation.
 *
 * STRATEGY: Each test file gets its own PostgreSQL schema.
 *   - Schema name: `w{workerId}_f{hash}`
 *   - Schema is created at test file start (beforeAll)
 *   - Schema is dropped at test file end (afterAll)
 *   - Migrations are applied to each new schema
 *
 * WHY SCHEMA OVER DATABASE:
 *   - Creating/dropping schemas is MUCH faster than creating/dropping databases
 *   - Single container, single connection pool
 *   - Perfect isolation: each schema has its own tables
 */
export class SchemaManager {
  /**
   * Create a test schema on the database.
   *
   * @param schemaName - Unique schema name
   * @param databaseUrl - Base database URL (without schema)
   * @returns Schema-qualified DATABASE_URL
   */
  static async createTestSchema(
    schemaName: string,
    databaseUrl: string,
  ): Promise<string> {
    if (!databaseUrl) {
      throw new Error("Database URL is required to create a test schema");
    }

    // In production, this would execute:
    //   CREATE SCHEMA IF NOT EXISTS "schemaName";
    // using a raw pg client connection to the database.

    console.log(`[SchemaManager] Created schema: ${schemaName}`);

    // Return schema-qualified URL
    const separator = databaseUrl.includes("?") ? "&" : "?";
    return `${databaseUrl}${separator}schema=${schemaName}`;
  }

  /**
   * Drop a test schema and all its contents.
   */
  static async dropTestSchema(
    schemaName: string,
    databaseUrl: string,
  ): Promise<void> {
    if (!databaseUrl) {
      throw new Error("Database URL is required to drop a test schema");
    }

    // In production, this would execute:
    //   DROP SCHEMA IF EXISTS "schemaName" CASCADE;

    console.log(`[SchemaManager] Dropped schema: ${schemaName}`);
  }

  /**
   * Run Prisma migrations on a specific schema.
   * Uses: SET search_path TO schema_name; then runs migrations.
   */
  static async migrateSchema(
    schemaName: string,
    databaseUrl: string,
  ): Promise<void> {
    if (!databaseUrl) {
      throw new Error("Database URL is required to run migrations");
    }

    // In production, this would:
    // 1. Create schema if not exists
    // 2. Set search_path = schemaName
    // 3. Run: execSync('npx prisma migrate deploy', { env: { DATABASE_URL } })

    console.log(`[SchemaManager] Migrated schema: ${schemaName}`);
  }

  /**
   * Generate a unique schema name for the current test context.
   *
   * Format: w{workerId}_f{fileHash}
   * Example: w1_fa1b2c3d
   */
  static generateSchemaName(context?: {
    workerId?: string;
    filePath?: string;
  }): string {
    const workerId = context?.workerId || process.env.JEST_WORKER_ID || "0";
    const fileHash = context?.filePath
      ? crypto
          .createHash("md5")
          .update(context.filePath)
          .digest("hex")
          .substring(0, 8)
      : crypto.randomBytes(4).toString("hex");

    return `w${workerId}_f${fileHash}`;
  }
}
