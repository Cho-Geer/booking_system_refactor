import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsGateway } from './notifications.gateway';

export interface NotificationJobData {
  userId: string;
  type: 'booking_confirmation' | 'appointment_update' | 'cancellation' | 'broadcast';
  event: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {
    super();
  }

  async process(
    job: Job<NotificationJobData>,
  ): Promise<{ sent: boolean; eventType: string; userId?: string }> {
    const { userId, type, event, data } = job.data;

    this.logger.log(`Processing notification job ${job.id}: ${type} for user ${userId}`);

    await job.updateProgress(10);
    this.logger.debug(`Job ${job.id}: Preparing notification payload`);

    try {
      await job.updateProgress(50);
      this.logger.debug(`Job ${job.id}: Sending notification...`);

      const payload = {
        event,
        data,
        timestamp: job.data.timestamp || new Date().toISOString(),
      };

      switch (type) {
        case 'booking_confirmation':
          this.notificationsGateway.sendBookingConfirmation(userId, payload);
          break;
        case 'appointment_update':
          this.notificationsGateway.sendAppointmentUpdate(userId, payload);
          break;
        case 'cancellation':
          this.notificationsGateway.sendCancellation(userId, payload);
          break;
        case 'broadcast':
          this.notificationsGateway.sendBroadcast(event, payload);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
          throw new Error(`Unknown notification type: ${type}`);
      }

      await job.updateProgress(100);
      this.logger.log(
        `Job ${job.id}: Notification sent successfully (${type}) to user ${userId || 'all'}`,
      );

      return { sent: true, eventType: type, userId };
    } catch (error) {
      this.logger.error(
        `Job ${job.id}: Failed to send notification (${type}): ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationJobData>) {
    this.logger.log(
      `Notification job ${job.id} completed successfully for ${job.data.type} to user ${job.data.userId}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData>, error: Error) {
    this.logger.error(
      `Notification job ${job.id} failed for ${job.data.type}: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<NotificationJobData>, progress: number | object) {
    this.logger.debug(
      `Notification job ${job.id} progress: ${typeof progress === 'number' ? `${progress}%` : JSON.stringify(progress)}`,
    );
  }
}
