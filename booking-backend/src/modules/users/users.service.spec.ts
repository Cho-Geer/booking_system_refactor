import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserType, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { HashService } from '../encryption/hash.service';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { isIntegrationMode } from '../../../test/setup/test-env';
import { createTestModule, TestModule } from '../../../test/helpers/create-test-module';
import { createTestUser } from '../../../test/fixtures/database.fixture';

// Mock PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// Mock HashService
const createMockHashService = () => ({
  hashWithPepper: jest.fn((value: string) => `hash-${value}`),
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;
  let mockHashService: ReturnType<typeof createMockHashService>;

  beforeEach(async () => {
    mockHashService = createMockHashService();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'John Doe',
    phone: '1234567890',
    userType: 'CUSTOMER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      phone: '1234567890',
      userType: 'CUSTOMER',
    };

    it('should throw ConflictException if user with email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Debug: verify mock is working
      expect(mockHashService.hashWithPepper('test')).toBe('hash-test');

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow('User with this email already exists');

      // The service calls findUnique twice (email + phone), so we check emailHash was a string
      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { emailHash: expect.any(String) },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should create user without email (email is optional)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const dtoWithoutEmail = {
        password: 'SecurePass123!',
        name: 'Jane Smith',
      };

      await service.create(dtoWithoutEmail as unknown as CreateUserDto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dtoWithoutEmail.name,
          userType: 'CUSTOMER',
          status: 'ACTIVE',
        }),
        select: expect.any(Object),
      });
    });

    it('should create user with correct data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      await service.create(createUserDto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createUserDto.name,
          userType: createUserDto.userType,
          status: 'ACTIVE',
        }),
        select: expect.any(Object),
      });
    });

    it('should return user without password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      { ...mockUser, id: 'user-1' },
      { ...mockUser, id: 'user-2' },
    ];

    it('should return paginated users with default pagination', async () => {
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.user.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockUsers,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('should return paginated users with custom page and pageSize', async () => {
      prisma.user.findMany.mockResolvedValue([mockUsers[0]]);
      prisma.user.count.mockResolvedValue(2);

      const result = await service.findAll(2, 1);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 1,
        take: 1,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        data: [mockUsers[0]],
        total: 2,
        page: 2,
        pageSize: 1,
        totalPages: 2,
      });
    });

    it('should calculate totalPages correctly with remainder', async () => {
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(25);

      const result = await service.findAll(1, 10);

      expect(result.totalPages).toBe(3);
    });

    it('should return empty data when no users exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          phone: true,
          userType: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow('User with ID nonexistent-id not found');
    });
  });

  describe('findByEmailHash', () => {
    it('should return user by email hash', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmailHash('test@example.com');

      expect(mockHashService.hashWithPepper).toHaveBeenCalledWith('test@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { emailHash: 'hash-test@example.com' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          phone: true,
          userType: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by email hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmailHash('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateUserDto)).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent-id', updateUserDto)).rejects.toThrow('User with ID nonexistent-id not found');
    });

    it('should throw ConflictException if updating email to one that already exists', async () => {
      const currentEmail = 'old@example.com';
      const newEmail = 'existing@example.com';

      prisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, email: currentEmail })
        .mockResolvedValueOnce({ ...mockUser, email: newEmail });

      await expect(service.update('user-1', { email: newEmail })).rejects.toThrow(ConflictException);
    });

    it('should include correct message in ConflictException for duplicate email', async () => {
      const currentEmail = 'old@example.com';
      const newEmail = 'existing@example.com';

      prisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, email: currentEmail })
        .mockResolvedValueOnce({ ...mockUser, email: newEmail });

      await expect(service.update('user-1', { email: newEmail })).rejects.toThrow('User with this email already exists');
    });

    it('should allow updating email to the same value', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.update('user-1', { email: mockUser.email });

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should update user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, ...updateUserDto });

      const result = await service.update('user-1', updateUserDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateUserDto,
        select: expect.any(Object),
      });
      expect(result).toEqual({ ...mockUser, ...updateUserDto });
    });

    it('should update user status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, status: 'INACTIVE' });

      const result = await service.update('user-1', { status: 'INACTIVE' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'INACTIVE' },
        select: expect.any(Object),
      });
      expect(result.status).toBe('INACTIVE');
    });

    it('should update user userType', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, userType: 'ADMIN' });

      const result = await service.update('user-1', { userType: 'ADMIN' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { userType: 'ADMIN' },
        select: expect.any(Object),
      });
      expect(result.userType).toBe('ADMIN');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent-id')).rejects.toThrow('User with ID nonexistent-id not found');
    });

    it('should delete user and return success message', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('user-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });

  describe('updatePassword', () => {
    it('should throw BadRequestException as password management is not supported', async () => {
      await expect(
        service.updatePassword('user-1', 'oldPass', 'newPass'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updatePassword('user-1', 'oldPass', 'newPass'),
      ).rejects.toThrow('Password management is not supported');
    });
  });

  // ==================== FIX-P1-004: getProfile ====================
  describe('getProfile (FIX-P1-004 RED)', () => {
    it('should return user profile with masked email and phone', async () => {
      const rawUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'John Doe',
        phone: '13800138000',
        userType: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      prisma.user.findUnique.mockResolvedValue(rawUser);

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
      expect(result.id).toBe('user-1');
      expect(result.email).toBeDefined();
      expect(result.phone).toBeDefined();
      expect(result.name).toBe('John Doe');
      expect(result.userType).toBe(UserType.CUSTOMER);
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});

// ============================================================
// Integration Tests (uses real database via Testcontainers)
// ============================================================
if (isIntegrationMode()) {
  describe('UsersService (Integration - Real Database)', () => {
    let testModule: TestModule;
    let usersService: UsersService;

    // Create a mock class for HashService
    class MockHashService {
      hashWithPepper(value: string): string {
        return `hash-${value}`;
      }
    }

    beforeAll(async () => {
      testModule = await createTestModule();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: PrismaService,
            useValue: testModule.prisma,
          },
          {
            provide: HashService,
            useClass: MockHashService,
          },
        ],
      }).compile();

      usersService = module.get<UsersService>(UsersService);
    });

    afterAll(async () => {
      await testModule?.disconnect();
    });

    beforeEach(async () => {
      await testModule.resetDatabase();
    });

    describe('create (Integration)', () => {
      it('should create a user in the real database', async () => {
        const result = await usersService.create({
          email: 'integration-users@example.com',
          password: 'SecurePass123!',
          name: 'Integration Users Test',
        });

        expect(result.name).toBe('Integration Users Test');
        expect(result.userType).toBe('CUSTOMER');
        expect(result.status).toBe('ACTIVE');

        // Verify user exists in database by ID
        const dbUser = await testModule.prisma.user.findUnique({
          where: { id: result.id },
        });
        expect(dbUser).not.toBeNull();
        expect(dbUser?.name).toBe('Integration Users Test');
      });

      it('should create user with default userType and status', async () => {
        const result = await usersService.create({
          password: 'SecurePass123!',
          name: 'Default User Test',
        });

        expect(result.userType).toBe('CUSTOMER');
        expect(result.status).toBe('ACTIVE');
      });
    });

    describe('findOne (Integration)', () => {
      it('should return user by id from real database', async () => {
        const user = await createTestUser(testModule.prisma, 'CUSTOMER', {
          email: 'findone@example.com',
        });

        const result = await usersService.findOne(user.id);
        expect(result.id).toBe(user.id);
        expect(result.email).toBe('findone@example.com');
      });

      it('should throw NotFoundException for non-existent user', async () => {
        await expect(usersService.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundException);
      });
    });
  });
}
