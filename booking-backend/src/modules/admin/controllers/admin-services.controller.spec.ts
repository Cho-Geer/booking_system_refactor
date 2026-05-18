import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminServicesController } from './admin-services.controller';
import { AdminServicesService } from '../services/admin-services.service';
import {
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  AdminServicesQueryDto,
} from '../dto/admin-service.dto';

// ── Mock AdminServicesService ──────────────────────────────────────────
const mockAdminServicesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getAffectedAppointments: jest.fn(),
};

// ── Fixtures ───────────────────────────────────────────────────────────
const mockServiceDto = {
  id: 'svc-1',
  name: 'Haircut',
  description: 'Professional haircut service',
  duration: 30,
  price: 50,
  active: true,
  imageUrl: undefined,
  createdAt: new Date('2024-01-01'),
};

const mockPaginatedResult = {
  items: [mockServiceDto],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('AdminServicesController', () => {
  let controller: AdminServicesController;
  let adminService: typeof mockAdminServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminServicesController],
      providers: [
        {
          provide: AdminServicesService,
          useValue: mockAdminServicesService,
        },
      ],
    }).compile();

    controller = module.get<AdminServicesController>(AdminServicesController);
    adminService = module.get(AdminServicesService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── findAll ─────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should call service.findAll with query params and return paginated result', async () => {
      mockAdminServicesService.findAll.mockResolvedValue(mockPaginatedResult);

      const query: AdminServicesQueryDto = { page: 1, limit: 20, search: 'hair', active: true };
      const result = await controller.findAll(query);

      expect(adminService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should call service.findAll with default values when query is empty', async () => {
      mockAdminServicesService.findAll.mockResolvedValue(mockPaginatedResult);

      const query: AdminServicesQueryDto = {};
      const result = await controller.findAll(query);

      expect(adminService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should call service.findAll with only search filter', async () => {
      mockAdminServicesService.findAll.mockResolvedValue(mockPaginatedResult);

      const query: AdminServicesQueryDto = { search: 'nail' };
      const result = await controller.findAll(query);

      expect(adminService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should call service.findAll with only active filter', async () => {
      mockAdminServicesService.findAll.mockResolvedValue(mockPaginatedResult);

      const query: AdminServicesQueryDto = { active: false };
      const result = await controller.findAll(query);

      expect(adminService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return empty result when no services match', async () => {
      const emptyResult = {
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockAdminServicesService.findAll.mockResolvedValue(emptyResult);

      const query: AdminServicesQueryDto = { search: 'nonexistent' };
      const result = await controller.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should call service.findOne and return the service DTO', async () => {
      mockAdminServicesService.findOne.mockResolvedValue(mockServiceDto);

      const result = await controller.findOne('svc-1');

      expect(adminService.findOne).toHaveBeenCalledWith('svc-1');
      expect(result).toEqual(mockServiceDto);
    });

    it('should propagate NotFoundException when service not found', async () => {
      mockAdminServicesService.findOne.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
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

    it('should call service.create and return the created service DTO', async () => {
      const createdDto = { ...mockServiceDto, name: 'New Service', duration: 45, price: 80 };
      mockAdminServicesService.create.mockResolvedValue(createdDto);

      const result = await controller.create(createDto);

      expect(adminService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdDto);
    });

    it('should call service.create with minimal DTO (no active field)', async () => {
      const minimalDto: CreateAdminServiceDto = {
        name: 'Minimal',
        duration: 30,
        price: 50,
      };
      const createdDto = {
        id: 'svc-2',
        name: 'Minimal',
        duration: 30,
        price: 50,
        active: true,
        createdAt: new Date('2024-01-01'),
      };
      mockAdminServicesService.create.mockResolvedValue(createdDto);

      const result = await controller.create(minimalDto);

      expect(adminService.create).toHaveBeenCalledWith(minimalDto);
      expect(result).toBeDefined();
      expect(result.active).toBe(true);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────
  describe('update', () => {
    const updateDto: UpdateAdminServiceDto = {
      name: 'Updated Service',
      price: 100,
    };

    it('should call service.update and return the updated service DTO', async () => {
      const updatedDto = { ...mockServiceDto, name: 'Updated Service', price: 100 };
      mockAdminServicesService.update.mockResolvedValue(updatedDto);

      const result = await controller.update('svc-1', updateDto);

      expect(adminService.update).toHaveBeenCalledWith('svc-1', updateDto);
      expect(result).toEqual(updatedDto);
    });

    it('should propagate NotFoundException from service.update', async () => {
      mockAdminServicesService.update.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should allow updating active status via update DTO', async () => {
      const deactivateDto: UpdateAdminServiceDto = { active: false };
      const deactivatedDto = { ...mockServiceDto, active: false };
      mockAdminServicesService.update.mockResolvedValue(deactivatedDto);

      const result = await controller.update('svc-1', deactivateDto);

      expect(adminService.update).toHaveBeenCalledWith('svc-1', deactivateDto);
      expect(result.active).toBe(false);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────
  describe('remove', () => {
    it('should call service.remove and return success message (200)', async () => {
      mockAdminServicesService.remove.mockResolvedValue({
        message: 'Service disabled successfully',
      });

      const result = await controller.remove('svc-1');

      expect(adminService.remove).toHaveBeenCalledWith('svc-1');
      expect(result).toEqual({ message: 'Service disabled successfully' });
    });

    it('should propagate NotFoundException from service.remove', async () => {
      mockAdminServicesService.remove.mockRejectedValue(
        new NotFoundException('Service with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getAffectedAppointments ────────────────────────────────────────
  describe('getAffectedAppointments', () => {
    it('should call service.getAffectedAppointments and return counts', async () => {
      const mockResult = {
        serviceName: 'Haircut',
        pendingCount: 3,
        confirmedCount: 5,
        totalAffected: 8,
      };
      mockAdminServicesService.getAffectedAppointments.mockResolvedValue(mockResult);

      const result = await controller.getAffectedAppointments('svc-1');

      expect(adminService.getAffectedAppointments).toHaveBeenCalledWith('svc-1');
      expect(result).toEqual(mockResult);
    });
  });
});
