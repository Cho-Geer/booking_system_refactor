import { Injectable, Logger } from "@nestjs/common";
import { NotificationsGateway } from "./notifications.gateway";

export interface AppointmentNotificationData {
  appointmentId: string;
  userId: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  customerEmail: string;
  [key: string]: unknown;
}

export interface CancellationNotificationData {
  appointmentId: string;
  userId: string;
  serviceName: string;
  date: string;
  time: string;
  cancelReason: string;
  customerName: string;
  customerEmail: string;
  [key: string]: unknown;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  /**
   * Notify user that their booking has been confirmed
   */
  notifyBookingConfirmation(data: AppointmentNotificationData): void {
    this.logger.log(
      `Sending booking confirmation for appointment ${data.appointmentId}`,
    );
    this.notificationsGateway.sendBookingConfirmation(data.userId, {
      ...data,
      type: "booking_confirmation",
      message: `Your booking for ${data.serviceName} on ${data.date} at ${data.time} has been confirmed.`,
    });
  }

  /**
   * Notify user that their appointment has been updated
   */
  notifyAppointmentUpdate(data: AppointmentNotificationData): void {
    this.logger.log(
      `Sending appointment update for appointment ${data.appointmentId}`,
    );
    this.notificationsGateway.sendAppointmentUpdate(data.userId, {
      ...data,
      type: "appointment_update",
      message: `Your appointment for ${data.serviceName} has been updated to ${data.status}.`,
    });
  }

  /**
   * Notify user that their appointment has been cancelled
   */
  notifyCancellation(data: CancellationNotificationData): void {
    this.logger.log(
      `Sending cancellation notification for appointment ${data.appointmentId}`,
    );
    this.notificationsGateway.sendCancellation(data.userId, {
      ...data,
      type: "cancellation",
      message: `Your appointment for ${data.serviceName} on ${data.date} at ${data.time} has been cancelled.`,
    });
  }

  /**
   * Broadcast a system-wide notification to all connected clients
   */
  broadcastNotification(event: string, data: Record<string, unknown>): void {
    this.logger.log(`Broadcasting notification: ${event}`);
    this.notificationsGateway.sendBroadcast(event, data);
  }

  /**
   * Check if a user is currently connected via WebSocket
   */
  isUserConnected(userId: string): boolean {
    return this.notificationsGateway.isUserConnected(userId);
  }

  /**
   * Get the number of currently connected clients
   */
  getConnectedClientsCount(): number {
    return this.notificationsGateway.getConnectedClientsCount();
  }
}
