import { Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

export interface VerificationEmailJobData {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Dedicated processor for verification email sending logic.
 *
 * Used by EmailWorker.delegateToProcessor() to handle
 * 'verification-email' job types asynchronously via BullMQ.
 */
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(@Inject('EMAIL_TRANSPORTER') private readonly transporter: Transporter) {}

  async sendVerificationEmail(
    data: VerificationEmailJobData,
  ): Promise<{ sent: boolean; messageId?: string }> {
    const { to, subject, html, text } = data;

    this.logger.log(`Sending verification email: ${subject} -> ${to}`);

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@bookingsystem.com',
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`Verification email sent to ${to} (messageId: ${info.messageId})`);

      return { sent: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
