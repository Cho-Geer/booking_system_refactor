import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { TranslationService, TranslationResult } from "./translations.service";

@Public()
@Controller("translations")
export class TranslationsController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  async getTranslations(
    @Query("locale") locale?: string,
    @Query("domain") domain?: string,
    @Query("since") since?: string,
  ): Promise<TranslationResult> {
    return this.translationService.getTranslations(locale, domain, since);
  }
}
