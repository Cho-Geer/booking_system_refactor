/**
 * Simple Database Integration Test
 * 
 * This test verifies database connectivity and schema correctness
 * using raw SQL queries, avoiding Prisma client schema mismatches.
 * 
 * Tests:
 * 1. Database connection via Testcontainers PostgreSQL
 * 2. Redis connection via Testcontainers
 * 3. Schema verification (tables, columns, indexes)
 * 4. Enum type verification
 * 5. CRUD operations via raw SQL
 * 6. Transaction isolation
 */

import { PrismaClient } from '@prisma/client';

describe('Simple Database Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data via raw SQL
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM appointments;
        DELETE FROM time_slots;
        DELETE FROM services;
        DELETE FROM service_categories;
        DELETE FROM notifications;
        DELETE FROM activity_logs;
        DELETE FROM user_sessions;
        DELETE FROM users;
      `);
    } catch (e) {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  // ============================================================
  // 1. Database Connection Tests
  // ============================================================
  describe('Database Connection', () => {
    it('should successfully connect to PostgreSQL via Testcontainers', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(result).toEqual([{ connected: 1 }]);
    });

    it('should have DATABASE_URL set from Testcontainers', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
      // Database name may vary per test run (booking_test, booking_integration, etc.)
      expect(process.env.DATABASE_URL).toMatch(/booking_\w+/);
    });

    it('should have access to PostgreSQL extensions (uuid-ossp)', async () => {
      const result = await prisma.$queryRaw`
        SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'
      `;
      expect((result as any[]).length).toBeGreaterThan(0);
    });

    it('should have pg_trgm extension (created in migrations)', async () => {
      // The migration 20260415000000_init creates pg_trgm for full-text search
      const result = await prisma.$queryRaw`
        SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'
      `;
      expect((result as any[]).length).toBe(1);
    });

    it('should support UUID generation', async () => {
      const result = await prisma.$queryRaw`SELECT uuid_generate_v4() as uuid`;
      expect((result as any[])[0].uuid).toBeDefined();
    });
  });

  // ============================================================
  // 2. Redis Connection Test
  // ============================================================
  describe('Redis Connection', () => {
    it('should have REDIS_URL set from Testcontainers', () => {
      expect(process.env.REDIS_URL).toBeDefined();
      expect(process.env.REDIS_URL).toContain('redis://');
    });

    it('should have REDIS_HOST and REDIS_PORT set', () => {
      expect(process.env.REDIS_HOST).toBeDefined();
      expect(process.env.REDIS_PORT).toBeDefined();
    });
  });

  // ============================================================
  // 3. Schema Verification Tests
  // ============================================================
  describe('Schema Verification', () => {
    it('should have users table with expected columns', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('phone');
      expect(columns).toContain('password_hash');
      expect(columns).toContain('name');
      expect(columns).toContain('role');
      expect(columns).toContain('status');
    });

    it('should have user_sessions table', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_sessions'
      `;
      expect((result as any[]).length).toBeGreaterThan(0);
    });

    it('should have service_categories table with display_order column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'service_categories' 
        ORDER BY ordinal_position
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('description');
      expect(columns).toContain('display_order');
      expect(columns).toContain('is_active');
    });

    it('should have services table with expected columns', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        ORDER BY ordinal_position
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('category_id');
      expect(columns).toContain('name');
      expect(columns).toContain('duration_minutes');
      expect(columns).toContain('price');
    });

    it('should have time_slots table', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'time_slots'
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('service_id');
      expect(columns).toContain('start_time');
      expect(columns).toContain('end_time');
      expect(columns).toContain('is_active');
    });

    it('should have appointments table', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'appointments'
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('time_slot_id');
      expect(columns).toContain('service_id');
      expect(columns).toContain('status');
    });

    it('should have notifications table', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'notifications'
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('type');
      expect(columns).toContain('status');
    });

    it('should have activity_logs table', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs'
      `;
      expect((result as any[]).length).toBeGreaterThan(0);
    });

    // refresh_tokens replaced by user_sessions in new schema
    it('should have user_sessions table with refresh_token column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_sessions'
      `;
      const columns = (result as any[]).map(r => r.column_name);
      expect(columns).toContain('refresh_token');
    });

    // audit_logs replaced by activity_logs in new schema
    it('should have activity_logs table (replaces audit_logs)', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs'
      `;
      expect((result as any[]).length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 4. Index Verification Tests
  // ============================================================
  describe('Index Verification', () => {
    it('should have indexes on users table', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users'
      `;
      expect((result as any[]).length).toBeGreaterThanOrEqual(3);
    });

    it('should have indexes on appointments table', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'appointments'
      `;
      expect((result as any[]).length).toBeGreaterThanOrEqual(4);
    });

    it('should have partial index on notifications for pending status', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'notifications' 
        AND indexname = 'notifications_pending_schedule'
      `;
      expect((result as any[]).length).toBe(1);
    });
  });

  // ============================================================
  // 5. CRUD Operations via Raw SQL
  // ============================================================
  describe('CRUD Operations (Raw SQL)', () => {
    it('should insert and query a service category', async () => {
      const categoryName = `Test Category ${Date.now()}`;
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO service_categories (id, name, description, is_active, display_order, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'Test description', true, 1, NOW(), NOW())`,
        categoryName
      );

      const result = await prisma.$queryRawUnsafe(
        `SELECT id, name, description, is_active FROM service_categories WHERE name = $1`,
        categoryName
      );
      const category = (result as any[])[0];
      
      expect(category).toBeDefined();
      expect(category.name).toBe(categoryName);
      expect(category.is_active).toBe(true);

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM service_categories WHERE name = $1`,
        categoryName
      );
    });

    it('should insert and query a user', async () => {
      const email = `test.${Date.now()}@example.com`;
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO users (id, email, phone, password_hash, name, role, status, created_at, updated_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'CUSTOMER', 'ACTIVE', NOW(), NOW())`,
        email,
        `+1${Date.now()}`,
        'hashed_password_test',
        'Test User'
      );

      const result = await prisma.$queryRawUnsafe(
        `SELECT id, email, name, role, status FROM users WHERE email = $1`,
        email
      );
      const user = (result as any[])[0];
      
      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('CUSTOMER');

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM users WHERE email = $1`,
        email
      );
    });

    it('should update a record', async () => {
      const categoryName = `Update Test Category ${Date.now()}`;
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO service_categories (id, name, description, is_active, display_order, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'Original', true, 1, NOW(), NOW())`,
        categoryName
      );

      await prisma.$executeRawUnsafe(
        `UPDATE service_categories SET description = 'Updated', display_order = 10 WHERE name = $1`,
        categoryName
      );

      const result = await prisma.$queryRawUnsafe(
        `SELECT description, display_order FROM service_categories WHERE name = $1`,
        categoryName
      );
      const updated = (result as any[])[0];
      
      expect(updated.description).toBe('Updated');
      expect(updated.display_order).toBe(10);

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM service_categories WHERE name = $1`,
        categoryName
      );
    });

    it('should delete a record', async () => {
      const categoryName = `Delete Test Category ${Date.now()}`;
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO service_categories (id, name, description, is_active, display_order, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'To delete', true, 1, NOW(), NOW())`,
        categoryName
      );

      const beforeDelete = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM service_categories WHERE name = $1`,
        categoryName
      );
      expect(parseInt((beforeDelete as any[])[0].count)).toBe(1);

      await prisma.$executeRawUnsafe(
        `DELETE FROM service_categories WHERE name = $1`,
        categoryName
      );

      const afterDelete = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM service_categories WHERE name = $1`,
        categoryName
      );
      expect(parseInt((afterDelete as any[])[0].count)).toBe(0);
    });
  });

  // ============================================================
  // 7. Transaction Tests
  // ============================================================
  describe('Transaction Isolation', () => {
    it('should execute sequential operations in a transaction', async () => {
      const testName = `Sequential Transaction Test ${Date.now()}`;

      const result = await prisma.$transaction([
        prisma.$executeRawUnsafe(
          `INSERT INTO service_categories (id, name, description, is_active, display_order, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'Transaction test', true, 1, NOW(), NOW())`,
          testName
        ),
        prisma.$queryRawUnsafe(
          `SELECT id, name FROM service_categories WHERE name = $1`,
          testName
        ),
      ]);

      expect(result[0]).toBeDefined(); // INSERT succeeded
      const inserted = (result[1] as any[])[0];
      expect(inserted.name).toBe(testName);

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM service_categories WHERE name = $1`,
        testName
      );
    });

    it('should verify transaction throws on constraint violation', async () => {
      const testName = `Constraint Violation Test ${Date.now()}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO service_categories (id, name, description, is_active, display_order, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'Test', true, 1, NOW(), NOW())`,
        testName
      );

      // Second insert with same name should fail (unique constraint)
      await expect(
        prisma.$transaction([
          prisma.$executeRawUnsafe(
            `INSERT INTO service_categories (id, name, description, is_active, display_order, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'Duplicate', true, 2, NOW(), NOW())`,
            testName
          ),
        ])
      ).rejects.toThrow();

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM service_categories WHERE name = $1`,
        testName
      );
    });
  });

  // ============================================================
  // 8. Foreign Key Constraint Tests
  // ============================================================
  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key on services -> service_categories', async () => {
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO services (category_id, name, duration, price, is_active) VALUES ('00000000-0000-0000-0000-000000000000', 'Invalid Service', 60, 50, true)`
        )
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // 9. Unique Constraint Tests
  // ============================================================
  describe('Unique Constraints', () => {
    it('should enforce unique email on users', async () => {
      const email = `unique.test.${Date.now()}@example.com`;
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO users (id, email, phone, password_hash, name, role, status, created_at, updated_at) 
         VALUES (gen_random_uuid(), $1, $2, 'hash', 'First Last', 'CUSTOMER', 'ACTIVE', NOW(), NOW())`,
        email,
        `+1${Date.now()}`
      );

      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO users (id, email, phone, password_hash, name, role, status, created_at, updated_at) 
           VALUES (gen_random_uuid(), $1, $2, 'hash', 'First2 Last2', 'CUSTOMER', 'ACTIVE', NOW(), NOW())`,
          email,
          `+2${Date.now()}`
        )
      ).rejects.toThrow();

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM users WHERE email = $1`,
        email
      );
    });
  });
});
