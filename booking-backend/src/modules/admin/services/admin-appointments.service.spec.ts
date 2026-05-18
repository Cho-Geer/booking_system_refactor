import { Test, TestingModule } from '@nestjs/testing';
import { AdminAppointmentsService } from './admin-appointments.service';
import { PrismaService } from '../../../common/database/prisma.service';
import { NotificationService } from '../../../modules/notifications/notification.service';
import { EmailService } from '../../../modules/email/email.service';
import { BatchCancelDto, CreateAdminAppointmentDto } from '../dto/admin-appointment.dto';
import { toAdminAppointmentDto } from '../mappers/appointment.mapper';

jest.mock('../mappers/appointment.mapper', () => ({
  toAdminAppointmentDto: jest.fn(),
  generateAppointmentNumber: jest.fn().mockReturnValue('APT-MOCK-001'),
}));

describe('AdminAppointmentsService', () => {
  let service: AdminAppointmentsService;
  let prisma: any;
  let notificationService: any;
  let emailService: any;

  const mockAppointment = {
    id: 'apt-001',
    userId: 'user-001',
    serviceId: 'svc-001',
    timeSlotId: 'slot-001',
    appointmentNumber: 'APT-20260517-001',
    appointmentDate: new Date('2026-05-17T10:00:00Z'),
    status: 'PENDING',
    durationMinutes: 60,
    remarks: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerInfo: {},
    slotSequence: 0,
    price: null,
    taxRate: null,
    taxIncludedAmount: null,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    service: {
      id: 'svc-001',
      name: 'Consultation',
      durationMinutes: 60,
      price: 100,
      taxRate: 0.08,
    },
    timeSlot: {
      startTime: new Date('2026-05-17T10:00:00Z'),
      endTime: new Date('2026-05-17T11:00:00Z'),
    },
  };

  const mockPrismaService = {
    id: 'svc-001',
    name: 'Consultation',
    durationMinutes: 60,
    price: 100,
    taxRate: 0.08,
    isActive: true,
  };

  const mockPrismaTimeSlot = {
    id: 'slot-001',
    startTime: new Date('2026-05-17T10:00:00Z'),
    endTime: new Date('2026-05-17T11:00:00Z'),
    isActive: true,
  };

  const createDtoBase = {
    userId: 'user-001',
    serviceId: 'svc-001',
    appointmentDate: '2026-05-17T10:00:00Z',
    timeSlotId: 'slot-001',
  };

  beforeEach(async () => {
    // Create mock PrismaService with chainable methods
    const mockPrisma: Record<string, any> = {
      appointment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
      timeSlot: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    const mockNotificationService = {
      notifyCancellation: jest.fn(),
      notifyBookingConfirmation: jest.fn(),
      notifyAppointmentUpdate: jest.fn(),
    };

    const mockEmailService = {
      sendAppointmentCancellation: jest.fn(),
      sendAppointmentConfirmation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AdminAppointmentsService>(AdminAppointmentsService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('batchCancel', () => {
    const dto: BatchCancelDto = {
      ids: ['apt-001', 'apt-002'],
      reason: 'Customer requested cancellation',
    };

    it('should cancel appointments and return success count', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-002', status: 'CONFIRMED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      const result = await service.batchCancel(dto);

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.failedIds).toEqual([]);
    });

    it('should pass performedBy to activity log metadata', async () => {
      // Arrange
      const performedBy = 'admin-001';
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.batchCancel(dto, performedBy);

      // Assert
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'BOOKING_CANCEL',
            resourceType: 'APPOINTMENT',
            resourceId: 'apt-001',
            metadata: expect.objectContaining({
              performedBy: 'admin-001',
            }),
          }),
        }),
      );
    });

    it('should create activity log for each cancelled appointment', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-002', status: 'CONFIRMED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.batchCancel(dto);

      // Assert
      expect(prisma.activityLog.create).toHaveBeenCalledTimes(2);
    });

    it('should call notificationService.notifyCancellation for each cancelled appointment (fire-and-forget)', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-002', status: 'CONFIRMED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.batchCancel(dto);

      // Assert
      expect(notificationService.notifyCancellation).toHaveBeenCalledTimes(2);
      expect(notificationService.notifyCancellation).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: 'apt-001',
          cancelReason: 'Customer requested cancellation',
        }),
      );
    });

    it('should call emailService.sendAppointmentCancellation for each cancelled appointment (fire-and-forget)', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-002', status: 'CONFIRMED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.batchCancel(dto);

      // Assert
      expect(emailService.sendAppointmentCancellation).toHaveBeenCalledTimes(2);
      expect(emailService.sendAppointmentCancellation).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: 'apt-001',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          cancelReason: 'Customer requested cancellation',
        }),
      );
    });

    it('should handle errors in notification fire-and-forget without breaking the batch', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-002', status: 'CONFIRMED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });
      notificationService.notifyCancellation.mockImplementation(() => {
        throw new Error('WebSocket disconnected');
      });

      // Act
      const result = await service.batchCancel(dto);

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle errors in email fire-and-forget without breaking the batch', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-002', status: 'CONFIRMED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });
      emailService.sendAppointmentCancellation.mockImplementation(() => {
        throw new Error('Queue unavailable');
      });

      // Act
      const result = await service.batchCancel(dto);

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should skip already cancelled appointments', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'CANCELLED' });

      // Act
      const result = await service.batchCancel({ ids: ['apt-001'], reason: 'test' });

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedIds).toEqual(['apt-001']);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
      expect(prisma.activityLog.create).not.toHaveBeenCalled();
    });

    it('should add non-existent appointments to failedIds', async () => {
      // Arrange
      prisma.appointment.findUnique.mockResolvedValueOnce(null);

      // Act
      const result = await service.batchCancel({ ids: ['apt-999'], reason: 'test' });

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedIds).toEqual(['apt-999']);
    });

    it('should handle mixed results (some succeed, some fail)', async () => {
      // Arrange
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' })
        .mockResolvedValueOnce(null) // non-existent
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-003', status: 'CANCELLED' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      const result = await service.batchCancel({
        ids: ['apt-001', 'apt-002', 'apt-003'],
        reason: 'test',
      });

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(2);
      expect(result.failedIds).toEqual(['apt-002', 'apt-003']);
    });

    it('should update appointment remarks with reason when provided', async () => {
      // Arrange
      const reason = 'Customer no-show policy';
      prisma.appointment.findUnique
        .mockResolvedValueOnce({ ...mockAppointment, id: 'apt-001', status: 'PENDING' });
      prisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'CANCELLED' });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.batchCancel({ ids: ['apt-001'], reason });

      // Assert
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-001' },
          data: expect.objectContaining({
            status: 'CANCELLED',
            remarks: reason,
          }),
        }),
      );
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.service.findUnique.mockResolvedValue(mockPrismaService);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-001', name: 'John Doe' });
      prisma.timeSlot.findUnique.mockResolvedValue(mockPrismaTimeSlot);
    });

    it('[RED] should use overtimeMinutes in duration calculation', async () => {
      // Arrange
      const dto: CreateAdminAppointmentDto = {
        ...createDtoBase,
        overtimeMinutes: 15,
      };

      prisma.appointment.create.mockResolvedValue({
        ...mockAppointment,
        durationMinutes: 75, // 60 + 15
      });
      (toAdminAppointmentDto as jest.Mock).mockReturnValue({
        ...mockAppointment,
        durationMinutes: 75,
      });

      // Act
      const result = await service.create(dto);

      // Assert
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationMinutes: 75, // service.durationMinutes(60) + overtimeMinutes(15)
          }),
        }),
      );
      expect(result.durationMinutes).toBe(75);
    });

    it('[RED] should not add overtimeMinutes when not provided', async () => {
      // Arrange
      const dto: CreateAdminAppointmentDto = {
        ...createDtoBase,
      };

      prisma.timeSlot.findFirst.mockResolvedValue(mockPrismaTimeSlot);
      prisma.appointment.create.mockResolvedValue({
        ...mockAppointment,
        durationMinutes: 60,
      });
      (toAdminAppointmentDto as jest.Mock).mockReturnValue({
        ...mockAppointment,
        durationMinutes: 60,
      });

      // Act
      const result = await service.create(dto);

      // Assert
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationMinutes: 60, // service.durationMinutes(60) + undefined = 60
          }),
        }),
      );
      expect(result.durationMinutes).toBe(60);
    });
  });
});
