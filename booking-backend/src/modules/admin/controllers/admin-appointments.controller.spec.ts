import { Test, TestingModule } from '@nestjs/testing';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAppointmentsService } from '../services/admin-appointments.service';
import { BatchCancelDto } from '../dto/admin-appointment.dto';

describe('AdminAppointmentsController', () => {
  let controller: AdminAppointmentsController;

  const mockService = {
    batchCancel: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAppointmentsController],
      providers: [
        { provide: AdminAppointmentsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AdminAppointmentsController>(AdminAppointmentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('batchCancel', () => {
    const dto: BatchCancelDto = {
      ids: ['apt-001', 'apt-002'],
      reason: 'Customer requested cancellation',
    };

    it('should pass req.user.id to service.batchCancel as performedBy', async () => {
      // Arrange
      const req = { user: { id: 'admin-001' } };
      mockService.batchCancel.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
        failedIds: [],
      });

      // Act
      await controller.batchCancel(dto, req);

      // Assert
      expect(mockService.batchCancel).toHaveBeenCalledWith(dto, 'admin-001');
    });

    it('should handle undefined req.user gracefully', async () => {
      // Arrange
      const req = {};
      mockService.batchCancel.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
        failedIds: [],
      });

      // Act
      await controller.batchCancel(dto, req);

      // Assert
      expect(mockService.batchCancel).toHaveBeenCalledWith(dto, undefined);
    });

    it('should return the result from service.batchCancel', async () => {
      // Arrange
      const req = { user: { id: 'admin-001' } };
      const expectedResult = {
        successCount: 1,
        failedCount: 1,
        failedIds: ['apt-002'],
      };
      mockService.batchCancel.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.batchCancel(dto, req);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
