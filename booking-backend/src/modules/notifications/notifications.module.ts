import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    JwtModule, // Import JwtModule to provide JwtService
  ],
  providers: [NotificationsGateway, NotificationService, NotificationProcessor, WsJwtGuard],
  exports: [NotificationsGateway, NotificationService, BullModule],
})
export class NotificationsModule {}
