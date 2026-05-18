import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { SlotPreemptionController, ReserveSlotDto } from './slot-preemption.controller';
import { SlotPreemptionService, ReservationResult } from './slot-preemption.service';

// Matches the AuthenticatedRequest interface from the controller
type AuthenticatedRequest = Request & { user?: { id: string; [key: string]: unknown } };

// Mock SlotPreemptionService
const mockSlotPreemptionService = {
  reserveSlot: jest.fn(),
};

describe('SlotPreemptionController', () => {
  let controller: SlotPreemptionController;
  let service: typeof mockSlotPreemptionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlotPreemptionController],
      providers: [
        {
          provide: SlotPreemptionService,
          useValue: mockSlotPreemptionService,
        },
      ],
    }).compile();

    controller = module.get<SlotPreemptionController>(SlotPreemptionController);
    service = module.get(SlotPreemptionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('reserveSlot', () => {
    const mockBody: ReserveSlotDto = {
      preferSeq: 3,
      serviceId: 'service-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      notes: 'Test notes',
    };

    const mockUserId = 'user-456';
    const mockSlotId = 'slot-789';
    const mockReq = { user: { id: mockUserId } } as AuthenticatedRequest;

    it('should throw BadRequestException when preferSeq is out of range (negative)', async () => {
      const invalidBody = { ...mockBody, preferSeq: -1 };

      await expect(controller.reserveSlot(mockSlotId, invalidBody, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when preferSeq is out of range (>= 10)', async () => {
      const invalidBody = { ...mockBody, preferSeq: 10 };

      await expect(controller.reserveSlot(mockSlotId, invalidBody, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when userId is missing', async () => {
      const reqWithoutUser = { user: null } as unknown as AuthenticatedRequest;

      await expect(controller.reserveSlot(mockSlotId, mockBody, reqWithoutUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 201 with appointment on success', async () => {
      const mockResult: ReservationResult = {
        success: true,
        status: 'SUCCESS',
        appointment: {
          id: 'appointment-123',
          userId: mockUserId,
          timeSlotId: mockSlotId,
          serviceId: mockBody.serviceId,
          status: 'PENDING',
        },
        allocatedSeq: 3,
      };

      mockSlotPreemptionService.reserveSlot.mockResolvedValue(mockResult);

      const result = await controller.reserveSlot(mockSlotId, mockBody, mockReq);

      expect(result.success).toBe(true);
      expect(result.appointment).toEqual(mockResult.appointment);
      expect(result.allocatedSeq).toBe(3);
      expect(service.reserveSlot).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          slotId: mockSlotId,
          preferSeq: mockBody.preferSeq,
          serviceId: mockBody.serviceId,
        }),
      );
    });

    it('should return 429 when rate limited', async () => {
      const mockResult: ReservationResult = {
        success: false,
        status: 'RATE_LIMITED',
        retryAfter: 1,
        reason: 'Rate limit exceeded. Please try again later.',
      };

      mockSlotPreemptionService.reserveSlot.mockResolvedValue(mockResult);

      const result = await controller.reserveSlot(mockSlotId, mockBody, mockReq);

      expect(result.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(result.retryAfter).toBe(1);
    });

    it('should return 409 when conflict after retries', async () => {
      const mockResult: ReservationResult = {
        success: false,
        status: 'CONFLICT',
        reason: 'Slot reservation failed: maximum retries exceeded',
      };

      mockSlotPreemptionService.reserveSlot.mockResolvedValue(mockResult);

      const result = await controller.reserveSlot(mockSlotId, mockBody, mockReq);

      expect(result.statusCode).toBe(HttpStatus.CONFLICT);
      expect(result.message).toContain('maximum retries exceeded');
    });

    it('should return 503 when service unavailable', async () => {
      const mockResult: ReservationResult = {
        success: false,
        status: 'FAILED',
        reason: 'Database timeout. Service temporarily unavailable.',
      };

      mockSlotPreemptionService.reserveSlot.mockResolvedValue(mockResult);

      const result = await controller.reserveSlot(mockSlotId, mockBody, mockReq);

      expect(result.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should pass idempotency key to service when provided', async () => {
      mockSlotPreemptionService.reserveSlot.mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        appointment: {},
        allocatedSeq: 3,
      });

      await controller.reserveSlot(mockSlotId, mockBody, mockReq, 'test-idempotency-key');

      expect(service.reserveSlot).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'test-idempotency-key',
        }),
      );
    });

    it('should accept preferSeq at boundary value 0', async () => {
      const boundaryBody = { ...mockBody, preferSeq: 0 };

      mockSlotPreemptionService.reserveSlot.mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        appointment: {},
        allocatedSeq: 0,
      });

      const result = await controller.reserveSlot(mockSlotId, boundaryBody, mockReq);

      expect(result.success).toBe(true);
    });

    it('should accept preferSeq at boundary value 9', async () => {
      const boundaryBody = { ...mockBody, preferSeq: 9 };

      mockSlotPreemptionService.reserveSlot.mockResolvedValue({
        success: true,
        status: 'SUCCESS',
        appointment: {},
        allocatedSeq: 9,
      });

      const result = await controller.reserveSlot(mockSlotId, boundaryBody, mockReq);

      expect(result.success).toBe(true);
    });
  });
});
