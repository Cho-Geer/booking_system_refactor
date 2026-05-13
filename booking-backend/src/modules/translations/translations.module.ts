import { Module } from "@nestjs/common";
import { TranslationService } from "./translations.service";
import { TranslationsController } from "./translations.controller";
import { AdminTranslationsController } from "./admin-translations.controller";

@Module({
  controllers: [TranslationsController, AdminTranslationsController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationsModule {}
