import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SystemRole } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

// Mock UsersService
const mockUsersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  updatePassword: jest.fn(),
  getProfile: jest.fn(),
};

// Mock ClsService
const mockClsService = {
  get: jest.fn().mockReturnValue('test-request-id'),
  set: jest.fn(),
  getId: jest.fn().mockReturnValue('test-request-id'),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: typeof mockUsersService;
  let mockReq: { user?: { id: string; roles: string[] } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);

    // 默认 mock req 为 owner (user-1)
    mockReq = { user: { id: 'user-1', roles: [] } };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      phone: '1234567890',
      role: SystemRole.CUSTOMER,
    };

    const mockUser = {
      id: 'user-1',
      email: 'newuser@example.com',
      name: 'John Doe',
      phone: '1234567890',
      role: SystemRole.CUSTOMER,
      status: 'ACTIVE',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should call service.create and return the created user', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should propagate ConflictException for duplicate email', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(controller.create(createUserDto)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      { id: 'user-1', email: 'user1@example.com', name: 'User One' },
      { id: 'user-2', email: 'user2@example.com', name: 'User Two' },
    ];

    it('should call service.findAll with default pagination', async () => {
      mockUsersService.findAll.mockResolvedValue({
        items: mockUsers,
        meta: {
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result.items).toEqual(mockUsers);
      expect(result.meta.total).toBe(2);
    });

    it('should call service.findAll with custom pagination', async () => {
      mockUsersService.findAll.mockResolvedValue({
        items: [mockUsers[0]],
        meta: {
          total: 2,
          page: 2,
          limit: 1,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        },
      });

      const result = await controller.findAll(2, 1);

      expect(service.findAll).toHaveBeenCalledWith(2, 1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(1);
    });

    it('should return empty data when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue({
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
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
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'John Doe',
      role: SystemRole.CUSTOMER,
    };

    it('should call service.findOne and return the user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-1', mockReq as unknown as Request);

      expect(service.findOne).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should propagate NotFoundException from service.findOne', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User with ID user-1 not found'),
      );

      // 使用 user-1 作为目标 ID，这样所有权检查会通过
      await expect(controller.findOne('user-1', mockReq as unknown as Request)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('user-1', mockReq as unknown as Request)).rejects.toThrow('User with ID user-1 not found');
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    const mockUpdatedUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Updated Name',
      role: SystemRole.CUSTOMER,
    };

    it('should call service.update and return the updated user', async () => {
      mockUsersService.update.mockResolvedValue(mockUpdatedUser);

      const result = await controller.update('user-1', updateUserDto, mockReq as unknown as Request);

      expect(service.update).toHaveBeenCalledWith('user-1', updateUserDto);
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should propagate NotFoundException from service.update', async () => {
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('User with ID user-1 not found'),
      );

      // 使用 user-1 作为目标 ID，这样所有权检查会通过
      await expect(controller.update('user-1', updateUserDto, mockReq as unknown as Request)).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException for duplicate email update', async () => {
      mockUsersService.update.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.update('user-1', { email: 'existing@example.com' }, mockReq as unknown as Request)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return success message', async () => {
      mockUsersService.remove.mockResolvedValue({ message: 'User deleted successfully' });

      const result = await controller.remove('user-1');

      expect(service.remove).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should propagate NotFoundException from service.remove', async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('User with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should call service.updatePassword with correct parameters', async () => {
      mockUsersService.updatePassword.mockResolvedValue({ message: 'Password changed successfully' });

      const result = await controller.changePassword({
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      }, mockReq as unknown as Request);

      expect(service.updatePassword).toHaveBeenCalledWith('user-1', 'OldPass123!', 'NewPass456!');
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should propagate BadRequestException for incorrect old password', async () => {
      mockUsersService.updatePassword.mockRejectedValue(
        new BadRequestException('Current password is incorrect'),
      );

      mockReq.user = { id: 'user-1', roles: [] };
      await expect(
        controller.changePassword({ currentPassword: 'WrongPass!', newPassword: 'NewPass!' } as UpdatePasswordDto, mockReq as unknown as Request)
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.changePassword({ currentPassword: 'WrongPass!', newPassword: 'NewPass!' } as UpdatePasswordDto, mockReq as unknown as Request)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should propagate BadRequestException when password management not supported', async () => {
      mockUsersService.updatePassword.mockRejectedValue(
        new BadRequestException('Password management is not supported'),
      );

      await expect(
        controller.changePassword({ currentPassword: 'OldPass!', newPassword: 'NewPass!' }, mockReq as unknown as Request)
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.changePassword({ currentPassword: 'OldPass!', newPassword: 'NewPass!' }, mockReq as unknown as Request)
      ).rejects.toThrow('Password management is not supported');
    });
  });

  // ==================== FIX-P0-003 GREEN Phase ====================
  // 安全修复：Users 端点添加所有权授权校验
  // 规则：用户只能访问自己，管理员可以访问所有
  describe('FIX-P0-003: Ownership authorization (GREEN)', () => {
    it('should reject GET /users/:id when requester is not the resource owner', async () => {
      // 场景：用户 A (user-1) 尝试查看用户 B (user-2) 的资料
      // 预期：返回 403 Forbidden
      
      const mockUser = { id: 'user-1', roles: [] }; // 请求者是 user-1，不是管理员
      const targetUserId = 'user-2'; // 目标是 user-2

      // 需要 mock Request 对象
      const mockReq = { user: mockUser };
      
      // 由于 controller 现在需要 @Req()，我们需要重新编译模块
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          {
            provide: UsersService,
            useValue: mockUsersService,
          },
          {
            provide: ClsService,
            useValue: mockClsService,
          },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      await expect(controller.findOne(targetUserId, mockReq as unknown as Request)).rejects.toThrow(ForbiddenException);
      await expect(controller.findOne(targetUserId, mockReq as unknown as Request)).rejects.toThrow('You can only access your own profile');
    });

    it('should reject PATCH /users/:id when requester is not the resource owner', async () => {
      const mockUser = { id: 'user-1', roles: [] };
      const targetUserId = 'user-2';
      const updateDto = { name: 'Hacked Name' };
      const mockReq = { user: mockUser };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      await expect(controller.update(targetUserId, updateDto, mockReq as unknown as Request)).rejects.toThrow(ForbiddenException);
      await expect(controller.update(targetUserId, updateDto, mockReq as unknown as Request)).rejects.toThrow('You can only update your own profile');
    });

    it('should reject POST /users/:id/change-password when requester is not the resource owner', async () => {
      const mockUser = { id: 'user-1', roles: [] };
      const targetUserId = 'user-2';
      const mockReq = { user: mockUser };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      mockReq.user = { id: 'different-user', roles: [] };
      await expect(controller.changePassword({
        currentPassword: 'OldPass123!',
        newPassword: 'HackedPass456!',
      } as UpdatePasswordDto, mockReq as unknown as Request)).rejects.toThrow(ForbiddenException);
      await expect(controller.changePassword({
        currentPassword: 'OldPass123!',
        newPassword: 'HackedPass456!',
      } as UpdatePasswordDto, mockReq as unknown as Request)).rejects.toThrow('You can only change your own profile');
    });

    it('should allow GET /users/:id when requester IS the resource owner', async () => {
      const mockUser = { id: 'user-1', roles: [] };
      const targetUserId = 'user-1';
      const mockReq = { user: mockUser };

      mockUsersService.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      const result = await controller.findOne(targetUserId, mockReq as unknown as Request);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
      });
    });

    it('should allow PATCH /users/:id when requester IS the resource owner', async () => {
      const mockUser = { id: 'user-1', roles: [] };
      const targetUserId = 'user-1';
      const updateDto = { name: 'Updated Name' };
      const mockReq = { user: mockUser };

      mockUsersService.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated Name',
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      const result = await controller.update(targetUserId, updateDto, mockReq as unknown as Request);

      expect(result.name).toBe('Updated Name');
    });

    it('should allow ADMIN to access any user profile', async () => {
      const mockUser = { id: 'user-1', roles: ['ADMIN'] };
      const targetUserId = 'user-2';
      const mockReq = { user: mockUser };

      mockUsersService.findOne.mockResolvedValue({
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      const result = await controller.findOne(targetUserId, mockReq as unknown as Request);

      expect(result).toEqual({
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
      });
    });

    it('should allow SUPER_ADMIN to access any user profile', async () => {
      const mockUser = { id: 'user-1', roles: ['SUPER_ADMIN'] };
      const targetUserId = 'user-3';
      const mockReq = { user: mockUser };

      mockUsersService.findOne.mockResolvedValue({
        id: 'user-3',
        email: 'user3@example.com',
        name: 'User Three',
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      const result = await controller.findOne(targetUserId, mockReq as unknown as Request);

      expect(result).toEqual({
        id: 'user-3',
        email: 'user3@example.com',
        name: 'User Three',
      });
    });
  });

  // ==================== FIX-P1-004: GET /profile endpoint ====================
  // RED Phase: Controller should return raw profile (ResponseInterceptor wraps it later)
  describe('FIX-P1-004: GET /users/profile (RED)', () => {
    it('should call service.getProfile and return the raw profile (no manual envelope)', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        phone: '138****5678',
        role: SystemRole.CUSTOMER,
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockUsersService.getProfile.mockResolvedValue(mockProfile);

      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      const result = await controller.getProfile(mockReq as unknown as Request);

      expect(service.getProfile).toHaveBeenCalledWith('user-1');
      // Controller should return raw profile (no envelope); ResponseInterceptor wraps it
      expect(result).toEqual(mockProfile);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: ClsService, useValue: mockClsService },
        ],
      }).compile();

      const controller = module.get<UsersController>(UsersController);

      const reqWithoutUser = { user: undefined };

      await expect(controller.getProfile(reqWithoutUser as unknown as Request)).rejects.toThrow(ForbiddenException);
    });
  });
});
