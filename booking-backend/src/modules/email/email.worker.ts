import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Job } from "bullmq";
import type { Transporter } from "nodemailer";
import { EmailProcessor } from "./email.processor";

export interface EmailJobData {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  appointmentId?: string;
  customerName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  cancelReason?: string;
}

@Processor("email")
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(
    @Inject("EMAIL_TRANSPORTER") private readonly transporter: Transporter,
    private readonly emailProcessor: EmailProcessor,
  ) {
    super();
  }

  async process(
    job: Job<EmailJobData>,
  ): Promise<{ sent: boolean; messageId?: string }> {
    // Delegate verification-email jobs to the dedicated EmailProcessor
    if (job.name === "verification-email") {
      return this.emailProcessor.sendVerificationEmail(job.data);
    }

    const { to, subject, html, text } = job.data;

    this.logger.log(`Processing email job ${job.id}: ${subject} -> ${to}`);

    await job.updateProgress(10);
    this.logger.debug(`Job ${job.id}: Transporter configured`);

    try {
      await job.updateProgress(50);
      this.logger.debug(`Job ${job.id}: Sending email...`);

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@bookingsystem.com",
        to,
        subject,
        html,
        text,
      });

      await job.updateProgress(100);
      this.logger.log(
        `Job ${job.id}: Email sent successfully to ${to} (messageId: ${info.messageId})`,
      );

      return { sent: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(
        `Job ${job.id}: Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<EmailJobData>) {
    this.logger.log(
      `Email job ${job.id} completed successfully for ${job.data.to}`,
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(
      `Email job ${job.id} failed for ${job.data.to}: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("progress")
  onProgress(job: Job<EmailJobData>, progress: number | object) {
    this.logger.debug(
      `Email job ${job.id} progress: ${typeof progress === "number" ? `${progress}%` : JSON.stringify(progress)}`,
    );
  }
}
