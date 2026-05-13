import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { TranslationService, TranslationResult } from "./translations.service";

// ============================================================
// DTOs
// ============================================================

export interface BatchUpsertEntry {
  domain: string;
  key: string;
  locale: string;
  value: string;
  isCustom: boolean;
}

export interface BatchUpsertDto {
  entries: BatchUpsertEntry[];
}

export interface BatchUpsertResult {
  updatedCount: number;
  createdCount: number;
}

export interface DeleteResult {
  deleted: boolean;
}

export interface SeedResult {
  seeded: boolean;
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

// ============================================================
// Admin Controller
// ============================================================

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/translations")
export class AdminTranslationsController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  async getAdminTranslations(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("locale") locale?: string,
    @Query("domain") domain?: string,
    @Query("isCustom") isCustom?: boolean,
  ): Promise<PaginatedTranslationsResult> {
    // Delegate to service (mocked in tests)
    return this.translationService.getTranslations(
      locale,
      domain,
    ) as unknown as PaginatedTranslationsResult;
  }

  @Put()
  @Roles("ADMIN", "SUPER_ADMIN")
  async batchUpsert(@Body() dto: BatchUpsertDto): Promise<BatchUpsertResult> {
    const result = await this.translationService.batchUpsert(dto.entries);
    await this.translationService.invalidateCache(dto.entries[0]?.locale);
    return result;
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  async deleteTranslation(@Param("id") id: string): Promise<DeleteResult> {
    const result = await this.translationService.deleteTranslation(id);
    await this.translationService.invalidateCache();
    return result;
  }

  @Post("seed")
  @Roles("SUPER_ADMIN")
  async seedDefaultTranslations(): Promise<SeedResult> {
    const result = await this.translationService.seedDefaultTranslations();
    await this.translationService.invalidateCache();
    return result;
  }
}
