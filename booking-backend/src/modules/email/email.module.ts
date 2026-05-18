import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
    {
      provide: 'EMAIL_TRANSPORTER',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawSecure = configService.get<string>('SMTP_SECURE', 'false');
        const smtpOptions = {
          host: configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
          port: configService.get<number>('SMTP_PORT', 587),
          secure: rawSecure === 'true',
          family: 4,
          auth: {
            user: configService.get<string>('SMTP_USER'),
            pass: configService.get<string>('SMTP_PASS'),
          },
        };
        const transporter = nodemailer.createTransport(smtpOptions);

        return transporter;
      },
    },
    EmailService,
    EmailWorker,
    EmailProcessor,
  ],
  exports: [EmailService],
})
export class EmailModule {}
