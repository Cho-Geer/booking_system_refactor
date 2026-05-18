import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

// Mock PrismaService
const mockPrismaService = {
  service: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockCategory = {
    id: 'cat-1',
    name: 'Hair Services',
    description: 'All hair related services',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockService = {
    id: 'service-1',
    categoryId: 'cat-1',
    name: 'Haircut',
    description: 'Standard haircut',
    durationMinutes: 30,
    price: 25.0,
    maxCapacity: 1,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    category: mockCategory,
  };

  describe('create', () => {
    const createServiceDto: CreateServiceDto = {
      categoryId: 'cat-1',
      name: 'Haircut',
      description: 'Standard haircut',
      durationMinutes: 30,
      price: 25.0,
      maxCapacity: 1,
    };

    it('should create a new service with category included', async () => {
      prisma.service.create.mockResolvedValue(mockService);

      const result = await service.create(createServiceDto);

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: createServiceDto,
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockService);
      expect(result.category).toEqual(mockCategory);
    });

    it('should create service without optional fields', async () => {
      const minimalDto: CreateServiceDto = {
        categoryId: 'cat-1',
        name: 'Basic Service',
        durationMinutes: 15,
        price: 10.0,
      };
      const minimalService = {
        ...mockService,
        id: 'service-2',
        name: 'Basic Service',
        description: undefined,
        maxCapacity: undefined,
      };
      prisma.service.create.mockResolvedValue(minimalService);

      const result = await service.create(minimalDto);

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: minimalDto,
        include: {
          category: true,
        },
      });
      expect(result).toEqual(minimalService);
    });
  });

  describe('findAll', () => {
    const mockServices = [
      { ...mockService, id: 'service-1' },
      { ...mockService, id: 'service-2', name: 'Hair Styling' },
    ];

    it('should return paginated services with default pagination', async () => {
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.service.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
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
    });

    it('should return paginated services with custom pagination', async () => {
      prisma.service.findMany.mockResolvedValue([mockServices[0]]);
      prisma.service.count.mockResolvedValue(2);

      const result = await service.findAll(2, 1);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
        where: {},
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(1);
    });

    it('should filter by active status when isActive is true', async () => {
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(2);

      const result = await service.findAll(1, 10, true);

      expect(result.items.length).toBeGreaterThan(0);
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { isActive: true },
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.service.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('should filter by inactive status when isActive is false', async () => {
      const inactiveServices = [{ ...mockService, id: 'service-3', isActive: false }];
      prisma.service.findMany.mockResolvedValue(inactiveServices);
      prisma.service.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10, false);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { isActive: false },
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toEqual(inactiveServices);
    });

    it('should not filter by isActive when undefined', async () => {
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(2);

      await service.findAll(1, 10, undefined);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should return empty data when no services exist', async () => {
      prisma.service.findMany.mockResolvedValue([]);
      prisma.service.count.mockResolvedValue(0);

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

    it('should calculate totalPages correctly with remainder', async () => {
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(25);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should include category in returned services', async () => {
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result.items[0]).toHaveProperty('category');
      expect(result.items[0].category).toEqual(mockCategory);
    });
  });

  describe('findOne', () => {
    it('should return service by id with category', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);

      const result = await service.findOne('service-1');

      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockService);
      expect(result.category).toEqual(mockCategory);
    });

    it('should throw NotFoundException if service not found', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Service with ID nonexistent-id not found',
      );
    });
  });

  describe('update', () => {
    const updateServiceDto: UpdateServiceDto = {
      name: 'Updated Haircut',
      price: 30.0,
    };

    it('should throw NotFoundException if service not found', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateServiceDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('nonexistent-id', updateServiceDto)).rejects.toThrow(
        'Service with ID nonexistent-id not found',
      );
    });

    it('should update service successfully', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      const updatedService = { ...mockService, ...updateServiceDto };
      prisma.service.update.mockResolvedValue(updatedService);

      const result = await service.update('service-1', updateServiceDto);

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: updateServiceDto,
        include: {
          category: true,
        },
      });
      expect(result).toEqual(updatedService);
    });

    it('should update service isActive status', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      const deactivatedService = { ...mockService, isActive: false };
      prisma.service.update.mockResolvedValue(deactivatedService);

      const result = await service.update('service-1', { isActive: false });

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { isActive: false },
        include: {
          category: true,
        },
      });
      expect(result.isActive).toBe(false);
    });

    it('should update service duration', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      const updatedService = { ...mockService, durationMinutes: 45 };
      prisma.service.update.mockResolvedValue(updatedService);

      const result = await service.update('service-1', { durationMinutes: 45 });

      expect(result.durationMinutes).toBe(45);
    });

    it('should include category in updated response', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.service.update.mockResolvedValue(mockService);

      const result = await service.update('service-1', { name: 'New Name' });

      expect(result).toHaveProperty('category');
    });
  });

  // ============================================================
  // [TDD-RED] BE-CATEGORY-NULLABLE: Service.categoryId nullable tests
  // These tests are expected to FAIL because:
  //   - CreateServiceDto.categoryId is currently `string` (required), needs `string | null` (optional)
  //   - UpdateServiceDto.categoryId is currently `string | undefined`, needs `string | null | undefined`
  //   - strictNullChecks: true causes ts-jest compilation failures
  // ============================================================
  describe('categoryId nullable [RED phase - expected failures]', () => {
    it('should create service without categoryId [RED - categoryId required in DTO]', async () => {
      // This test should FAIL because CreateServiceDto.categoryId is required (string, not optional).
      // TypeScript will error: Property 'categoryId' is missing in type '{ ... }' but required in type 'CreateServiceDto'.
      const dtoWithoutCategory: CreateServiceDto = {
        name: 'Service Without Category',
        description: 'Test service with null category',
        durationMinutes: 45,
        price: 100.0,
        // categoryId intentionally omitted — causes TypeScript compilation error
      };

      const expectedService = {
        ...mockService,
        id: 'service-null-cat',
        name: 'Service Without Category',
        categoryId: null,
        category: null,
      };

      prisma.service.create.mockResolvedValue(expectedService);

      const result = await service.create(dtoWithoutCategory);

      expect(result.categoryId).toBeNull();
      expect(result.category).toBeNull();
    });

    it('should accept null as categoryId value [RED - null not assignable to string]', async () => {
      // This test should FAIL because null is not assignable to type 'string'.
      const dtoWithNullCategory: CreateServiceDto = {
        categoryId: null, // TypeScript error: null is not assignable to string
        name: 'Service With Null Category',
        durationMinutes: 30,
        price: 50.0,
      };

      const expectedService = {
        ...mockService,
        id: 'service-null-cat-2',
        name: 'Service With Null Category',
        categoryId: null,
        category: null,
      };

      prisma.service.create.mockResolvedValue(expectedService);

      const result = await service.create(dtoWithNullCategory);

      expect(result.categoryId).toBeNull();
      expect(result.category).toBeNull();
    });

    it('should query services with null categoryId successfully', async () => {
      // This test may PASS at runtime since Prisma supports nullable categoryId,
      // but combined with type-level failures above, the full test run will fail.
      const mockServicesWithNullCategory = [
        { ...mockService, id: 'svc-null-1', categoryId: null, category: null },
        { ...mockService, id: 'svc-null-2', categoryId: null, category: null },
      ];

      prisma.service.findMany.mockResolvedValue(mockServicesWithNullCategory);
      prisma.service.count.mockResolvedValue(2);

      const result = await service.findAll(1, 10, undefined);

      const nullCategoryServices = result.items.filter((s) => s.categoryId === null);
      expect(nullCategoryServices.length).toBeGreaterThan(0);
      nullCategoryServices.forEach((s) => {
        expect(s.categoryId).toBeNull();
      });
    });

    it('should allow updating categoryId to null [RED - null not assignable to string|undefined]', async () => {
      // This test should FAIL because UpdateServiceDto.categoryId is `string | undefined`,
      // and null is not assignable to `string | undefined`.
      const updateDto: UpdateServiceDto = {
        categoryId: null, // TypeScript error: null is not assignable to string | undefined
      };

      prisma.service.findUnique.mockResolvedValue(mockService);
      const updatedService = { ...mockService, categoryId: null, category: null };
      prisma.service.update.mockResolvedValue(updatedService);

      const result = await service.update('service-1', updateDto);

      expect(result.categoryId).toBeNull();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if service not found', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        'Service with ID nonexistent-id not found',
      );
    });

    it('should soft-delete service by setting isActive to false', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      const disabledService = { ...mockService, isActive: false };
      prisma.service.update.mockResolvedValue(disabledService);

      await service.remove('service-1');

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { isActive: false },
      });
      expect(prisma.service.delete).not.toHaveBeenCalled();
    });

    it('should return disabled success message', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.service.update.mockResolvedValue({ ...mockService, isActive: false });

      const result = await service.remove('service-1');

      expect(result).toEqual({ message: 'Service disabled successfully' });
    });

    it('should check existence before soft-deleting', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.service.update.mockResolvedValue({ ...mockService, isActive: false });

      await service.remove('service-1');

      expect(prisma.service.findUnique).toHaveBeenCalledWith({ where: { id: 'service-1' } });
      expect(prisma.service.update).toHaveBeenCalled();
    });
  });
});
