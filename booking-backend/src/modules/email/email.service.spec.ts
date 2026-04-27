import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock type for the nodemailer transporter as used in tests
interface MockTransporter {
  sendMail: jest.Mock;
  verify: jest.Mock;
}

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id-123',
      envelope: { from: 'noreply@bookingsystem.com', to: ['test@example.com'] },
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

describe('EmailService', () => {
  let service: EmailService;
  let emailQueue: Queue;
  let mockTransporter: MockTransporter;

  const mockQueue = {
    add: jest.fn().mockImplementation((name, data, options) =>
      Promise.resolve({
        id: 'test-job-id',
        name,
        data,
        options,
      }),
    ),
  };

  // Create a shared mockTransporter at module level
  const createMockTransporter = (): MockTransporter => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id-123',
      envelope: { from: 'noreply@bookingsystem.com', to: ['test@example.com'] },
    }),
    verify: jest.fn().mockResolvedValue(true),
  });

  const mockEmailData = {
    to: 'customer@example.com',
    subject: 'Test Subject',
    html: '<p>Test HTML content</p>',
    text: 'Test plain text content',
  };

  const mockAppointmentData = {
    appointmentId: 'apt-123',
    customerName: 'John Doe',
    customerEmail: 'customer@example.com',
    serviceName: 'Haircut',
    date: '2026-04-20',
    time: '10:00 AM',
    location: 'Main Branch',
    cancelReason: 'Test cancellation reason',
  };

  beforeEach(async () => {
    // Reset mock but keep implementation
    mockQueue.add.mockReset();
    mockQueue.add.mockImplementation((name, data, options) =>
      Promise.resolve({
        id: 'test-job-id',
        name,
        data,
        options,
      }),
    );
    
    mockTransporter = createMockTransporter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getQueueToken('email'),
          useValue: mockQueue,
        },
        {
          provide: 'EMAIL_TRANSPORTER',
          useValue: mockTransporter,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailQueue = module.get<Queue>(getQueueToken('email'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should verify SMTP connection on module initialization', async () => {
      await service.onModuleInit();

      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should log success when SMTP verification passes', async () => {
      const loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.onModuleInit();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMTP server is ready'),
      );

      loggerLogSpy.mockRestore();
    });

    it('should log warning when SMTP verification fails', async () => {
      mockTransporter.verify.mockRejectedValueOnce(new Error('Connection refused'));
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.onModuleInit();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMTP verification failed'),
      );

      loggerWarnSpy.mockRestore();
    });

    it('should handle non-Error objects in SMTP verification failure', async () => {
      mockTransporter.verify.mockRejectedValueOnce('String error message');
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.onModuleInit();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('String error message'),
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('sendEmail', () => {
    it('should send an email with HTML and text content', async () => {
      const result = await service.sendEmail(mockEmailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || 'noreply@bookingsystem.com',
        to: mockEmailData.to,
        subject: mockEmailData.subject,
        html: mockEmailData.html,
        text: mockEmailData.text,
      });

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id-123',
      });
    });

    it('should send an email with only text when html is not provided', async () => {
      const textOnlyData = {
        to: 'customer@example.com',
        subject: 'Text Only',
        text: 'Plain text only',
      };

      await service.sendEmail(textOnlyData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: textOnlyData.to,
          subject: textOnlyData.subject,
          text: textOnlyData.text,
        }),
      );
    });

    it('should send an email with only HTML when text is not provided', async () => {
      const htmlOnlyData = {
        to: 'customer@example.com',
        subject: 'HTML Only',
        html: '<p>HTML only</p>',
      };

      await service.sendEmail(htmlOnlyData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: htmlOnlyData.to,
          subject: htmlOnlyData.subject,
          html: htmlOnlyData.html,
        }),
      );
    });

    it('should throw an error when sendMail fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(service.sendEmail(mockEmailData)).rejects.toThrow('SMTP connection failed');
    });

    it('should log error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      error.stack = 'Error: SMTP connection failed\n    at test';
      mockTransporter.sendMail.mockRejectedValueOnce(error);

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.sendEmail(mockEmailData)).rejects.toThrow('SMTP connection failed');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email to customer@example.com'),
        error.stack,
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('sendAppointmentConfirmation', () => {
    it('should queue an appointment confirmation email job', async () => {
      const result = await service.sendAppointmentConfirmation(mockAppointmentData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'appointment-confirmation',
        expect.objectContaining({
          to: mockAppointmentData.customerEmail,
          customerName: mockAppointmentData.customerName,
          serviceName: mockAppointmentData.serviceName,
          date: mockAppointmentData.date,
          time: mockAppointmentData.time,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
          }),
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );

      expect(result).toEqual({
        success: true,
        jobId: 'test-job-id',
      });
    });

    it('should include appointmentId in the queued job data', async () => {
      await service.sendAppointmentConfirmation(mockAppointmentData);

      const callArgs = mockQueue.add.mock.calls[0];
      expect(callArgs[1].appointmentId).toBe(mockAppointmentData.appointmentId);
    });

    it('should configure retry attempts and exponential backoff', async () => {
      await service.sendAppointmentConfirmation(mockAppointmentData);

      const callArgs = mockQueue.add.mock.calls[0];
      const options = callArgs[2];

      expect(options.attempts).toBe(3);
      expect(options.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
    });

    it('should generate confirmation text with correct format', async () => {
      await service.sendAppointmentConfirmation(mockAppointmentData);

      const callArgs = mockQueue.add.mock.calls[0];
      const textContent = callArgs[1].text;

      expect(textContent).toContain('Booking Confirmation');
      expect(textContent).toContain(mockAppointmentData.customerName);
      expect(textContent).toContain(mockAppointmentData.serviceName);
      expect(textContent).toContain(mockAppointmentData.date);
      expect(textContent).toContain(mockAppointmentData.time);
    });

    it('should include optional location in confirmation text when provided', async () => {
      const appointmentDataWithLocation = {
        ...mockAppointmentData,
        location: 'Downtown Branch',
      };

      await service.sendAppointmentConfirmation(appointmentDataWithLocation);

      const callArgs = mockQueue.add.mock.calls[0];
      const htmlContent = callArgs[1].html;
      const textContent = callArgs[1].text;

      expect(htmlContent).toContain('Downtown Branch');
      expect(textContent).toContain('Downtown Branch');
    });
  });

  describe('sendAppointmentCancellation', () => {
    it('should queue an appointment cancellation email job', async () => {
      const cancellationData = {
        ...mockAppointmentData,
        cancelReason: 'Customer requested cancellation',
      };

      const result = await service.sendAppointmentCancellation(cancellationData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'appointment-cancellation',
        expect.objectContaining({
          to: mockAppointmentData.customerEmail,
          customerName: mockAppointmentData.customerName,
          serviceName: mockAppointmentData.serviceName,
          date: mockAppointmentData.date,
          cancelReason: cancellationData.cancelReason,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
          }),
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );

      expect(result).toEqual({
        success: true,
        jobId: 'test-job-id',
      });
    });

    it('should include appointmentId in the cancellation job data', async () => {
      await service.sendAppointmentCancellation(mockAppointmentData);

      const callArgs = mockQueue.add.mock.calls[0];
      expect(callArgs[1].appointmentId).toBe(mockAppointmentData.appointmentId);
    });

    it('should configure retry attempts and exponential backoff for cancellation', async () => {
      await service.sendAppointmentCancellation(mockAppointmentData);

      const callArgs = mockQueue.add.mock.calls[0];
      const options = callArgs[2];

      expect(options.attempts).toBe(3);
      expect(options.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
    });

    it('should generate cancellation text with correct format', async () => {
      const cancellationData = {
        ...mockAppointmentData,
        cancelReason: 'Staff unavailability',
      };

      await service.sendAppointmentCancellation(cancellationData);

      const callArgs = mockQueue.add.mock.calls[0];
      const textContent = callArgs[1].text;

      expect(textContent).toContain('Appointment Cancelled');
      expect(textContent).toContain(mockAppointmentData.customerName);
      expect(textContent).toContain(cancellationData.cancelReason);
    });

    it('should include optional time and location in cancellation when provided', async () => {
      const cancellationData = {
        ...mockAppointmentData,
        time: '10:00 AM',
        location: 'Main Branch',
        cancelReason: 'Customer request',
      };

      await service.sendAppointmentCancellation(cancellationData);

      const callArgs = mockQueue.add.mock.calls[0];
      const htmlContent = callArgs[1].html;

      expect(htmlContent).toContain('Appointment Cancelled');
      expect(htmlContent).toContain(cancellationData.cancelReason);
    });
  });

  describe('email template generation', () => {
    it('should generate branded HTML for appointment confirmation', async () => {
      await service.sendAppointmentConfirmation(mockAppointmentData);

      const callArgs = mockQueue.add.mock.calls[0];
      const htmlContent = callArgs[1].html;

      expect(htmlContent).toContain('Booking Confirmation');
      expect(htmlContent).toContain(mockAppointmentData.customerName);
      expect(htmlContent).toContain(mockAppointmentData.serviceName);
      expect(htmlContent).toContain(mockAppointmentData.date);
      expect(htmlContent).toContain(mockAppointmentData.time);
    });

    it('should generate branded HTML for appointment cancellation', async () => {
      const cancellationData = {
        ...mockAppointmentData,
        cancelReason: 'Staff unavailability',
      };

      await service.sendAppointmentCancellation(cancellationData);

      const callArgs = mockQueue.add.mock.calls[0];
      const htmlContent = callArgs[1].html;

      expect(htmlContent).toContain('Appointment Cancelled');
      expect(htmlContent).toContain(mockAppointmentData.customerName);
      expect(htmlContent).toContain(cancellationData.cancelReason);
    });
  });
});
