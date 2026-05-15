/**
 * TranslationDictionary Model Tests — RED PHASE
 *
 * Purpose: These tests validate the TranslationDictionary Prisma model
 * as specified in cross-doc-consistency-and-i18n-plan.md §2.1.
 *
 * RED phase: The model does NOT exist in prisma/schema.prisma yet,
 * so ALL tests MUST FAIL with clear errors proving the model is absent.
 *
 * The expected model:
 *   model TranslationDictionary {
 *     id        String   @id @default(uuid())
 *     domain    String
 *     key       String
 *     locale    String   @default("en")
 *     value     String
 *     isCustom  Boolean  @default(false)
 *     tenantId  String?
 *     createdAt DateTime @default(now())
 *     updatedAt DateTime @updatedAt
 *
 *     @@unique([domain, key, locale, tenantId])
 *     @@index([domain, key])
 *     @@index([locale])
 *   }
 */

import { PrismaClient } from '@prisma/client';

describe('TranslationDictionary Model (RED phase — model does not exist)', () => {
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
    await prisma.$disconnect();
  });

  // ============================================================
  // 1. Table Existence
  // ============================================================
  describe('1. Table Existence', () => {
    it('should have translation_dictionaries table (will FAIL — model not created)', async () => {
      const result = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'translation_dictionaries'
      `;
      // This will fail because the table doesn't exist (array is empty)
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].table_name).toBe('translation_dictionaries');
    });
  });

  // ============================================================
  // 2. Column Verification
  // ============================================================
  describe('2. Column Verification', () => {
    it('should have id column (UUID, primary key)', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'id'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].column_name).toBe('id');
    });

    it('should have domain column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'domain'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have key column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'key'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have locale column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'locale'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have value column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'value'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have is_custom column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'is_custom'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have tenant_id column (nullable)', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'tenant_id'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].is_nullable).toBe('YES');
    });

    it('should have created_at column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'created_at'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have updated_at column', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'updated_at'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
    });

    it('should have all 9 expected columns', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
        ORDER BY ordinal_position
      `;
      // Will fail — table doesn't exist
      const columns = (result as any[]).map((r: any) => r.column_name);
      expect(columns).toEqual([
        'id',
        'domain',
        'key',
        'locale',
        'value',
        'is_custom',
        'tenant_id',
        'created_at',
        'updated_at',
      ]);
    });
  });

  // ============================================================
  // 3. Default Value Verification
  // ============================================================
  describe('3. Default Values', () => {
    it('should have locale default to en', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'locale'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].column_default).toContain('en');
    });

    it('should have is_custom default to false', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'is_custom'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      const defaultVal = (result as any[])[0].column_default;
      expect(['false', '0']).toContain(defaultVal);
    });

    it('should have id default to uuid generation', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'id'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].column_default).toContain('uuid');
    });

    it('should have created_at default to now()', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'created_at'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].column_default).toContain('now');
    });
  });

  // ============================================================
  // 4. Unique Constraint Verification
  // ============================================================
  describe('4. Unique Constraints', () => {
    it('should have unique constraint on (domain, key, locale, tenant_id)', async () => {
      const result = await prisma.$queryRaw`
        SELECT tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'translation_dictionaries'
          AND tc.constraint_type = 'UNIQUE'
        GROUP BY tc.constraint_name, tc.constraint_type
        HAVING COUNT(kcu.column_name) = 4
      `;
      // Will fail — table/constraint doesn't exist
      expect((result as any[]).length).toBeGreaterThanOrEqual(1);
    });

    it('should enforce unique constraint violation on duplicate entries', async () => {
      // Insert first record with explicit tenant_id (should succeed)
      await prisma.$executeRawUnsafe(
        `INSERT INTO translation_dictionaries (id, domain, key, locale, value, is_custom, tenant_id, created_at, updated_at)
         VALUES (gen_random_uuid(), 'test', 'test.key.dup', 'en', 'value1', false, 'tenant-1', NOW(), NOW())`,
      );

      // Attempt to insert duplicate domain+key+locale+tenantId — should fail
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO translation_dictionaries (id, domain, key, locale, value, is_custom, tenant_id, created_at, updated_at)
           VALUES (gen_random_uuid(), 'test', 'test.key.dup', 'en', 'value2', false, 'tenant-1', NOW(), NOW())`,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // 5. Index Verification
  // ============================================================
  describe('5. Index Verification', () => {
    it('should have index on [domain, key]', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'translation_dictionaries'
          AND indexdef LIKE '%domain%key%'
      `;
      // Will fail — table/index doesn't exist
      expect((result as any[]).length).toBeGreaterThanOrEqual(1);
    });

    it('should have index on [locale]', async () => {
      const result = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'translation_dictionaries'
          AND indexdef LIKE '%locale%'
      `;
      // Will fail — table/index doesn't exist
      expect((result as any[]).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // 6. Data Type Verification
  // ============================================================
  describe('6. Data Type Verification', () => {
    it('id should be of UUID type', async () => {
      const result = await prisma.$queryRaw`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'id'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].data_type).toBe('uuid');
    });

    it('is_custom should be boolean type', async () => {
      const result = await prisma.$queryRaw`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'is_custom'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect(['boolean', 'bool']).toContain((result as any[])[0].data_type);
    });

    it('tenant_id should be nullable', async () => {
      const result = await prisma.$queryRaw`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name = 'tenant_id'
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(1);
      expect((result as any[])[0].is_nullable).toBe('YES');
    });

    it('created_at and updated_at should be timestamp type', async () => {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'translation_dictionaries'
          AND column_name IN ('created_at', 'updated_at')
        ORDER BY column_name
      `;
      // Will fail — table doesn't exist
      expect((result as any[]).length).toBe(2);
      (result as any[]).forEach((row: any) => {
        expect(['timestamp with time zone', 'timestamp without time zone', 'timestamp']).toContain(
          row.data_type,
        );
      });
    });
  });

  // ============================================================
  // 7. CRUD Operations (via raw SQL — Prisma client incompatible)
  // ============================================================
  describe('7. CRUD Operations via Raw SQL', () => {
    it('should INSERT a translation dictionary record', async () => {
      // Will fail — table doesn't exist
      const result = await prisma.$executeRawUnsafe(
        `INSERT INTO translation_dictionaries (id, domain, key, locale, value, is_custom, created_at, updated_at)
         VALUES (gen_random_uuid(), 'global', 'save_button', 'en', 'Save', false, NOW(), NOW())`,
      );
      expect(result).toBe(1);
    });

    it('should SELECT a translation dictionary record', async () => {
      // Will fail — table doesn't exist
      const result = await prisma.$queryRawUnsafe(
        `SELECT id, domain, key, locale, value, is_custom FROM translation_dictionaries WHERE domain = $1 AND key = $2`,
        'global',
        'save_button',
      );
      expect((result as any[]).length).toBeGreaterThan(0);
    });

    it('should UPDATE a translation dictionary record', async () => {
      // Will fail — table doesn't exist
      await prisma.$executeRawUnsafe(
        `UPDATE translation_dictionaries SET value = $1 WHERE domain = $2 AND key = $3`,
        'Speichern',
        'global',
        'save_button',
      );

      const result = await prisma.$queryRawUnsafe(
        `SELECT value FROM translation_dictionaries WHERE domain = $1 AND key = $2`,
        'global',
        'save_button',
      );
      expect((result as any[])[0].value).toBe('Speichern');
    });

    it('should DELETE a translation dictionary record', async () => {
      // Will fail — table doesn't exist
      await prisma.$executeRawUnsafe(
        `DELETE FROM translation_dictionaries WHERE domain = $1 AND key = $2`,
        'global',
        'save_button',
      );

      const result = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM translation_dictionaries WHERE domain = $1 AND key = $2`,
        'global',
        'save_button',
      );
      expect(parseInt((result as any[])[0].count)).toBe(0);
    });
  });

  // ============================================================
  // 8. Tenant Isolation Test
  // ============================================================
  describe('8. Tenant Isolation', () => {
    it('should allow same domain+key+locale for different tenantId', async () => {
      // Will fail — table doesn't exist
      await prisma.$executeRawUnsafe(
        `INSERT INTO translation_dictionaries (id, domain, key, locale, value, is_custom, tenant_id, created_at, updated_at)
         VALUES (gen_random_uuid(), 'global', 'title', 'en', 'Default Title', false, NULL, NOW(), NOW())`,
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO translation_dictionaries (id, domain, key, locale, value, is_custom, tenant_id, created_at, updated_at)
         VALUES (gen_random_uuid(), 'global', 'title', 'en', 'Tenant A Title', true, 'tenant-a', NOW(), NOW())`,
      );

      // Both should exist — different tenant_id -> different unique constraint scope
      // But table doesn't exist so this will fail first
      const result = await prisma.$queryRawUnsafe(
        `SELECT value, tenant_id FROM translation_dictionaries
         WHERE domain = 'global' AND key = 'title' AND locale = 'en'
         ORDER BY tenant_id NULLS FIRST`,
      );
      expect((result as any[]).length).toBe(2);
    });
  });

  // ============================================================
  // 9. Non-nullable Constraint Verification
  // ============================================================
  describe('9. Non-nullable Constraints', () => {
    it('should reject INSERT with NULL domain', async () => {
      // Will fail — table doesn't exist (or domain constraint violation)
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO translation_dictionaries (id, domain, key, locale, value, created_at, updated_at)
           VALUES (gen_random_uuid(), NULL, 'test.key', 'en', 'value', NOW(), NOW())`,
        ),
      ).rejects.toThrow();
    });

    it('should reject INSERT with NULL key', async () => {
      // Will fail — table doesn't exist (or key constraint violation)
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO translation_dictionaries (id, domain, key, locale, value, created_at, updated_at)
           VALUES (gen_random_uuid(), 'test', NULL, 'en', 'value', NOW(), NOW())`,
        ),
      ).rejects.toThrow();
    });

    it('should reject INSERT with NULL value', async () => {
      // Will fail — table doesn't exist (or value constraint violation)
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO translation_dictionaries (id, domain, key, locale, value, created_at, updated_at)
           VALUES (gen_random_uuid(), 'test', 'test.key', 'en', NULL, NOW(), NOW())`,
        ),
      ).rejects.toThrow();
    });
  });
});
