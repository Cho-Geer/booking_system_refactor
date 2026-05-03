import { Module } from "@nestjs/common";
import { StatsModule } from "../stats/stats.module";
import { UsersModule } from "../users/users.module";
import { ServicesModule } from "../services/services.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { AdminStatsController } from "./controllers/admin-stats.controller";
import { AdminUsersController } from "./controllers/admin-users.controller";
import { AdminServicesController } from "./controllers/admin-services.controller";
import { AdminAppointmentsController } from "./controllers/admin-appointments.controller";
import { AdminReportsController } from "./controllers/admin-reports.controller";
import { AdminStatsService } from "./services/admin-stats.service";
import { AdminUsersService } from "./services/admin-users.service";
import { AdminServicesService } from "./services/admin-services.service";
import { AdminAppointmentsService } from "./services/admin-appointments.service";
import { AdminReportsService } from "./services/admin-reports.service";

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
    AdminReportsController,
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminServicesService,
    AdminAppointmentsService,
    AdminReportsService,
  ],
})
export class AdminModule {}
