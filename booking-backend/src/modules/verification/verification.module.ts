import { Module } from "@nestjs/common";
import { VerificationService } from "./verification.service";
import { CacheModule } from "../cache/cache.module";

@Module({
  imports: [CacheModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
