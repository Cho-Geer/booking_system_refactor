import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EmailWorker, EmailJobData } from './email.worker';
import { EmailProcessor } from './email.processor';
import { Job } from 'bullmq';

// Mock nodemailer Transporter
const mockTransporter = {
  sendMail: jest.fn(),
};

// Mock EmailProcessor
const mockEmailProcessor = {
  sendVerificationEmail: jest.fn(),
};

// Mock Job
const createMockJob = (data: EmailJobData, id: string = '1'): jest.Mocked<Job<EmailJobData>> =>
  ({
    id,
    data,
    updateProgress: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Job<EmailJobData>>);

describe('EmailWorker', () => {
  let worker: EmailWorker;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Suppress Logger output during tests
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailWorker,
        {
          provide: 'EMAIL_TRANSPORTER',
          useValue: mockTransporter,
        },
        {
          provide: EmailProcessor,
          useValue: mockEmailProcessor,
        },
      ],
    }).compile();

    worker = module.get<EmailWorker>(EmailWorker);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  const mockEmailData: EmailJobData = {
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<p>Hello World</p>',
    text: 'Hello World',
    appointmentId: 'apt-1',
    customerName: 'John Doe',
    serviceName: 'Haircut',
    date: '2024-06-15',
    time: '10:00',
  };

  describe('process', () => {

    it('should send email successfully and return sent confirmation', async () => {
      const mockJob = createMockJob(mockEmailData, '1');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await worker.process(mockJob);

      expect(result.sent).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || 'noreply@bookingsystem.com',
        to: mockEmailData.to,
        subject: mockEmailData.subject,
        html: mockEmailData.html,
        text: mockEmailData.text,
      });
    });

    it('should update progress during email processing', async () => {
      const mockJob = createMockJob(mockEmailData, '2');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-456' });

      await worker.process(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledTimes(3);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 10);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 50);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100);
    });

    it('should send email with only html content', async () => {
      const htmlOnlyData: EmailJobData = {
        to: 'html@example.com',
        subject: 'HTML Only Email',
        html: '<h1>Hello</h1>',
      };
      const mockJob = createMockJob(htmlOnlyData, '3');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-789' });

      await worker.process(mockJob);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || 'noreply@bookingsystem.com',
        to: 'html@example.com',
        subject: 'HTML Only Email',
        html: '<h1>Hello</h1>',
        text: undefined,
      });
    });

    it('should send email with only text content', async () => {
      const textOnlyData: EmailJobData = {
        to: 'text@example.com',
        subject: 'Text Only Email',
        text: 'Plain text email',
      };
      const mockJob = createMockJob(textOnlyData, '4');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-text' });

      await worker.process(mockJob);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || 'noreply@bookingsystem.com',
        to: 'text@example.com',
        subject: 'Text Only Email',
        html: undefined,
        text: 'Plain text email',
      });
    });

    it('should use custom SMTP_FROM when available', async () => {
      const originalEnv = process.env.SMTP_FROM;
      process.env.SMTP_FROM = 'custom@bookingapp.com';

      const mockJob = createMockJob(mockEmailData, '5');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-custom' });

      await worker.process(mockJob);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'custom@bookingapp.com' }),
      );

      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.SMTP_FROM;
      } else {
        process.env.SMTP_FROM = originalEnv;
      }
    });

    it('should use default SMTP_FROM when env is not set', async () => {
      const originalEnv = process.env.SMTP_FROM;
      delete process.env.SMTP_FROM;

      const mockJob = createMockJob(mockEmailData, '5b');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-default' });

      await worker.process(mockJob);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@bookingsystem.com' }),
      );

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.SMTP_FROM = originalEnv;
      }
    });

    it('should throw error when transporter.sendMail fails', async () => {
      const mockJob = createMockJob(mockEmailData, '6');
      const sendError = new Error('SMTP connection refused');
      mockTransporter.sendMail.mockRejectedValue(sendError);

      await expect(worker.process(mockJob)).rejects.toThrow('SMTP connection refused');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should log the error when email sending fails', async () => {
      const mockJob = createMockJob(mockEmailData, '7');
      const sendError = new Error('Network timeout');
      sendError.stack = 'Error: Network timeout\n    at test';
      mockTransporter.sendMail.mockRejectedValue(sendError);

      try {
        await worker.process(mockJob);
      } catch {
        // Expected error
      }

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should throw error with original stack trace when email sending fails', async () => {
      const mockJob = createMockJob(mockEmailData, '7b');
      const sendError = new Error('Connection timeout');
      sendError.stack = 'Error: Connection timeout\n    at layer1\n    at layer2';
      mockTransporter.sendMail.mockRejectedValue(sendError);

      await expect(worker.process(mockJob)).rejects.toThrow('Connection timeout');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email'),
        sendError.stack,
      );
    });

    it('should update progress to 10 at start of processing', async () => {
      const mockJob = createMockJob(mockEmailData, '8');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-8' });

      await worker.process(mockJob);

      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 10);
    });
  });

  describe('onCompleted', () => {
    it('should log completion message', () => {
      const mockJob = createMockJob(mockEmailData, '9');

      worker.onCompleted(mockJob);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully'),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('user@example.com'),
      );
    });
  });

  describe('onFailed', () => {
    it('should log failure message with error', () => {
      const mockJob = createMockJob(mockEmailData, '10');
      const error = new Error('Delivery failed');
      error.stack = 'Error: Delivery failed\n    at test';

      worker.onFailed(mockJob, error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        error.stack,
      );
    });

    it('should include recipient email in failure log', () => {
      const mockJob = createMockJob(mockEmailData, '11');
      const error = new Error('SMTP error');

      worker.onFailed(mockJob, error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('user@example.com'),
        error.stack,
      );
    });
  });

  describe('onProgress', () => {
    it('should log numeric progress', () => {
      const mockJob = createMockJob(mockEmailData, '12');

      worker.onProgress(mockJob, 50);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('50%'),
      );
    });

    it('should log object progress as JSON', () => {
      const mockJob = createMockJob(mockEmailData, '13');
      const progressObj = { stage: 'sending', percentage: 75 };

      worker.onProgress(mockJob, progressObj);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(progressObj)),
      );
    });
  });
});
