/**
 * Translation Seed Data Integration Tests — GREEN PHASE
 *
 * Purpose: Verify the translation seed function inserts ~450 default English
 * records into the TranslationDictionary table, covering all required domains,
 * valid key formats, unique constraints, and idempotency.
 *
 * References:
 *   - cross-doc-consistency-and-i18n-plan.md §2.1 (Data Model), §3.3 (Seed data)
 *   - prisma/schema.prisma lines 401-416 (TranslationDictionary model)
 *
 * RED PHASE: The seed function does NOT exist yet.
 * Importing from @modules/translations/translations-seed.service will FAIL
 * with a TypeScript compilation error (module not found).
 *
 * Expected RED failure: "Cannot find module '@modules/translations/translations-seed.service'"
 *
 * GREEN PHASE: Create src/modules/translations/translations-seed.service.ts
 * exporting seedDefaultTranslations(prisma: PrismaClient): Promise<void>
 */

import { PrismaClient } from '@prisma/client';
import { createTestModule, TestModule } from './helpers/create-test-module';

// RED PHASE: This import WILL FAIL — the module doesn't exist yet.
// This is a TypeScript compilation error, preventing any tests from running.
// Expected error: "Cannot find module '@modules/translations/translations-seed.service'"
//
// GREEN PHASE: Create this module at:
//   src/modules/translations/translations-seed.service.ts
// with signature:
//   export async function seedDefaultTranslations(prisma: PrismaClient): Promise<void>
import { seedDefaultTranslations } from '@modules/translations/translations-seed.service';

// ============================================================
// Constants
// ============================================================

/**
 * All 13 domains that must be covered by the translation seed data.
 * As specified in cross-doc-consistency-and-i18n-plan.md §2.1 and §3.3.
 */
const EXPECTED_DOMAINS = [
  'global',
  'auth',
  'booking',
  'admin',
  'services',
  'timeSlots',
  'appointments',
  'notifications',
  'errors',
  'validation',
  'email',
  'profile',
  'sidebar',
] as const;

/** Minimum expected translation records (~446 default English records) */
const MIN_EXPECTED_RECORDS = 430;

/** Maximum expected translation records (+20 buffer for future additions) */
const MAX_EXPECTED_RECORDS = 470;

// ============================================================
// Test Suite
// ============================================================

describe('Translation Seed Data (RED phase — seed module does not exist)', () => {
  let module: TestModule;

  beforeAll(async () => {
    // Create test module connected to testcontainer PostgreSQL
    module = await createTestModule();
  });

  afterAll(async () => {
    if (module) {
      await module.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    if (module) {
      await module.resetDatabase();
    }
  });

  // ================================================================
  // 1. Record Count
  // ================================================================
  describe('1. Record count', () => {
    it('should insert approximately 200 default English translation records', async () => {
      // RED PHASE: This line cannot be reached — import of seedDefaultTranslations fails
      // Arrange & Act
      await seedDefaultTranslations(module.prisma);

      // Assert
      const count = await module.prisma.translationDictionary.count();
      expect(count).toBeGreaterThanOrEqual(MIN_EXPECTED_RECORDS);
      expect(count).toBeLessThanOrEqual(MAX_EXPECTED_RECORDS);
    });
  });

  // ================================================================
  // 2. Domain Coverage
  // ================================================================
  describe('2. Domain coverage', () => {
    it('should cover all 11 required domains', async () => {
      // RED PHASE: Cannot be reached
      // Arrange
      await seedDefaultTranslations(module.prisma);

      // Act
      const domains = await module.prisma.translationDictionary.findMany({
        select: { domain: true },
        distinct: ['domain'],
      });

      // Assert
      const domainSet = new Set(domains.map((d) => d.domain));
      for (const domain of EXPECTED_DOMAINS) {
        expect(domainSet.has(domain)).toBe(true);
      }
    });

    it('should not include any unexpected domains', async () => {
      // RED PHASE: Cannot be reached
      // Arrange
      await seedDefaultTranslations(module.prisma);

      // Act
      const domains = await module.prisma.translationDictionary.findMany({
        select: { domain: true },
        distinct: ['domain'],
      });

      // Assert
      const actualDomains = domains.map((d) => d.domain);
      for (const actual of actualDomains) {
        expect(EXPECTED_DOMAINS).toContain(actual);
      }
    });
  });

  // ================================================================
  // 3. Key Format Validation
  // ================================================================
  describe('3. Key format validation', () => {
    it('should not have empty domain values', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      const emptyDomains = await module.prisma.translationDictionary.count({
        where: { domain: '' },
      });
      expect(emptyDomains).toBe(0);
    });

    it('should not have empty key values', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      const emptyKeys = await module.prisma.translationDictionary.count({
        where: { key: '' },
      });
      expect(emptyKeys).toBe(0);
    });

    it('should not have empty value strings', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      const emptyValues = await module.prisma.translationDictionary.count({
        where: { value: '' },
      });
      expect(emptyValues).toBe(0);
    });

    it('should have all locale values set to "en"', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      const nonEnglishLocales = await module.prisma.translationDictionary.count({
        where: { locale: { not: 'en' } },
      });
      expect(nonEnglishLocales).toBe(0);
    });

    it('should have all isCustom values set to false for default seed', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      const customEntries = await module.prisma.translationDictionary.count({
        where: { isCustom: true },
      });
      expect(customEntries).toBe(0);
    });

    it('should have all tenantId values set to null for default seed', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      const tenantEntries = await module.prisma.translationDictionary.count({
        where: { tenantId: { not: null } },
      });
      expect(tenantEntries).toBe(0);
    });
  });

  // ================================================================
  // 4. Unique Constraint
  // ================================================================
  describe('4. Unique constraint enforcement', () => {
    it('should not have duplicate domain+key+locale entries', async () => {
      // RED PHASE: Cannot be reached
      // Arrange
      await seedDefaultTranslations(module.prisma);

      // Act — find any groups with count > 1
      const duplicates = await module.prisma.translationDictionary.groupBy({
        by: ['domain', 'key', 'locale'],
        _count: { id: true },
        having: {
          id: {
            _count: { gt: 1 },
          },
        },
      });

      // Assert
      expect(duplicates.length).toBe(0);
    });
  });

  // ================================================================
  // 5. Idempotency
  // ================================================================
  describe('5. Idempotency (re-running seed is safe)', () => {
    it('should produce the same record count when run multiple times', async () => {
      // RED PHASE: Cannot be reached
      // Arrange & Act — first seed
      await seedDefaultTranslations(module.prisma);
      const firstCount = await module.prisma.translationDictionary.count();

      // Act — re-run seed
      await seedDefaultTranslations(module.prisma);
      const secondCount = await module.prisma.translationDictionary.count();

      // Assert
      expect(secondCount).toBe(firstCount);
    });

    it('should not throw error when re-running seed', async () => {
      // RED PHASE: Cannot be reached
      await seedDefaultTranslations(module.prisma);

      // This should not throw
      await expect(seedDefaultTranslations(module.prisma)).resolves.not.toThrow();
    });
  });
});
