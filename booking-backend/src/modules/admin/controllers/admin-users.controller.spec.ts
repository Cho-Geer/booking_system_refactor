import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from '../services/admin-users.service';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AdminUserDto,
} from '../dto/admin-user.dto';
import { ContactType } from '../../auth/dto/register-send-code.dto';
import { MetaDto } from '../../../common/dto/base.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

// Mock AdminUsersService
const mockAdminUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  sendCode: jest.fn(),
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

  // ============================================================
  // POST /v1/admin/users/send-code (T-ADMIN-VERIFY-002)
  // ============================================================
  describe('POST /admin/users/send-code', () => {
    const validDto = { contactType: ContactType.EMAIL, email: 'admin@example.com' };

    it('[RED] should return 200 with maskedContact when SUPER_ADMIN sends code to existing email', async () => {
      const response = { maskedContact: 'a***@example.com', expiresIn: 300 };
      mockAdminUsersService.sendCode.mockResolvedValue(response);

      const result = await controller.sendCode(validDto);

      expect(service.sendCode).toHaveBeenCalledWith(validDto);
      expect(result).toEqual(response);
      expect(result.maskedContact).toBeDefined();
    });

    it('[RED] should return 200 without maskedContact for anti-enumeration (non-existent email)', async () => {
      const antiEnumResponse = { maskedContact: null, expiresIn: 300 };
      mockAdminUsersService.sendCode.mockResolvedValue(antiEnumResponse);

      const result = await controller.sendCode(validDto);

      expect(service.sendCode).toHaveBeenCalledWith(validDto);
      expect(result.maskedContact).toBeNull();
    });

    it('[RED] should return 400 for invalid contactType', async () => {
      const invalidDto = { contactType: 'INVALID' as any, email: 'admin@example.com' };
      mockAdminUsersService.sendCode.mockRejectedValue({
        status: 400,
        message: 'Bad Request',
      });

      await expect(controller.sendCode(invalidDto)).rejects.toMatchObject({ status: 400 });
    });

    it('[RED] should return 429 when rate limit exceeded (6th request in 1 minute)', async () => {
      mockAdminUsersService.sendCode.mockRejectedValue({
        status: 429,
        message: 'Too Many Requests',
      });

      await expect(controller.sendCode(validDto)).rejects.toMatchObject({ status: 429 });
    });

    it('[RED] should enforce ~100ms minimum response for non-existent user (anti-timing)', async () => {
      const start = Date.now();
      mockAdminUsersService.sendCode.mockResolvedValue({ maskedContact: null, expiresIn: 300 });

      await controller.sendCode(validDto);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(80);
    });

    it('[RED] should return 401 when unauthenticated (no JWT)', async () => {
      mockAdminUsersService.sendCode.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(controller.sendCode(validDto)).rejects.toMatchObject({ status: 401 });
    });

    it('[RED] should return 403 when user is ADMIN (not SUPER_ADMIN)', async () => {
      mockAdminUsersService.sendCode.mockRejectedValue({
        status: 403,
        message: 'Forbidden',
      });

      await expect(controller.sendCode(validDto)).rejects.toMatchObject({ status: 403 });
    });
  });

  // ============================================================
  // POST /v1/admin/users with verificationCode (T-ADMIN-VERIFY-002)
  // ============================================================
  describe('POST /admin/users with verificationCode', () => {
    const createDto = {
      name: 'New Admin',
      email: 'admin@example.com',
      password: 'SecurePass123!',
      role: 'ADMIN',
      verificationCode: '123456',
    };

    it('[RED] should return 201 with AdminUserDto when verificationCode is valid', async () => {
      const createdUser = {
        id: 'new-user-1',
        name: 'New Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
      };
      mockAdminUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });

    it('[RED] should return 400 when verificationCode is invalid (wrong 6-digit code)', async () => {
      mockAdminUsersService.create.mockRejectedValue({
        status: 400,
        message: 'Invalid or expired verification code',
      });

      await expect(controller.create(createDto)).rejects.toMatchObject({ status: 400 });
    });

    it('[RED] should return 400 when verificationCode is expired', async () => {
      mockAdminUsersService.create.mockRejectedValue({
        status: 400,
        message: 'Invalid or expired verification code',
      });

      await expect(controller.create(createDto)).rejects.toMatchObject({ status: 400 });
    });

    it('[RED] should return 429 when max verification attempts exceeded (4th attempt)', async () => {
      mockAdminUsersService.create.mockRejectedValue({
        status: 429,
        message: 'Too many attempts. Please request a new code.',
      });

      await expect(controller.create(createDto)).rejects.toMatchObject({ status: 429 });
    });

    it('[RED] should return 409 when email already exists', async () => {
      mockAdminUsersService.create.mockRejectedValue({
        status: 409,
        message: 'Email already exists',
      });

      await expect(controller.create(createDto)).rejects.toMatchObject({ status: 409 });
    });
  });
});
