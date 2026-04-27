import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SlotPreemptionService, ReservationResult } from './slot-preemption.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';

// Mock PrismaService
const mockPrismaService = {
  $transaction: jest.fn(),
  timeSlot: {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
  appointment: {
    create: jest.fn(),
  },
};

// Mock RateLimiterService
const mockRateLimiterService = {
  isAllowed: jest.fn(),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    setex: jest.fn(),
  }),
};

describe('SlotPreemptionService', () => {
  let service: SlotPreemptionService;
  let prisma: typeof mockPrismaService;
  let rateLimiter: typeof mockRateLimiterService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotPreemptionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RateLimiterService,
          useValue: mockRateLimiterService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<SlotPreemptionService>(SlotPreemptionService);
    prisma = module.get(PrismaService);
    rateLimiter = module.get(RateLimiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveSlot', () => {
    const mockInput = {
      userId: 'user-123',
      slotId: 'slot-456',
      preferSeq: 3,
      serviceId: 'service-789',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      notes: 'Test notes',
    };

    it('should reject reservation when rate limited', async () => {
      mockRateLimiterService.isAllowed.mockResolvedValue({ allowed: false, retryAfter: 1 });

      const result = await service.reserveSlot(mockInput);

      expect(result.success).toBe(false);
      expect(result.status).toBe('RATE_LIMITED');
      expect(result.retryAfter).toBe(1);
      expect(rateLimiter.isAllowed).toHaveBeenCalledWith(
        'user-123',
        '/slots/slot-456/reserve',
        'strict',
        1,
        1,
      );
    });

    it('should return cached result for idempotent request', async () => {
      mockRateLimiterService.isAllowed.mockResolvedValue({ allowed: true });

      const cachedResult: ReservationResult = {
        success: true,
        status: 'SUCCESS',
        appointment: { id: 'cached-appointment' },
        allocatedSeq: 3,
      };

      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(JSON.stringify(cachedResult)),
        setex: jest.fn(),
      };
      mockRateLimiterService.getRedisClient.mockReturnValue(mockRedisClient);

      const result = await service.reserveSlot({
        ...mockInput,
        idempotencyKey: 'test-idempotency-key',
      });

      expect(result).toEqual(cachedResult);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should successfully reserve slot on first attempt', async () => {
      mockRateLimiterService.isAllowed.mockResolvedValue({ allowed: true });

      const mockAppointment = {
        id: 'appointment-123',
        userId: 'user-123',
        timeSlotId: 'slot-456',
        serviceId: 'service-789',
        status: 'PENDING',
      };

      prisma.$transaction.mockResolvedValue({
        success: true,
        appointment: mockAppointment,
        allocatedSeq: 3,
      });

      const result = await service.reserveSlot(mockInput);

      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
      expect(result.appointment).toEqual(mockAppointment);
      expect(result.allocatedSeq).toBe(3);
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: 'Serializable',
          timeout: 5000,
        },
      );
    });

    it('should retry with exponential backoff on conflict', async () => {
      mockRateLimiterService.isAllowed.mockResolvedValue({ allowed: true });

      // First attempt fails, second succeeds
      prisma.$transaction
        .mockResolvedValueOnce({ success: false, reason: 'VERSION_CONFLICT' })
        .mockResolvedValueOnce({
          success: true,
          appointment: { id: 'appointment-123' },
          allocatedSeq: 4,
        });

      const result = await service.reserveSlot(mockInput);

      expect(result.success).toBe(true);
      expect(result.allocatedSeq).toBe(4);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should return 409 when all sequences exhausted', async () => {
      mockRateLimiterService.isAllowed.mockResolvedValue({ allowed: true });

      // All 3 attempts fail
      prisma.$transaction.mockResolvedValue({ success: false, reason: 'VERSION_CONFLICT' });

      const result = await service.reserveSlot(mockInput);

      expect(result.success).toBe(false);
      expect(result.status).toBe('CONFLICT');
      expect(result.reason).toContain('maximum retries exceeded');
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should handle transaction timeout gracefully', async () => {
      mockRateLimiterService.isAllowed.mockResolvedValue({ allowed: true });

      const timeoutError = Object.assign(new Error('Transaction timeout'), { code: 'P2034' });

      prisma.$transaction.mockRejectedValue(timeoutError);

      const result = await service.reserveSlot(mockInput);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toContain('Database timeout');
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should generate consistent key for same input', () => {
      const timestamp = 1000000;
      const key1 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-1', timestamp);
      const key2 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-1', timestamp);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash format
    });

    it('should generate different keys for different users', () => {
      const timestamp = 1000000;
      const key1 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-1', timestamp);
      const key2 = SlotPreemptionService.generateIdempotencyKey('user-2', 'slot-1', timestamp);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different slots', () => {
      const timestamp = 1000000;
      const key1 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-1', timestamp);
      const key2 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-2', timestamp);

      expect(key1).not.toBe(key2);
    });

    it('should use second-level granularity for timestamp', () => {
      const key1 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-1', 1000);
      const key2 = SlotPreemptionService.generateIdempotencyKey('user-1', 'slot-1', 1500);

      // Both should be in the same second (1000ms and 1500ms both floor to 1s)
      expect(key1).toBe(key2);
    });
  });
});
