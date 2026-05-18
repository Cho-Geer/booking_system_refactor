import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationService,
  AppointmentNotificationData,
  CancellationNotificationData,
} from './notification.service';
import { NotificationsGateway } from './notifications.gateway';

// Mock NotificationsGateway
const mockNotificationsGateway = {
  sendBookingConfirmation: jest.fn(),
  sendAppointmentUpdate: jest.fn(),
  sendCancellation: jest.fn(),
  sendBroadcast: jest.fn(),
  isUserConnected: jest.fn(),
  getConnectedClientsCount: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;
  let gateway: typeof mockNotificationsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    gateway = module.get(NotificationsGateway);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyBookingConfirmation', () => {
    const mockData: AppointmentNotificationData = {
      appointmentId: 'apt-1',
      userId: 'user-1',
      serviceName: 'Haircut',
      date: '2024-06-15',
      time: '10:00',
      status: 'CONFIRMED',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
    };

    it('should call gateway.sendBookingConfirmation with correct data', () => {
      service.notifyBookingConfirmation(mockData);

      expect(gateway.sendBookingConfirmation).toHaveBeenCalledWith('user-1', {
        ...mockData,
        type: 'booking_confirmation',
        message: 'Your booking for Haircut on 2024-06-15 at 10:00 has been confirmed.',
      });
    });

    it('should include the correct confirmation message format', () => {
      const testData: AppointmentNotificationData = {
        ...mockData,
        serviceName: 'Manicure',
        date: '2024-12-25',
        time: '14:30',
      };

      service.notifyBookingConfirmation(testData);

      expect(gateway.sendBookingConfirmation).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          message: 'Your booking for Manicure on 2024-12-25 at 14:30 has been confirmed.',
        }),
      );
    });

    it('should preserve extra fields in the payload', () => {
      const extendedData: AppointmentNotificationData = {
        ...mockData,
        notes: 'Special request',
        providerId: 'provider-123',
      };

      service.notifyBookingConfirmation(extendedData);

      expect(gateway.sendBookingConfirmation).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          appointmentId: 'apt-1',
          notes: 'Special request',
          providerId: 'provider-123',
          type: 'booking_confirmation',
        }),
      );
    });
  });

  describe('notifyAppointmentUpdate', () => {
    const mockData: AppointmentNotificationData = {
      appointmentId: 'apt-1',
      userId: 'user-1',
      serviceName: 'Facial Treatment',
      date: '2024-06-15',
      time: '11:00',
      status: 'RESCHEDULED',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
    };

    it('should call gateway.sendAppointmentUpdate with correct data', () => {
      service.notifyAppointmentUpdate(mockData);

      expect(gateway.sendAppointmentUpdate).toHaveBeenCalledWith('user-1', {
        ...mockData,
        type: 'appointment_update',
        message: 'Your appointment for Facial Treatment has been updated to RESCHEDULED.',
      });
    });

    it('should include the correct update message with new status', () => {
      const updatedData: AppointmentNotificationData = {
        ...mockData,
        status: 'COMPLETED',
        serviceName: 'Massage',
      };

      service.notifyAppointmentUpdate(updatedData);

      expect(gateway.sendAppointmentUpdate).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          message: 'Your appointment for Massage has been updated to COMPLETED.',
        }),
      );
    });

    it('should handle PENDING status update', () => {
      const pendingData: AppointmentNotificationData = {
        ...mockData,
        status: 'PENDING',
      };

      service.notifyAppointmentUpdate(pendingData);

      expect(gateway.sendAppointmentUpdate).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'appointment_update',
          status: 'PENDING',
        }),
      );
    });
  });

  describe('notifyCancellation', () => {
    const mockData: CancellationNotificationData = {
      appointmentId: 'apt-1',
      userId: 'user-1',
      serviceName: 'Haircut',
      date: '2024-06-15',
      time: '10:00',
      cancelReason: 'Customer requested',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
    };

    it('should call gateway.sendCancellation with correct data', () => {
      service.notifyCancellation(mockData);

      expect(gateway.sendCancellation).toHaveBeenCalledWith('user-1', {
        ...mockData,
        type: 'cancellation',
        message: 'Your appointment for Haircut on 2024-06-15 at 10:00 has been cancelled.',
      });
    });

    it('should include the correct cancellation message', () => {
      const cancelData: CancellationNotificationData = {
        ...mockData,
        serviceName: 'Nail Art',
        date: '2024-07-01',
        time: '15:00',
        cancelReason: 'Staff unavailable',
      };

      service.notifyCancellation(cancelData);

      expect(gateway.sendCancellation).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          message: 'Your appointment for Nail Art on 2024-07-01 at 15:00 has been cancelled.',
        }),
      );
    });

    it('should preserve cancelReason in the payload', () => {
      service.notifyCancellation(mockData);

      expect(gateway.sendCancellation).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          cancelReason: 'Customer requested',
          type: 'cancellation',
        }),
      );
    });
  });

  describe('broadcastNotification', () => {
    it('should call gateway.sendBroadcast with event and data', () => {
      const mockEvent = 'system_maintenance';
      const mockData = { message: 'System will be down for maintenance', duration: '2 hours' };

      service.broadcastNotification(mockEvent, mockData);

      expect(gateway.sendBroadcast).toHaveBeenCalledWith(mockEvent, mockData);
    });

    it('should broadcast with empty data object', () => {
      service.broadcastNotification('test_event', {});

      expect(gateway.sendBroadcast).toHaveBeenCalledWith('test_event', {});
    });

    it('should broadcast complex data structures', () => {
      const complexData = {
        alert: 'High traffic detected',
        metrics: { requests: 1000, errors: 5 },
        timestamp: '2024-06-15T10:00:00Z',
      };

      service.broadcastNotification('traffic_alert', complexData);

      expect(gateway.sendBroadcast).toHaveBeenCalledWith('traffic_alert', complexData);
    });
  });

  describe('isUserConnected', () => {
    it('should return true when user is connected', () => {
      mockNotificationsGateway.isUserConnected.mockReturnValue(true);

      const result = service.isUserConnected('user-1');

      expect(gateway.isUserConnected).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false when user is not connected', () => {
      mockNotificationsGateway.isUserConnected.mockReturnValue(false);

      const result = service.isUserConnected('user-nonexistent');

      expect(result).toBe(false);
    });

    it('should delegate the call to the gateway', () => {
      mockNotificationsGateway.isUserConnected.mockReturnValue(true);

      service.isUserConnected('user-123');

      expect(gateway.isUserConnected).toHaveBeenCalledTimes(1);
      expect(gateway.isUserConnected).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return the number of connected clients', () => {
      mockNotificationsGateway.getConnectedClientsCount.mockReturnValue(5);

      const result = service.getConnectedClientsCount();

      expect(gateway.getConnectedClientsCount).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 when no clients are connected', () => {
      mockNotificationsGateway.getConnectedClientsCount.mockReturnValue(0);

      const result = service.getConnectedClientsCount();

      expect(result).toBe(0);
    });

    it('should delegate the call to the gateway', () => {
      mockNotificationsGateway.getConnectedClientsCount.mockReturnValue(3);

      service.getConnectedClientsCount();

      expect(gateway.getConnectedClientsCount).toHaveBeenCalledTimes(1);
    });
  });
});
