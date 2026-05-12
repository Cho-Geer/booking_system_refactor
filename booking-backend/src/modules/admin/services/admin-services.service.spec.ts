import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { ServicesService } from '../../services/services.service';
import { AdminServicesService } from './admin-services.service';
import {
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  AdminServicesQueryDto,
} from '../dto/admin-service.dto';
import {
  toAdminServiceDto,
  fromCreateAdminServiceDto,
  fromUpdateAdminServiceDto,
} from '../mappers/service.mapper';

jest.mock('../mappers/service.mapper', () => ({
  toAdminServiceDto: jest.fn(),
  fromCreateAdminServiceDto: jest.fn(),
  fromUpdateAdminServiceDto: jest.fn(),
}));

// ── Mocks ──────────────────────────────────────────────────────────────
const mockPrismaService = {
  service: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockServicesService = {
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

// ── Prisma fixtures ────────────────────────────────────────────────────
const prismaServiceFixture = {
  id: 'svc-1',
  categoryId: 'cat-1',
  name: 'Haircut',
  description: 'Professional haircut service',
  durationMinutes: 30,
  price: 50.0,
  pricePerMinute: null,
  imageUrl: null,
  isActive: true,
  displayOrder: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const prismaServiceFixture2 = {
  ...prismaServiceFixture,
  id: 'svc-2',
  name: 'Manicure',
  description: 'Nail care service',
  price: 35.0,
};

// ── DTO fixtures (after mapping) ──────────────────────────────────────
const adminServiceDtoFixture = {
  id: 'svc-1',
  name: 'Haircut',
  description: 'Professional haircut service',
  duration: 30,
  price: 50,
  pricePerMinute: undefined,
  active: true,
  imageUrl: undefined,
  createdAt: new Date('2024-01-01'),
};

const adminServiceDtoFixture2 = {
  id: 'svc-2',
  name: 'Manicure',
  description: 'Nail care service',
  duration: 30,
  price: 35,
  pricePerMinute: undefined,
  active: true,
  imageUrl: undefined,
  createdAt: new Date('2024-01-01'),
};

describe('AdminServicesService', () => {
  let adminService: AdminServicesService;
  let prisma: typeof mockPrismaService;
  let servicesService: typeof mockServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminServicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ServicesService, useValue: mockServicesService },
      ],
    }).compile();

    adminService = module.get<AdminServicesService>(AdminServicesService);
    prisma = module.get(PrismaService);
    servicesService = module.get(ServicesService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adminService).toBeDefined();
  });

  // ─── findAll ─────────────────────────────────────────────────────────
  describe('findAll', () => {
    beforeEach(() => {
      (toAdminServiceDto as jest.Mock).mockImplementation((s: any) => {
        if (s.id === 'svc-1') return adminServiceDtoFixture;
        if (s.id === 'svc-2') return adminServiceDtoFixture2;
        return { id: s.id, name: s.name, active: s.isActive };
      });
    });

    it('should return paginated services with default params', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([
        prismaServiceFixture,
        prismaServiceFixture2,
      ]);
      mockPrismaService.service.count.mockResolvedValue(2);

      const query: AdminServicesQueryDto = { page: 1, limit: 20 };
      const result = await adminService.findAll(query);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.service.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        items: [adminServiceDtoFixture, adminServiceDtoFixture2],
        meta: {
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should filter by active status', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([
        prismaServiceFixture,
      ]);
      mockPrismaService.service.count.mockResolvedValue(1);

      const query: AdminServicesQueryDto = { page: 1, limit: 20, active: true };
      const result = await adminService.findAll(query);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
      expect(prisma.service.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter by inactive status when active is false', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([]);
      mockPrismaService.service.count.mockResolvedValue(0);

      const query: AdminServicesQueryDto = { page: 1, limit: 20, active: false };
      const result = await adminService.findAll(query);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: false },
        }),
      );
      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should search by name or description using LIKE', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([
        prismaServiceFixture,
      ]);
      mockPrismaService.service.count.mockResolvedValue(1);

      const query: AdminServicesQueryDto = { page: 1, limit: 20, search: 'hair' };
      const result = await adminService.findAll(query);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'hair', mode: 'insensitive' } },
              { description: { contains: 'hair', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('should combine search AND active filter together', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([
        prismaServiceFixture,
      ]);
      mockPrismaService.service.count.mockResolvedValue(1);

      const query: AdminServicesQueryDto = {
        page: 1,
        limit: 20,
        search: 'hair',
        active: true,
      };
      const result = await adminService.findAll(query);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            OR: [
              { name: { contains: 'hair', mode: 'insensitive' } },
              { description: { contains: 'hair', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('should return empty items when no services match', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([]);
      mockPrismaService.service.count.mockResolvedValue(0);

      const query: AdminServicesQueryDto = {
        page: 1,
        limit: 20,
        search: 'nonexistent',
      };
      const result = await adminService.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should calculate pagination metadata correctly', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([
        prismaServiceFixture,
      ]);
      mockPrismaService.service.count.mockResolvedValue(25);

      const query: AdminServicesQueryDto = { page: 3, limit: 10 };
      const result = await adminService.findAll(query);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(true);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to ServicesService.findOne and map result', async () => {
      mockServicesService.findOne.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue(adminServiceDtoFixture);

      const result = await adminService.findOne('svc-1');

      expect(servicesService.findOne).toHaveBeenCalledWith('svc-1');
      expect(toAdminServiceDto).toHaveBeenCalledWith(prismaServiceFixture);
      expect(result).toEqual(adminServiceDtoFixture);
    });

    it('should propagate NotFoundException when service not found', async () => {
      mockServicesService.findOne.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(adminService.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(adminService.findOne('invalid-id')).rejects.toThrow(
        'Service with ID invalid-id not found',
      );
    });
  });

  // ─── create ──────────────────────────────────────────────────────────
  describe('create', () => {
    const createDto: CreateAdminServiceDto = {
      name: 'New Service',
      description: 'Brand new service',
      duration: 45,
      price: 80,
      active: true,
    };

    // Expected prisma create data including auto-calculated pricePerMinute
    const prismaCreateDataWithPricePerMinute = {
      name: 'New Service',
      description: 'Brand new service',
      durationMinutes: 45,
      price: 80,
      pricePerMinute: 1.78,
      isActive: true,
      imageUrl: undefined,
    };

    it('should map DTO, delegate to ServicesService.create, and map result', async () => {
      (fromCreateAdminServiceDto as jest.Mock).mockReturnValue(
        prismaCreateDataWithPricePerMinute,
      );
      mockServicesService.create.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({
        ...adminServiceDtoFixture,
        name: 'New Service',
        duration: 45,
        price: 80,
        pricePerMinute: 1.78,
      });

      const result = await adminService.create(createDto);

      // Verify the mapper was called with a DTO that has auto-calculated pricePerMinute
      expect(fromCreateAdminServiceDto).toHaveBeenCalledWith({
        ...createDto,
        pricePerMinute: 1.78,
      });
      expect(servicesService.create).toHaveBeenCalledWith(
        prismaCreateDataWithPricePerMinute,
      );
      expect(toAdminServiceDto).toHaveBeenCalledWith(prismaServiceFixture);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('pricePerMinute', 1.78);
    });

    it('should work without optional active field (defaults to true in mapper)', async () => {
      const dtoWithoutActive: CreateAdminServiceDto = {
        name: 'Basic Service',
        duration: 30,
        price: 50,
      };
      const prismaData = {
        name: 'Basic Service',
        durationMinutes: 30,
        price: 50,
        pricePerMinute: 1.67,
        isActive: true,
        imageUrl: undefined,
      };
      const mockedPrismaResult = {
        ...prismaServiceFixture,
        id: 'svc-3',
        name: 'Basic Service',
      };

      (fromCreateAdminServiceDto as jest.Mock).mockReturnValue(prismaData);
      mockServicesService.create.mockResolvedValue(mockedPrismaResult);
      (toAdminServiceDto as jest.Mock).mockReturnValue({
        id: 'svc-3',
        name: 'Basic Service',
        duration: 30,
        price: 50,
        pricePerMinute: 1.67,
        active: true,
      });

      const result = await adminService.create(dtoWithoutActive);

      expect(fromCreateAdminServiceDto).toHaveBeenCalledWith({
        ...dtoWithoutActive,
        pricePerMinute: 1.67,
      });
      expect(servicesService.create).toHaveBeenCalledWith(prismaData);
      expect(result).toBeDefined();
    });

    it('[RED] should auto-calculate pricePerMinute when not provided', async () => {
      const dto: CreateAdminServiceDto = {
        name: 'Auto Calc Service',
        duration: 60,
        price: 120,
      };

      (fromCreateAdminServiceDto as jest.Mock).mockReturnValue({});
      mockServicesService.create.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({});

      await adminService.create(dto);

      // pricePerMinute should be 120/60 = 2.00
      expect(fromCreateAdminServiceDto).toHaveBeenCalledWith(
        expect.objectContaining({ pricePerMinute: 2.0 }),
      );
    });

    it('[RED] should use provided pricePerMinute when explicitly set', async () => {
      const dto: CreateAdminServiceDto = {
        name: 'Explicit PPM',
        duration: 60,
        price: 120,
        pricePerMinute: 5.0,
      };

      (fromCreateAdminServiceDto as jest.Mock).mockReturnValue({});
      mockServicesService.create.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({});

      await adminService.create(dto);

      // Should use explicit 5.0, NOT 120/60=2.0
      expect(fromCreateAdminServiceDto).toHaveBeenCalledWith(
        expect.objectContaining({ pricePerMinute: 5.0 }),
      );
    });

    it('[RED] should not divide by zero when duration is 0', async () => {
      const dto: CreateAdminServiceDto = {
        name: 'Zero Duration',
        duration: 0,
        price: 100,
      };

      (fromCreateAdminServiceDto as jest.Mock).mockReturnValue({});
      mockServicesService.create.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({});

      await adminService.create(dto);

      // pricePerMinute should remain undefined (not computed from price/0)
      expect(fromCreateAdminServiceDto).toHaveBeenCalledWith(
        expect.not.objectContaining({ pricePerMinute: expect.any(Number) }),
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────
  describe('update', () => {
    const updateDto: UpdateAdminServiceDto = {
      name: 'Updated Service',
      price: 100,
    };

    const prismaUpdateData = {
      name: 'Updated Service',
      price: 100,
    };

    it('should map DTO, delegate to ServicesService.update, and map result', async () => {
      (fromUpdateAdminServiceDto as jest.Mock).mockReturnValue(
        prismaUpdateData,
      );
      const updatedPrisma = {
        ...prismaServiceFixture,
        name: 'Updated Service',
        price: 100,
      };
      mockServicesService.update.mockResolvedValue(updatedPrisma);
      (toAdminServiceDto as jest.Mock).mockReturnValue({
        ...adminServiceDtoFixture,
        name: 'Updated Service',
        price: 100,
      });

      const result = await adminService.update('svc-1', updateDto);

      expect(fromUpdateAdminServiceDto).toHaveBeenCalledWith(updateDto);
      expect(servicesService.update).toHaveBeenCalledWith(
        'svc-1',
        prismaUpdateData,
      );
      expect(toAdminServiceDto).toHaveBeenCalledWith(updatedPrisma);
      expect(result).toBeDefined();
    });

    it('should propagate NotFoundException from ServicesService.update', async () => {
      (fromUpdateAdminServiceDto as jest.Mock).mockReturnValue(
        prismaUpdateData,
      );
      mockServicesService.update.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(
        adminService.update('invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should map isActive field correctly', async () => {
      const deactivateDto: UpdateAdminServiceDto = { active: false };
      const prismaUpdate = { isActive: false };

      (fromUpdateAdminServiceDto as jest.Mock).mockReturnValue(prismaUpdate);
      const deactivatedPrisma = { ...prismaServiceFixture, isActive: false };
      mockServicesService.update.mockResolvedValue(deactivatedPrisma);
      (toAdminServiceDto as jest.Mock).mockReturnValue({
        ...adminServiceDtoFixture,
        active: false,
      });

      const result = await adminService.update('svc-1', deactivateDto);

      expect(fromUpdateAdminServiceDto).toHaveBeenCalledWith(deactivateDto);
      expect(servicesService.update).toHaveBeenCalledWith(
        'svc-1',
        prismaUpdate,
      );
      expect(result).toBeDefined();
    });

    it('[RED] should auto-calculate pricePerMinute when both price and duration are in update DTO', async () => {
      const dto: UpdateAdminServiceDto = {
        price: 100,
        duration: 50,
      };

      (fromUpdateAdminServiceDto as jest.Mock).mockReturnValue({});
      mockServicesService.update.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({});

      await adminService.update('svc-1', dto);

      // pricePerMinute should be 100/50 = 2.00
      expect(fromUpdateAdminServiceDto).toHaveBeenCalledWith(
        expect.objectContaining({ pricePerMinute: 2.0 }),
      );
    });

    it('[RED] should use explicitly provided pricePerMinute and not recalculate', async () => {
      const dto: UpdateAdminServiceDto = {
        price: 100,
        duration: 50,
        pricePerMinute: 10.0,
      };

      (fromUpdateAdminServiceDto as jest.Mock).mockReturnValue({});
      mockServicesService.update.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({});

      await adminService.update('svc-1', dto);

      // Should use explicit 10.0, NOT 100/50=2.0
      expect(fromUpdateAdminServiceDto).toHaveBeenCalledWith(
        expect.objectContaining({ pricePerMinute: 10.0 }),
      );
    });

    it('[RED] should not change pricePerMinute when only price is in DTO (no duration)', async () => {
      const dto: UpdateAdminServiceDto = {
        price: 200,
      };

      (fromUpdateAdminServiceDto as jest.Mock).mockReturnValue({});
      mockServicesService.update.mockResolvedValue(prismaServiceFixture);
      (toAdminServiceDto as jest.Mock).mockReturnValue({});

      await adminService.update('svc-1', dto);

      // Neither price nor duration both present, so no auto-calculation
      expect(fromUpdateAdminServiceDto).toHaveBeenCalledWith(
        expect.not.objectContaining({ pricePerMinute: expect.any(Number) }),
      );
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delegate to ServicesService.remove and return void', async () => {
      mockServicesService.remove.mockResolvedValue({
        message: 'Service deleted successfully',
      });

      const result = await adminService.remove('svc-1');

      expect(servicesService.remove).toHaveBeenCalledWith('svc-1');
      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundException from ServicesService.remove', async () => {
      mockServicesService.remove.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(adminService.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
