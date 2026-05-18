import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TranslationService, TranslationResult } from './translations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@UseGuards(JwtAuthGuard)
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  async getTranslations(
    @Query('locale') locale?: string,
    @Query('domain') domain?: string,
    @Query('since') since?: string,
  ): Promise<TranslationResult> {
    return this.translationService.getTranslations(locale, domain, since);
  }
}
