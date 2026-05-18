import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Transporter } from 'nodemailer';

export interface SendEmailDto {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface AppointmentConfirmationData {
  appointmentId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  time: string;
  location?: string;
}

export interface AppointmentCancellationData {
  appointmentId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  time?: string;
  location?: string;
  cancelReason: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @Inject('EMAIL_TRANSPORTER') private readonly transporter: Transporter,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP server is ready to accept messages');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`SMTP verification failed (may be normal in dev): ${errorMessage}`);
    }
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
  }: SendEmailDto): Promise<{ success: boolean; jobId?: string }> {
    const job = await this.emailQueue.add(
      'verification-email',
      { to, subject, html, text },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Queued verification email for ${to} (Job ID: ${job.id})`);

    return { success: true, jobId: job.id };
  }

  async sendAppointmentConfirmation(
    data: AppointmentConfirmationData,
  ): Promise<{ success: boolean; jobId?: string }> {
    const html = this.generateConfirmationHtml(data);
    const text = this.generateConfirmationText(data);

    const job = await this.emailQueue.add(
      'appointment-confirmation',
      {
        to: data.customerEmail,
        subject: `Booking Confirmation - ${data.serviceName}`,
        html,
        text,
        appointmentId: data.appointmentId,
        customerName: data.customerName,
        serviceName: data.serviceName,
        date: data.date,
        time: data.time,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Queued appointment confirmation email for ${data.customerEmail} (Job ID: ${job.id})`,
    );

    return { success: true, jobId: job.id };
  }

  async sendAppointmentCancellation(
    data: AppointmentCancellationData,
  ): Promise<{ success: boolean; jobId?: string }> {
    const html = this.generateCancellationHtml(data);
    const text = this.generateCancellationText(data);

    const job = await this.emailQueue.add(
      'appointment-cancellation',
      {
        to: data.customerEmail,
        subject: `Appointment Cancelled - ${data.serviceName}`,
        html,
        text,
        appointmentId: data.appointmentId,
        customerName: data.customerName,
        serviceName: data.serviceName,
        date: data.date,
        cancelReason: data.cancelReason,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Queued appointment cancellation email for ${data.customerEmail} (Job ID: ${job.id})`,
    );

    return { success: true, jobId: job.id };
  }

  private generateConfirmationHtml(data: AppointmentConfirmationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #4A90D9;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Booking System</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333333; margin-top: 0;">Booking Confirmation</h2>
                    <p style="color: #555555; font-size: 16px;">Dear <strong>${data.customerName}</strong>,</p>
                    <p style="color: #555555; font-size: 16px;">Your appointment has been successfully confirmed. Here are the details:</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Service:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Date:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.date}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Time:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.time}</td>
                      </tr>
                      ${
                        data.location
                          ? `<tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Location:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.location}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                    <p style="color: #555555; font-size: 14px;">If you need to make any changes, please contact our support team.</p>
                    <p style="color: #555555; font-size: 14px;">We look forward to serving you!</p>
                    <p style="color: #555555; font-size: 14px; margin-top: 30px;">Best regards,<br><strong>The Booking System Team</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; color: #999999; font-size: 12px;">
              <p>&copy; 2026 Booking System. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private generateConfirmationText(data: AppointmentConfirmationData): string {
    return `
Booking Confirmation

Dear ${data.customerName},

Your appointment has been successfully confirmed. Here are the details:

Service: ${data.serviceName}
Date: ${data.date}
Time: ${data.time}
${data.location ? `Location: ${data.location}` : ''}

If you need to make any changes, please contact our support team.
We look forward to serving you!

Best regards,
The Booking System Team
    `.trim();
  }

  private generateCancellationHtml(data: AppointmentCancellationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #D94A4A;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Booking System</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333333; margin-top: 0;">Appointment Cancelled</h2>
                    <p style="color: #555555; font-size: 16px;">Dear <strong>${data.customerName}</strong>,</p>
                    <p style="color: #555555; font-size: 16px;">Your appointment has been cancelled. Here are the details:</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Service:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Date:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.date}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #555555;"><strong>Reason:</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; color: #333333;">${data.cancelReason}</td>
                      </tr>
                    </table>
                    <p style="color: #555555; font-size: 14px;">If you would like to reschedule, please visit our booking system to create a new appointment.</p>
                    <p style="color: #555555; font-size: 14px; margin-top: 30px;">Best regards,<br><strong>The Booking System Team</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; color: #999999; font-size: 12px;">
              <p>&copy; 2026 Booking System. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private generateCancellationText(data: AppointmentCancellationData): string {
    return `
Appointment Cancelled

Dear ${data.customerName},

Your appointment has been cancelled. Here are the details:

Service: ${data.serviceName}
Date: ${data.date}
Reason: ${data.cancelReason}

If you would like to reschedule, please visit our booking system to create a new appointment.

Best regards,
The Booking System Team
    `.trim();
  }
}
