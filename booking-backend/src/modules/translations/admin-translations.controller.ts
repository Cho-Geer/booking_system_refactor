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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  TranslationService,
  BatchUpsertResult,
  SeedTranslationResult,
  PaginatedTranslationsResult,
} from './translations.service';

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

// ============================================================
// Admin Controller
// ============================================================

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/translations')
export class AdminTranslationsController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAdminTranslations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('locale') locale?: string,
    @Query('domain') domain?: string,
    @Query('isCustom') isCustom?: boolean,
  ): Promise<PaginatedTranslationsResult> {
    return this.translationService.getAdminTranslations(
      page ?? 1,
      limit ?? 20,
      locale,
      domain,
      isCustom,
    );
  }

  @Put()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async batchUpsert(@Body() dto: BatchUpsertDto): Promise<BatchUpsertResult> {
    const result = await this.translationService.batchUpsert(dto.entries);
    await this.translationService.invalidateCache(dto.entries[0]?.locale);
    return result;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteTranslation(@Param('id') id: string): Promise<void> {
    await this.translationService.deleteTranslation(id);
    await this.translationService.invalidateCache();
  }

  @Post('seed')
  @Roles('SUPER_ADMIN')
  async seedDefaultTranslations(): Promise<SeedTranslationResult> {
    const result = await this.translationService.seedDefaultTranslations();
    await this.translationService.invalidateCache();
    return result;
  }
}
