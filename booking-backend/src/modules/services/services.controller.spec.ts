import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

// Mock ServicesService
const mockServicesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: typeof mockServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    service = module.get(ServicesService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createServiceDto: CreateServiceDto = {
      categoryId: 'cat-1',
      name: 'Haircut',
      description: 'Professional haircut service',
      durationMinutes: 30,
      price: 50,
      maxCapacity: 1,
    };

    const mockService = {
      id: 'svc-1',
      ...createServiceDto,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should call service.create and return the created service', async () => {
      mockServicesService.create.mockResolvedValue(mockService);

      const result = await controller.create(createServiceDto);

      expect(service.create).toHaveBeenCalledWith(createServiceDto);
      expect(result).toEqual(mockService);
    });

    it('should propagate ConflictException for duplicate service name', async () => {
      mockServicesService.create.mockRejectedValue(
        new (class extends Error {
          statusCode = 409;
          message = 'Service with this name already exists';
        })(),
      );

      await expect(controller.create(createServiceDto)).rejects.toThrow('Service with this name already exists');
    });
  });

  describe('findAll', () => {
    const mockServices = [
      { id: 'svc-1', name: 'Haircut', isActive: true },
      { id: 'svc-2', name: 'Manicure', isActive: true },
    ];

    it('should call service.findAll with default pagination', async () => {
      mockServicesService.findAll.mockResolvedValue({
        items: mockServices,
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

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined);
      expect(result.items).toEqual(mockServices);
      expect(result.meta.total).toBe(2);
    });

    it('should call service.findAll with isActive filter', async () => {
      mockServicesService.findAll.mockResolvedValue({
        items: mockServices,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      await controller.findAll(1, 10, true);

      expect(service.findAll).toHaveBeenCalledWith(1, 10, true);
    });

    it('should call service.findAll with isActive=false filter', async () => {
      mockServicesService.findAll.mockResolvedValue({
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

      const result = await controller.findAll(1, 10, false);

      expect(service.findAll).toHaveBeenCalledWith(1, 10, false);
      expect(result.items).toEqual([]);
    });

    it('should call service.findAll with custom pagination', async () => {
      mockServicesService.findAll.mockResolvedValue({
        items: [mockServices[0]],
        meta: {
          total: 2,
          page: 1,
          limit: 1,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      });

      const result = await controller.findAll(1, 1);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, undefined);
      expect(result.meta.limit).toBe(1);
      expect(result.meta.totalPages).toBe(2);
    });

    it('should return empty data when no services exist', async () => {
      mockServicesService.findAll.mockResolvedValue({
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

  describe('findOne', () => {
    const mockService = {
      id: 'svc-1',
      name: 'Haircut',
      description: 'Professional haircut',
      durationMinutes: 30,
      price: 50,
      isActive: true,
    };

    it('should call service.findOne and return the service', async () => {
      mockServicesService.findOne.mockResolvedValue(mockService);

      const result = await controller.findOne('svc-1');

      expect(service.findOne).toHaveBeenCalledWith('svc-1');
      expect(result).toEqual(mockService);
    });

    it('should propagate NotFoundException from service.findOne', async () => {
      mockServicesService.findOne.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('invalid-id')).rejects.toThrow('Service with ID invalid-id not found');
    });
  });

  describe('update', () => {
    const updateServiceDto: UpdateServiceDto = {
      name: 'Updated Haircut',
      price: 75,
    };

    const mockUpdatedService = {
      id: 'svc-1',
      name: 'Updated Haircut',
      price: 75,
      isActive: true,
    };

    it('should call service.update and return the updated service', async () => {
      mockServicesService.update.mockResolvedValue(mockUpdatedService);

      const result = await controller.update('svc-1', updateServiceDto);

      expect(service.update).toHaveBeenCalledWith('svc-1', updateServiceDto);
      expect(result).toEqual(mockUpdatedService);
    });

    it('should propagate NotFoundException from service.update', async () => {
      mockServicesService.update.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(controller.update('invalid-id', updateServiceDto)).rejects.toThrow(NotFoundException);
    });

    it('should allow updating isActive status', async () => {
      const deactivationDto: UpdateServiceDto = { isActive: false };
      mockServicesService.update.mockResolvedValue({
        id: 'svc-1',
        name: 'Haircut',
        isActive: false,
      });

      const result = await controller.update('svc-1', deactivationDto);

      expect(service.update).toHaveBeenCalledWith('svc-1', deactivationDto);
      expect(result.isActive).toBe(false);
    });
  });

  // ============================================================
  // [TDD-RED] BE-CATEGORY-NULLABLE: Controller tests for nullable categoryId
  // These tests are expected to FAIL because CreateServiceDto.categoryId is required (string).
  // ============================================================
  describe('categoryId nullable [RED phase - expected failures]', () => {
    it('should create service without categoryId in request body [RED - categoryId required]', async () => {
      // This test should FAIL because CreateServiceDto.categoryId is required.
      const createDto: CreateServiceDto = {
        name: 'Controller No Category',
        description: 'Created without category',
        durationMinutes: 30,
        price: 75.00,
        maxCapacity: 1,
        // categoryId intentionally omitted — TypeScript error
      };

      const expectedService = {
        id: 'svc-no-cat',
        ...createDto,
        categoryId: null,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockServicesService.create.mockResolvedValue(expectedService);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result.categoryId).toBeNull();
    });

    it('should handle null categoryId from request body [RED - null not assignable]', async () => {
      // This test should FAIL because null is not assignable to CreateServiceDto.categoryId (string).
      const createDto: CreateServiceDto = {
        categoryId: null, // TypeScript error: null is not assignable to string
        name: 'Null Category Service',
        description: 'Service with explicitly null category',
        durationMinutes: 60,
        price: 120.00,
        maxCapacity: 2,
      };

      const expectedService = {
        id: 'svc-null-cat',
        ...createDto,
        categoryId: null,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockServicesService.create.mockResolvedValue(expectedService);

      const result = await controller.create(createDto);

      expect(result.categoryId).toBeNull();
    });
  });

  describe('remove', () => {
    it('should call service.remove and return success message', async () => {
      mockServicesService.remove.mockResolvedValue({ message: 'Service deleted successfully' });

      const result = await controller.remove('svc-1');

      expect(service.remove).toHaveBeenCalledWith('svc-1');
      expect(result).toEqual({ message: 'Service deleted successfully' });
    });

    it('should propagate NotFoundException from service.remove', async () => {
      mockServicesService.remove.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
