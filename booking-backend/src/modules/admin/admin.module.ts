import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminServicesController } from './controllers/admin-services.controller';
import { AdminAppointmentsController } from './controllers/admin-appointments.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminServicesService } from './services/admin-services.service';
import { AdminAppointmentsService } from './services/admin-appointments.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { AdminSettingsService } from './services/admin-settings.service';

@Module({
  imports: [StatsModule, UsersModule, ServicesModule, AppointmentsModule, EmailModule, NotificationsModule],
  controllers: [
    AdminStatsController,
    AdminUsersController,
    AdminServicesController,
    AdminAppointmentsController,
    AdminNotificationsController,
    AdminSettingsController,
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminServicesService,
    AdminAppointmentsService,
    AdminNotificationsService,
    AdminSettingsService,
  ],
  exports: [AdminSettingsService],
})
export class AdminModule {}
