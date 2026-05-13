import { Module, OnModuleInit } from "@nestjs/common";
import { TranslationService } from "./translations.service";
import { TranslationsController } from "./translations.controller";
import { AdminTranslationsController } from "./admin-translations.controller";
import { PrismaService } from "../../common/database/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [TranslationsController, AdminTranslationsController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationsModule implements OnModuleInit {
  constructor(
    private readonly translationService: TranslationService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Only seed default translations on first startup (table empty).
    // Does NOT wipe admin customizations on restart.
    const count = await this.prisma.translationDictionary.count();
    if (count === 0) {
      await this.translationService.seedDefaultTranslations();
    }
  }
}
