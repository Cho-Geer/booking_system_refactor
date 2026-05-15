import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { CacheService } from "../cache/cache.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { seedDefaultTranslations as runSeed } from "./translations-seed.service";

// ============================================================
// Types
// ============================================================

export interface TranslationResult {
  locale: string;
  updatedAt: string;
  translations?: Record<string, Record<string, string>>;
  changes?: Record<string, string>;
  deleted?: string[];
}

export interface BatchUpsertEntry {
  domain: string;
  key: string;
  locale: string;
  value: string;
  isCustom: boolean;
}

export interface BatchUpsertResult {
  updated: number;
  created: number;
}

export interface DeleteTranslationResult {
  deleted: boolean;
}

export interface SeedTranslationResult {
  message: string;
  count: number;
}

export interface PaginatedTranslationsResult {
  data: Record<string, unknown>[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const CACHE_TTL = 3600; // 1 hour
const DEFAULT_LOCALE = "en";

@Injectable()
export class TranslationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // ============================================================
  // Get Translations
  // ============================================================

  /**
   * Retrieve translations for a given locale.
   *
   * Full response (no `since`): returns `translations` grouped by domain.
   * Incremental response (with `since`): returns `changes` and `deleted`.
   *
   * Results are cached under `translations:{locale}` with a TTL of 3600s.
   */
  async getTranslations(
    locale: string = DEFAULT_LOCALE,
    domain?: string,
    since?: string,
  ): Promise<TranslationResult> {
    const cacheKey = `translations:${locale}`;

    // Try cache first (only use cache for full responses, not incremental)
    if (!since) {
      const cached = await this.cache.get<TranslationResult>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build the Prisma where clause
    const where: Record<string, unknown> = { locale };
    if (domain) {
      where.domain = domain;
    }
    if (since) {
      where.updatedAt = { gt: new Date(since) };
    }

    const entries = await this.prisma.translationDictionary.findMany({ where });

    // Determine updatedAt: use the latest update timestamp among entries,
    // or current time if no entries were returned.
    const updatedAt =
      entries.length > 0
        ? new Date(
            Math.max(...entries.map((e) => e.updatedAt.getTime())),
          ).toISOString()
        : new Date().toISOString();

    if (since) {
      // --- Incremental response ---
      const changes: Record<string, string> = {};
      for (const entry of entries) {
        changes[`${entry.domain}.${entry.key}`] = entry.value;
      }
      const result: TranslationResult = {
        locale,
        updatedAt,
        changes,
        deleted: [],
      };

      return result;
    }

    // --- Full response — group by domain ---
    const translations: Record<string, Record<string, string>> = {};
    for (const entry of entries) {
      if (!translations[entry.domain]) {
        translations[entry.domain] = {};
      }
      translations[entry.domain][entry.key] = entry.value;
    }

    const result: TranslationResult = {
      locale,
      updatedAt,
      translations,
    };

    // Cache the result
    await this.cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  // ============================================================
  // Batch Upsert
  // ============================================================

  /**
   * Batch create or update translation entries.
   * For each entry, attempts to find an existing record by domain+key+locale.
   * Creates new records and updates existing ones.
   */
  async batchUpsert(entries: BatchUpsertEntry[]): Promise<BatchUpsertResult> {
    let updatedCount = 0;
    let createdCount = 0;

    for (const entry of entries) {
      // Try to find existing record
      const existing = await this.prisma.translationDictionary.findFirst({
        where: {
          domain: entry.domain,
          key: entry.key,
          locale: entry.locale,
        },
      });

      if (existing) {
        // Update existing record
        await this.prisma.translationDictionary.update({
          where: { id: existing.id },
          data: {
            value: entry.value,
            isCustom: entry.isCustom,
          },
        });
        updatedCount++;
      } else {
        // Create new record
        await this.prisma.translationDictionary.create({
          data: {
            domain: entry.domain,
            key: entry.key,
            locale: entry.locale,
            value: entry.value,
            isCustom: entry.isCustom,
            tenantId: null,
          },
        });
        createdCount++;
      }
    }

    const firstEntry = entries[0];
    this.notificationsGateway.sendTranslationsUpdated(
      firstEntry?.domain,
      firstEntry?.locale,
    );

    return { updated: updatedCount, created: createdCount };
  }

  // ============================================================
  // Admin Get Translations (paginated)
  // ============================================================

  async getAdminTranslations(
    page: number = 1,
    limit: number = 20,
    locale?: string,
    domain?: string,
    isCustom?: boolean | string,
  ): Promise<PaginatedTranslationsResult> {
    const where: Record<string, unknown> = {};
    if (locale) where.locale = locale;
    if (domain) where.domain = domain;
    if (isCustom !== undefined) where.isCustom = isCustom === true || isCustom === "true";

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.translationDictionary.findMany({ where, skip, take: limit }),
      this.prisma.translationDictionary.count({ where }),
    ]);

    return {
      data: data as unknown as Record<string, unknown>[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // Delete Translation
  // ============================================================

  /**
   * Delete a translation entry by its ID.
   * Throws NotFoundException if the record does not exist.
   */
  async deleteTranslation(id: string): Promise<DeleteTranslationResult> {
    const existing = await this.prisma.translationDictionary.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Translation not found");
    }

    await this.prisma.translationDictionary.delete({
      where: { id },
    });

    return { deleted: true };
  }

  // ============================================================
  // Seed Default Translations
  // ============================================================

  /**
   * Re-populate the default English translation records.
   * Delegates to the standalone seed function and returns a count.
   */
  async seedDefaultTranslations(): Promise<SeedTranslationResult> {
    // The seed function deletes all existing default 'en' records and re-inserts them
    await runSeed(this.prisma);

    // Count total default English records after seeding
    const count = await this.prisma.translationDictionary.count({
      where: { isCustom: false, locale: "en" },
    });

    this.notificationsGateway.sendTranslationsUpdated();

    return { message: "seed_success", count };
  }

  // ============================================================
  // Cache Invalidation
  // ============================================================

  /**
   * Invalidate the cache for a given locale (defaults to 'en').
   * The next call to `getTranslations` will re-query the database.
   */
  async invalidateCache(locale: string = DEFAULT_LOCALE): Promise<void> {
    const cacheKey = `translations:${locale}`;
    await this.cache.delete(cacheKey);
  }
}
