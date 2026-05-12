import { Module } from "@nestjs/common";
import { StatsModule } from "../stats/stats.module";
import { UsersModule } from "../users/users.module";
import { ServicesModule } from "../services/services.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { AdminStatsController } from "./controllers/admin-stats.controller";
import { AdminUsersController } from "./controllers/admin-users.controller";
import { AdminServicesController } from "./controllers/admin-services.controller";
import { AdminAppointmentsController } from "./controllers/admin-appointments.controller";
import { AdminNotificationsController } from "./controllers/admin-notifications.controller";
import { AdminStatsService } from "./services/admin-stats.service";
import { AdminUsersService } from "./services/admin-users.service";
import { AdminServicesService } from "./services/admin-services.service";
import { AdminAppointmentsService } from "./services/admin-appointments.service";
import { AdminNotificationsService } from "./services/admin-notifications.service";

@Module({
  imports: [
    StatsModule,
    UsersModule,
    ServicesModule,
    AppointmentsModule,
  ],
  controllers: [
    AdminStatsController,
    AdminUsersController,
    AdminServicesController,
    AdminAppointmentsController,
    AdminNotificationsController,
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminServicesService,
    AdminAppointmentsService,
    AdminNotificationsService,
  ],
})
export class AdminModule {}
