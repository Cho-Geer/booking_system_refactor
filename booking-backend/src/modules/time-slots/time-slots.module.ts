import { Module } from "@nestjs/common";
import { TimeSlotsService } from "./time-slots.service";
import { TimeSlotsController } from "./time-slots.controller";
import { SlotPreemptionService } from "./slot-preemption.service";
import { SlotPreemptionController } from "./slot-preemption.controller";
import { RateLimiterModule } from "../rate-limiter/rate-limiter.module";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [RateLimiterModule, AdminModule],
  controllers: [TimeSlotsController, SlotPreemptionController],
  providers: [TimeSlotsService, SlotPreemptionService],
  exports: [TimeSlotsService, SlotPreemptionService],
})
export class TimeSlotsModule {}
