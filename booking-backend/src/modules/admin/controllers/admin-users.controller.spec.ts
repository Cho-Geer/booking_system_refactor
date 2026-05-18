import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from '../services/admin-users.service';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AdminUserDto,
} from '../dto/admin-user.dto';
import { PaginatedResponseDto, MetaDto } from '../../../common/dto/base.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

// Mock AdminUsersService
const mockAdminUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let service: typeof mockAdminUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: AdminUsersService,
          useValue: mockAdminUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    service = module.get(AdminUsersService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // findAll
  // ============================================================
  describe('GET /admin/users', () => {
    it('should call service.findAll with query params and return paginated result', async () => {
      const mockItems: AdminUserDto[] = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
        },
      ];
      const mockMeta: MetaDto = {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      const expectedResult = { items: mockItems, meta: mockMeta };

      mockAdminUsersService.findAll.mockResolvedValue(expectedResult);

      const query: AdminUsersQueryDto = {
        page: 1,
        limit: 20,
        search: 'john',
        role: 'ADMIN',
      };
      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should call service.findAll with default empty query', async () => {
      const mockItems: AdminUserDto[] = [];
      const mockMeta: MetaDto = {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockAdminUsersService.findAll.mockResolvedValue({
        items: mockItems,
        meta: mockMeta,
      });

      const query: AdminUsersQueryDto = {};
      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ============================================================
  // create
  // ============================================================
  describe('POST /admin/users', () => {
    it('should call service.create and return the created user', async () => {
      const dto: CreateAdminUserDto = {
        name: 'New Admin',
        email: 'newadmin@example.com',
        password: 'SecurePass123!',
        role: 'ADMIN',
      };

      const createdUser: AdminUserDto = {
        id: 'new-user-1',
        name: 'New Admin',
        email: 'newadmin@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
      };

      mockAdminUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdUser);
    });
  });

  // ============================================================
  // update
  // ============================================================
  describe('PUT /admin/users/:id', () => {
    it('should call service.update and return the updated user', async () => {
      const dto: UpdateAdminUserDto = {
        name: 'Updated Admin',
        role: 'SUPER_ADMIN',
      };

      const updatedUser: AdminUserDto = {
        id: 'user-1',
        name: 'Updated Admin',
        email: 'john@example.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
      };

      mockAdminUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user-1', dto);

      expect(service.update).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(updatedUser);
    });
  });

  // ============================================================
  // remove
  // ============================================================
  describe('DELETE /admin/users/:id', () => {
    it('should call service.remove and return void (204)', async () => {
      mockAdminUsersService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('user-1');

      expect(service.remove).toHaveBeenCalledWith('user-1');
      expect(result).toBeUndefined();
    });
  });
});
