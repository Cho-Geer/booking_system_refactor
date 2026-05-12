import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto, UpdateTimeSlotDto } from './dto/time-slot.dto';
import { isIntegrationMode } from '../../../test/setup/test-env';
import { createTestModule, TestModule } from '../../../test/helpers/create-test-module';
import { createTestService, createTestTimeSlot } from '../../../test/fixtures/database.fixture';

// Mock PrismaService
const mockPrismaService = {
  service: {
    findUnique: jest.fn(),
  },
  timeSlot: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('TimeSlotsService', () => {
  let service: TimeSlotsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeSlotsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TimeSlotsService>(TimeSlotsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockService = {
    id: 'service-1',
    categoryId: 'cat-1',
    name: 'Haircut',
    durationMinutes: 30,
    price: 25.00,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTimeSlot = {
    id: 'slot-1',
    serviceId: 'service-1',
    startTime: new Date('2024-06-15T09:00:00.000Z'),
    endTime: new Date('2024-06-15T09:30:00.000Z'),
    capacity: 1,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    service: mockService,
    _count: { appointments: 0 },
  };

  describe('create', () => {
    const createTimeSlotDto: CreateTimeSlotDto = {
      serviceId: 'service-1',
      startTime: '2024-06-15T09:00:00.000Z',
      endTime: '2024-06-15T09:30:00.000Z',
      capacity: 1,
    };

    it('should throw ConflictException if time slot already exists for same time and service', async () => {
      prisma.timeSlot.findFirst.mockResolvedValue(mockTimeSlot);

      await expect(service.create(createTimeSlotDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createTimeSlotDto)).rejects.toThrow('Time slot already exists for this service and time range');

      expect(prisma.timeSlot.findFirst).toHaveBeenCalledWith({
        where: {
          serviceId: createTimeSlotDto.serviceId,
          startTime: new Date(createTimeSlotDto.startTime),
          endTime: new Date(createTimeSlotDto.endTime),
        },
      });
      expect(prisma.timeSlot.create).not.toHaveBeenCalled();
    });

    it('should create time slot when no duplicate exists', async () => {
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);

      const result = await service.create(createTimeSlotDto);

      expect(prisma.timeSlot.create).toHaveBeenCalledWith({
        data: {
          serviceId: createTimeSlotDto.serviceId,
          startTime: new Date(createTimeSlotDto.startTime),
          endTime: new Date(createTimeSlotDto.endTime),
          capacity: createTimeSlotDto.capacity,
          isActive: true,
        },
        include: {
          service: true,
        },
      });
      expect(result).toEqual(mockTimeSlot);
    });

    it('should include service in created time slot', async () => {
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);

      const result = await service.create(createTimeSlotDto);

      expect(result).toHaveProperty('service');
      expect(result.service).toEqual(mockService);
    });

    it('should check duplicate using serviceId, startTime and endTime', async () => {
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);

      await service.create(createTimeSlotDto);

      expect(prisma.timeSlot.findFirst).toHaveBeenCalledWith({
        where: {
          serviceId: 'service-1',
          startTime: new Date('2024-06-15T09:00:00.000Z'),
          endTime: new Date('2024-06-15T09:30:00.000Z'),
        },
      });
    });

    it('should allow creating multiple slots for different services at same time', async () => {
      const differentServiceDto: CreateTimeSlotDto = {
        serviceId: 'service-2',
        startTime: '2024-06-15T09:00:00.000Z',
        endTime: '2024-06-15T09:30:00.000Z',
        capacity: 1,
      };
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue({ ...mockTimeSlot, serviceId: 'service-2' });

      const result = await service.create(differentServiceDto);

      expect(result.serviceId).toBe('service-2');
    });

    it('should allow creating different time slots for same service', async () => {
      const differentTimeDto: CreateTimeSlotDto = {
        serviceId: 'service-1',
        startTime: '2024-06-15T10:00:00.000Z',
        endTime: '2024-06-15T10:30:00.000Z',
        capacity: 1,
      };
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue({
        ...mockTimeSlot,
        startTime: new Date(differentTimeDto.startTime),
        endTime: new Date(differentTimeDto.endTime),
      });

      const result = await service.create(differentTimeDto);

      expect(result.startTime).toEqual(new Date(differentTimeDto.startTime));
      expect(result.endTime).toEqual(new Date(differentTimeDto.endTime));
    });
  });

  describe('findAll', () => {
    const mockTimeSlots = [
      { ...mockTimeSlot, id: 'slot-1' },
      { ...mockTimeSlot, id: 'slot-2', startTime: new Date('2024-06-15T10:00:00.000Z'), endTime: new Date('2024-06-15T10:30:00.000Z') },
    ];

    it('should return paginated time slots with default pagination', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);
      prisma.timeSlot.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        include: {
          service: true,
        },
        orderBy: { startTime: 'asc' },
      });
      expect(prisma.timeSlot.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        items: mockTimeSlots,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should filter by serviceId when provided', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([mockTimeSlots[0]]);
      prisma.timeSlot.count.mockResolvedValue(1);

      const result = await service.findAll('service-1');

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { serviceId: 'service-1' },
        }),
      );
      expect(prisma.timeSlot.count).toHaveBeenCalledWith({ where: { serviceId: 'service-1' } });
    });

    it('should filter by isActive when true', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);
      prisma.timeSlot.count.mockResolvedValue(2);

      const result = await service.findAll(undefined, true);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should filter by isActive when false', async () => {
      const unavailableSlots = [{ ...mockTimeSlot, id: 'slot-3', isActive: false }];
      prisma.timeSlot.findMany.mockResolvedValue(unavailableSlots);
      prisma.timeSlot.count.mockResolvedValue(1);

      const result = await service.findAll(undefined, false);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: false },
        }),
      );
      expect(result.items).toEqual(unavailableSlots);
    });

    it('should filter by both serviceId and isActive', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([mockTimeSlots[0]]);
      prisma.timeSlot.count.mockResolvedValue(1);

      const result = await service.findAll('service-1', true);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            serviceId: 'service-1',
            isActive: true,
          },
        }),
      );
    });

    it('should support custom pagination', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([mockTimeSlots[0]]);
      prisma.timeSlot.count.mockResolvedValue(2);

      const result = await service.findAll(undefined, undefined, 2, 1);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        }),
      );
       expect(result.meta.page).toBe(2);
       expect(result.meta.limit).toBe(1);
    });

    it('should return empty data when no time slots exist', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([]);
      prisma.timeSlot.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should order results by startTime ascending', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);
      prisma.timeSlot.count.mockResolvedValue(2);

      await service.findAll();

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startTime: 'asc' },
        }),
      );
    });

    it('should include service in returned time slots', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);
      prisma.timeSlot.count.mockResolvedValue(2);

      const result = await service.findAll();

       expect(result.items[0]).toHaveProperty('service');
    });

    it('should calculate totalPages correctly', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);
      prisma.timeSlot.count.mockResolvedValue(25);

      const result = await service.findAll(undefined, undefined, 1, 10);

       expect(result.meta.totalPages).toBe(3);
       expect(result.meta.hasNext).toBe(true);
       expect(result.meta.hasPrev).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return time slot by id with service', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      const result = await service.findOne('slot-1');

      expect(prisma.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        include: {
          service: true,
        },
      });
      expect(result).toEqual(mockTimeSlot);
      expect(result.service).toEqual(mockService);
    });

    it('should throw NotFoundException if time slot not found', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow('Time slot with ID nonexistent-id not found');
    });
  });

  describe('update', () => {
    const updateTimeSlotDto: UpdateTimeSlotDto = {
      isActive: false,
    };

    it('should throw NotFoundException if time slot not found', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateTimeSlotDto)).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent-id', updateTimeSlotDto)).rejects.toThrow('Time slot with ID nonexistent-id not found');
    });

    it('should update time slot successfully', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      const updatedSlot = { ...mockTimeSlot, isActive: false };
      prisma.timeSlot.update.mockResolvedValue(updatedSlot);

      const result = await service.update('slot-1', updateTimeSlotDto);

      expect(prisma.timeSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        data: updateTimeSlotDto,
        include: {
          service: true,
        },
      });
      expect(result).toEqual(updatedSlot);
    });

    it('should mark time slot as unavailable', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      const unavailableSlot = { ...mockTimeSlot, isActive: false };
      prisma.timeSlot.update.mockResolvedValue(unavailableSlot);

      const result = await service.update('slot-1', { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should mark time slot as available', async () => {
      const unavailableSlot = { ...mockTimeSlot, isActive: false };
      prisma.timeSlot.findUnique.mockResolvedValue(unavailableSlot);
      const availableSlot = { ...mockTimeSlot, isActive: true };
      prisma.timeSlot.update.mockResolvedValue(availableSlot);

      const result = await service.update('slot-1', { isActive: true });

      expect(result.isActive).toBe(true);
    });

    it('should include service in updated response', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      prisma.timeSlot.update.mockResolvedValue(mockTimeSlot);

      const result = await service.update('slot-1', { isActive: false });

      expect(result).toHaveProperty('service');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if time slot not found', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent-id')).rejects.toThrow('Time slot with ID nonexistent-id not found');
    });

    it('should delete time slot and return success message', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      prisma.timeSlot.delete.mockResolvedValue(mockTimeSlot);

      const result = await service.remove('slot-1');

      expect(prisma.timeSlot.delete).toHaveBeenCalledWith({ where: { id: 'slot-1' } });
      expect(result).toEqual({ message: 'Time slot deleted successfully' });
    });

    it('should check existence before deletion', async () => {
      prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      prisma.timeSlot.delete.mockResolvedValue(mockTimeSlot);

      await service.remove('slot-1');

      expect(prisma.timeSlot.findUnique).toHaveBeenCalledWith({ where: { id: 'slot-1' } });
    });
  });

  describe('getAvailableSlots', () => {
    const startDate = new Date('2024-06-15T00:00:00.000Z');
    const endDate = new Date('2024-06-15T23:59:59.000Z');

    const availableSlots = [
      { ...mockTimeSlot, id: 'slot-1', startTime: new Date('2024-06-15T09:00:00.000Z'), endTime: new Date('2024-06-15T09:30:00.000Z') },
      { ...mockTimeSlot, id: 'slot-2', startTime: new Date('2024-06-15T10:00:00.000Z'), endTime: new Date('2024-06-15T10:30:00.000Z') },
      { ...mockTimeSlot, id: 'slot-3', startTime: new Date('2024-06-15T11:00:00.000Z'), endTime: new Date('2024-06-15T11:30:00.000Z') },
    ];

    beforeEach(() => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);
    });

    it('should return available time slots for given service and date range', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      const result = await service.getAvailableSlots('service-1', startDate, endDate);

      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-1' },
      });
      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          serviceId: 'service-1',
          isActive: true,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          service: true,
          _count: {
            select: { appointments: true },
          },
        },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 'slot-1',
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        capacity: 1,
        bookedCount: 0,
        available: true,
      });
    });

    it('should fetch service to get durationMinutes', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-1', startDate, endDate);

      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-1' },
      });
    });

    it('should find or create generated time slots', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);
      prisma.timeSlot.findFirst.mockResolvedValue(null);
      prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);

      await service.getAvailableSlots('service-1', startDate, endDate);

      // Should check for existing slot first
      expect(prisma.timeSlot.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            serviceId: 'service-1',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
          },
        }),
      );
      // Should create new slots since none exist
      expect(prisma.timeSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceId: 'service-1',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            capacity: 1,
            isActive: true,
          }),
        }),
      );
    });

    it('should only return available slots (isActive: true)', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-1', startDate, endDate);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should filter by serviceId', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-2', startDate, endDate);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceId: 'service-2',
          }),
        }),
      );
    });

    it('should filter by date range using gte and lte on startTime', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-1', startDate, endDate);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should order results by startTime ascending', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-1', startDate, endDate);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startTime: 'asc' },
        }),
      );
    });

    it('should return slots with mapped fields', async () => {
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      const result = await service.getAvailableSlots('service-1', startDate, endDate);

      expect(result[0]).toMatchObject({
        id: expect.any(String),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        capacity: expect.any(Number),
        bookedCount: expect.any(Number),
        available: expect.any(Boolean),
      });
    });

    it('should return empty array when no slots available', async () => {
      prisma.timeSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots('service-1', startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should handle single day date range', async () => {
      const singleDayStart = new Date('2024-06-15T00:00:00.000Z');
      const singleDayEnd = new Date('2024-06-15T23:59:59.000Z');
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-1', singleDayStart, singleDayEnd);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: singleDayStart,
              lte: singleDayEnd,
            },
          }),
        }),
      );
    });

    it('should handle multi-day date range', async () => {
      const weekStart = new Date('2024-06-15T00:00:00.000Z');
      const weekEnd = new Date('2024-06-21T23:59:59.000Z');
      prisma.timeSlot.findMany.mockResolvedValue(availableSlots);

      await service.getAvailableSlots('service-1', weekStart, weekEnd);

      expect(prisma.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: weekStart,
              lte: weekEnd,
            },
          }),
        }),
      );
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailableSlots('nonexistent-id', startDate, endDate),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.timeSlot.findMany).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// Integration Tests (uses real database via Testcontainers)
// ============================================================
if (isIntegrationMode()) {
  describe('TimeSlotsService (Integration - Real Database)', () => {
    let testModule: TestModule;
    let timeSlotsService: TimeSlotsService;

    beforeAll(async () => {
      testModule = await createTestModule();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TimeSlotsService,
          {
            provide: PrismaService,
            useValue: testModule.prisma,
          },
        ],
      }).compile();

      timeSlotsService = module.get<TimeSlotsService>(TimeSlotsService);
    });

    afterAll(async () => {
      await testModule?.disconnect();
    });

    beforeEach(async () => {
      await testModule.resetDatabase();
    });

    describe('create (Integration)', () => {
      it('should create a time slot in the real database', async () => {
        const service = await createTestService(testModule.prisma);

        const result = await timeSlotsService.create({
          serviceId: service.id,
          startTime: '2026-02-01T09:00:00Z',
          endTime: '2026-02-01T10:00:00Z',
          capacity: 10,
        });

        expect(result).toHaveProperty('id');
        expect(result.serviceId).toBe(service.id);
        expect(result.startTime).toEqual(new Date('2026-02-01T09:00:00Z'));
        expect(result.endTime).toEqual(new Date('2026-02-01T10:00:00Z'));
      });
    });

    describe('findAll (Integration)', () => {
      it('should return paginated time slots from real database', async () => {
        const service = await createTestService(testModule.prisma);
        await createTestTimeSlot(testModule.prisma, service.id, {
          startTime: new Date('2026-03-01T09:00:00Z'),
          endTime: new Date('2026-03-01T10:00:00Z'),
        });
        await createTestTimeSlot(testModule.prisma, service.id, {
          startTime: new Date('2026-03-01T10:00:00Z'),
          endTime: new Date('2026-03-01T11:00:00Z'),
        });

        const result = await timeSlotsService.findAll();
        expect(result.items.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('findOne (Integration)', () => {
      it('should return time slot by id from real database', async () => {
        const service = await createTestService(testModule.prisma);
        const timeSlot = await createTestTimeSlot(testModule.prisma, service.id);

        const result = await timeSlotsService.findOne(timeSlot.id);
        expect(result.id).toBe(timeSlot.id);
      });

      it('should throw NotFoundException for non-existent time slot', async () => {
        await expect(
          timeSlotsService.findOne('00000000-0000-0000-0000-000000000000')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
}
