import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto, UpdateTimeSlotDto } from './dto/time-slot.dto';

// Mock TimeSlotsService
const mockTimeSlotsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getAvailableSlots: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('TimeSlotsController', () => {
  let controller: TimeSlotsController;
  let service: typeof mockTimeSlotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeSlotsController],
      providers: [
        {
          provide: TimeSlotsService,
          useValue: mockTimeSlotsService,
        },
      ],
    }).compile();

    controller = module.get<TimeSlotsController>(TimeSlotsController);
    service = module.get(TimeSlotsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createTimeSlotDto: CreateTimeSlotDto = {
      serviceId: 'service-1',
      startTime: '2024-06-15T10:00:00.000Z',
      endTime: '2024-06-15T11:00:00.000Z',
      capacity: 1,
    };

    const mockTimeSlot = {
      id: 'slot-1',
      ...createTimeSlotDto,
      startTime: new Date(createTimeSlotDto.startTime),
      endTime: new Date(createTimeSlotDto.endTime),
      serviceId: 'service-1',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should call service.create and return the created time slot', async () => {
      mockTimeSlotsService.create.mockResolvedValue(mockTimeSlot);

      const result = await controller.create(createTimeSlotDto);

      expect(service.create).toHaveBeenCalledWith(createTimeSlotDto);
      expect(result).toEqual(mockTimeSlot);
    });

    it('should propagate ConflictException for duplicate time slot', async () => {
      mockTimeSlotsService.create.mockRejectedValue(
        new (class extends Error {
          statusCode = 409;
          message = 'Time slot already exists';
        })(),
      );

      await expect(controller.create(createTimeSlotDto)).rejects.toThrow(
        'Time slot already exists',
      );
    });
  });

  describe('findAll', () => {
    const mockTimeSlots = [
      { id: 'slot-1', serviceId: 'service-1', isActive: true },
      { id: 'slot-2', serviceId: 'service-1', isActive: true },
    ];

    it('should call service.findAll with default pagination', async () => {
      mockTimeSlotsService.findAll.mockResolvedValue({
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

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, 1, 20);
      expect(result.items).toEqual(mockTimeSlots);
      expect(result.meta.total).toBe(2);
    });

    it('should call service.findAll with serviceId filter', async () => {
      mockTimeSlotsService.findAll.mockResolvedValue({
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

      await controller.findAll('service-1');

      expect(service.findAll).toHaveBeenCalledWith('service-1', undefined, 1, 20);
    });

    it('should call service.findAll with isActive filter', async () => {
      mockTimeSlotsService.findAll.mockResolvedValue({
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

      await controller.findAll(undefined, true);

      expect(service.findAll).toHaveBeenCalledWith(undefined, true, 1, 20);
    });

    it('should call service.findAll with all filters and custom pagination', async () => {
      mockTimeSlotsService.findAll.mockResolvedValue({
        items: [mockTimeSlots[0]],
        meta: {
          total: 1,
          page: 1,
          limit: 5,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const result = await controller.findAll('service-1', true, 1, 5);

      expect(service.findAll).toHaveBeenCalledWith('service-1', true, 1, 5);
      expect(result.meta.limit).toBe(5);
    });

    it('should return empty data when no time slots exist', async () => {
      mockTimeSlotsService.findAll.mockResolvedValue({
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

      const result = await controller.findAll();

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getAvailableSlots', () => {
    const mockAvailableSlots = [
      {
        id: 'slot-1',
        startTime: new Date('2024-06-15T10:00:00.000Z'),
        endTime: new Date('2024-06-15T10:30:00.000Z'),
        capacity: 5,
        bookedCount: 2,
      },
      {
        id: 'slot-2',
        startTime: new Date('2024-06-15T11:00:00.000Z'),
        endTime: new Date('2024-06-15T11:30:00.000Z'),
        capacity: 5,
        bookedCount: 0,
      },
    ];

    it('should call service.getAvailableSlots with correct parameters', async () => {
      mockTimeSlotsService.getAvailableSlots.mockResolvedValue(mockAvailableSlots);

      const result = await controller.getAvailableSlots('service-1', '2024-06-15', '2024-06-16');

      expect(service.getAvailableSlots).toHaveBeenCalledWith(
        'service-1',
        new Date('2024-06-15'),
        new Date('2024-06-16'),
        undefined,
      );
      expect(result).toEqual(mockAvailableSlots);
    });

    it('should return empty array when no slots are available', async () => {
      mockTimeSlotsService.getAvailableSlots.mockResolvedValue([]);

      const result = await controller.getAvailableSlots('service-1', '2024-12-25', '2024-12-26');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const mockTimeSlot = {
      id: 'slot-1',
      serviceId: 'service-1',
      startTime: new Date('2024-06-15T10:00:00.000Z'),
      endTime: new Date('2024-06-15T10:30:00.000Z'),
      isActive: true,
    };

    it('should call service.findOne and return the time slot', async () => {
      mockTimeSlotsService.findOne.mockResolvedValue(mockTimeSlot);

      const result = await controller.findOne('slot-1');

      expect(service.findOne).toHaveBeenCalledWith('slot-1');
      expect(result).toEqual(mockTimeSlot);
    });

    it('should propagate NotFoundException from service.findOne', async () => {
      mockTimeSlotsService.findOne.mockRejectedValue(
        new NotFoundException('Time slot with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Time slot with ID invalid-id not found',
      );
    });
  });

  describe('update', () => {
    const updateTimeSlotDto: UpdateTimeSlotDto = {
      isActive: false,
      capacity: 10,
    };

    const mockUpdatedTimeSlot = {
      id: 'slot-1',
      serviceId: 'service-1',
      isActive: false,
      capacity: 10,
    };

    it('should call service.update and return the updated time slot', async () => {
      mockTimeSlotsService.update.mockResolvedValue(mockUpdatedTimeSlot);

      const result = await controller.update('slot-1', updateTimeSlotDto);

      expect(service.update).toHaveBeenCalledWith('slot-1', updateTimeSlotDto);
      expect(result).toEqual(mockUpdatedTimeSlot);
    });

    it('should propagate NotFoundException from service.update', async () => {
      mockTimeSlotsService.update.mockRejectedValue(
        new NotFoundException('Time slot with ID invalid-id not found'),
      );

      await expect(controller.update('invalid-id', updateTimeSlotDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove and return success message', async () => {
      mockTimeSlotsService.remove.mockResolvedValue({ message: 'Time slot deleted successfully' });

      const result = await controller.remove('slot-1');

      expect(service.remove).toHaveBeenCalledWith('slot-1');
      expect(result).toEqual({ message: 'Time slot deleted successfully' });
    });

    it('should propagate NotFoundException from service.remove', async () => {
      mockTimeSlotsService.remove.mockRejectedValue(
        new NotFoundException('Time slot with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
