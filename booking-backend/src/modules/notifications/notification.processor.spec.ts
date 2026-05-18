import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationProcessor, NotificationJobData } from './notification.processor';
import { NotificationsGateway } from './notifications.gateway';
import { Job } from 'bullmq';

// Mock NotificationsGateway
const mockNotificationsGateway = {
  sendBookingConfirmation: jest.fn(),
  sendAppointmentUpdate: jest.fn(),
  sendCancellation: jest.fn(),
  sendBroadcast: jest.fn(),
  isUserConnected: jest.fn(),
  getConnectedClientsCount: jest.fn(),
};

// Mock Job
const createMockJob = (
  data: NotificationJobData,
  id: string = '1',
): jest.Mocked<Job<NotificationJobData>> =>
  ({
    id,
    data,
    updateProgress: jest.fn().mockResolvedValue(undefined),
  }) as unknown as jest.Mocked<Job<NotificationJobData>>;

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let gateway: typeof mockNotificationsGateway;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Suppress Logger output during tests
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    gateway = module.get(NotificationsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  const mockBookingConfirmationData: NotificationJobData = {
    userId: 'user-1',
    type: 'booking_confirmation',
    event: 'booking_confirmed',
    data: {
      appointmentId: 'apt-1',
      serviceName: 'Haircut',
      date: '2024-06-15',
      time: '10:00',
      status: 'CONFIRMED',
      message: 'Your booking has been confirmed.',
    },
    timestamp: '2024-06-15T10:00:00Z',
  };

  const mockAppointmentUpdateData: NotificationJobData = {
    userId: 'user-2',
    type: 'appointment_update',
    event: 'appointment_updated',
    data: {
      appointmentId: 'apt-2',
      serviceName: 'Massage',
      status: 'RESCHEDULED',
      message: 'Your appointment has been rescheduled.',
    },
    timestamp: '2024-06-16T14:00:00Z',
  };

  const mockCancellationData: NotificationJobData = {
    userId: 'user-3',
    type: 'cancellation',
    event: 'booking_cancelled',
    data: {
      appointmentId: 'apt-3',
      serviceName: 'Facial',
      cancelReason: 'Customer request',
      message: 'Your appointment has been cancelled.',
    },
    timestamp: '2024-06-17T09:00:00Z',
  };

  const mockBroadcastData: NotificationJobData = {
    userId: '',
    type: 'broadcast',
    event: 'system_maintenance',
    data: {
      message: 'System will be down for maintenance in 2 hours.',
      duration: '2 hours',
    },
    timestamp: '2024-06-18T08:00:00Z',
  };

  describe('process', () => {
    describe('booking_confirmation', () => {
      it('should call gateway.sendBookingConfirmation with correct payload', async () => {
        const mockJob = createMockJob(mockBookingConfirmationData, '1');

        const result = await processor.process(mockJob);

        expect(result.sent).toBe(true);
        expect(result.eventType).toBe('booking_confirmation');
        expect(result.userId).toBe('user-1');
        expect(gateway.sendBookingConfirmation).toHaveBeenCalledWith('user-1', {
          event: 'booking_confirmed',
          data: mockBookingConfirmationData.data,
          timestamp: '2024-06-15T10:00:00Z',
        });
      });

      it('should update progress during processing', async () => {
        const mockJob = createMockJob(mockBookingConfirmationData, '2');

        await processor.process(mockJob);

        expect(mockJob.updateProgress).toHaveBeenCalledTimes(3);
        expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 10);
        expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 50);
        expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100);
      });
    });

    describe('appointment_update', () => {
      it('should call gateway.sendAppointmentUpdate with correct payload', async () => {
        const mockJob = createMockJob(mockAppointmentUpdateData, '3');

        const result = await processor.process(mockJob);

        expect(result.sent).toBe(true);
        expect(result.eventType).toBe('appointment_update');
        expect(result.userId).toBe('user-2');
        expect(gateway.sendAppointmentUpdate).toHaveBeenCalledWith('user-2', {
          event: 'appointment_updated',
          data: mockAppointmentUpdateData.data,
          timestamp: '2024-06-16T14:00:00Z',
        });
      });
    });

    describe('cancellation', () => {
      it('should call gateway.sendCancellation with correct payload', async () => {
        const mockJob = createMockJob(mockCancellationData, '4');

        const result = await processor.process(mockJob);

        expect(result.sent).toBe(true);
        expect(result.eventType).toBe('cancellation');
        expect(result.userId).toBe('user-3');
        expect(gateway.sendCancellation).toHaveBeenCalledWith('user-3', {
          event: 'booking_cancelled',
          data: mockCancellationData.data,
          timestamp: '2024-06-17T09:00:00Z',
        });
      });
    });

    describe('broadcast', () => {
      it('should call gateway.sendBroadcast with correct payload', async () => {
        const mockJob = createMockJob(mockBroadcastData, '5');

        const result = await processor.process(mockJob);

        expect(result.sent).toBe(true);
        expect(result.eventType).toBe('broadcast');
        expect(gateway.sendBroadcast).toHaveBeenCalledWith('system_maintenance', {
          event: 'system_maintenance',
          data: mockBroadcastData.data,
          timestamp: '2024-06-18T08:00:00Z',
        });
      });
    });

    describe('unknown type', () => {
      it('should throw error for unknown notification type', async () => {
        const invalidData: NotificationJobData = {
          userId: 'user-1',
          type: 'unknown_type' as any,
          event: 'unknown_event',
          data: { message: 'Test' },
        };
        const mockJob = createMockJob(invalidData, '6');

        await expect(processor.process(mockJob)).rejects.toThrow(
          'Unknown notification type: unknown_type',
        );
      });

      it('should log warning for unknown notification type', async () => {
        const invalidData: NotificationJobData = {
          userId: 'user-1',
          type: 'invalid' as any,
          event: 'invalid_event',
          data: {},
        };
        const mockJob = createMockJob(invalidData, '7');

        try {
          await processor.process(mockJob);
        } catch {
          // Expected error
        }

        expect(loggerWarnSpy).toHaveBeenCalledWith('Unknown notification type: invalid');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should throw error when gateway method fails', async () => {
        const mockJob = createMockJob(mockBookingConfirmationData, '8');
        const gatewayError = new Error('WebSocket connection lost');
        gateway.sendBookingConfirmation.mockImplementation(() => {
          throw gatewayError;
        });

        await expect(processor.process(mockJob)).rejects.toThrow('WebSocket connection lost');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should log error when notification sending fails', async () => {
        const mockJob = createMockJob(mockBookingConfirmationData, '9');
        const gatewayError = new Error('Client disconnected');
        gatewayError.stack = 'Error: Client disconnected\n    at test';
        gateway.sendBookingConfirmation.mockImplementation(() => {
          throw gatewayError;
        });

        try {
          await processor.process(mockJob);
        } catch {
          // Expected error
        }

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send notification'),
          gatewayError.stack,
        );
      });

      it('should update progress to 10 at start of processing', async () => {
        const mockJob = createMockJob(mockBookingConfirmationData, '10');
        gateway.sendBookingConfirmation.mockImplementation(() => {
          throw new Error('Fail early');
        });

        try {
          await processor.process(mockJob);
        } catch {
          // Expected error
        }

        expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 10);
      });
    });

    describe('timestamp handling', () => {
      it('should use provided timestamp when available', async () => {
        const mockJob = createMockJob(mockBookingConfirmationData, '11');

        await processor.process(mockJob);

        expect(gateway.sendBookingConfirmation).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({
            timestamp: '2024-06-15T10:00:00Z',
          }),
        );
      });

      it('should generate timestamp when not provided', async () => {
        const dataWithoutTimestamp: NotificationJobData = {
          ...mockBookingConfirmationData,
          timestamp: undefined,
        };
        const mockJob = createMockJob(dataWithoutTimestamp, '12');

        await processor.process(mockJob);

        expect(gateway.sendBookingConfirmation).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({
            timestamp: expect.any(String),
          }),
        );
      });
    });
  });

  describe('onCompleted', () => {
    it('should log completion message with type and userId', () => {
      const mockJob = createMockJob(mockBookingConfirmationData, '13');

      processor.onCompleted(mockJob);

      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('completed successfully'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('booking_confirmation'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    });

    it('should handle broadcast completion (no userId)', () => {
      const mockJob = createMockJob(mockBroadcastData, '14');

      processor.onCompleted(mockJob);

      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('completed successfully'));
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('broadcast'));
    });
  });

  describe('onFailed', () => {
    it('should log failure message with error', () => {
      const mockJob = createMockJob(mockBookingConfirmationData, '15');
      const error = new Error('Delivery failed');
      error.stack = 'Error: Delivery failed\n    at test';

      processor.onFailed(mockJob, error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('failed'), error.stack);
    });

    it('should include notification type in failure log', () => {
      const mockJob = createMockJob(mockCancellationData, '16');
      const error = new Error('WebSocket error');

      processor.onFailed(mockJob, error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('cancellation'),
        expect.any(String),
      );
    });

    it('should handle error without stack', () => {
      const mockJob = createMockJob(mockAppointmentUpdateData, '17');
      const error = new Error('Unknown error');

      processor.onFailed(mockJob, error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.any(String),
      );
    });
  });

  describe('onProgress', () => {
    it('should log numeric progress', () => {
      const mockJob = createMockJob(mockBookingConfirmationData, '18');

      processor.onProgress(mockJob, 50);

      expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('50%'));
    });

    it('should log object progress as JSON', () => {
      const mockJob = createMockJob(mockBookingConfirmationData, '19');
      const progressObj = { stage: 'sending', percentage: 75 };

      processor.onProgress(mockJob, progressObj);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(progressObj)),
      );
    });

    it('should include job id in progress log', () => {
      const mockJob = createMockJob(mockBookingConfirmationData, '20');

      processor.onProgress(mockJob, 25);

      expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('20'));
    });
  });
});
