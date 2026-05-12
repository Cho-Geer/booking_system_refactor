import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminUsersService } from "./admin-users.service";
import { PrismaService } from "../../../common/database/prisma.service";
import { UsersService } from "../../users/users.service";
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AdminUserDto,
} from "../dto/admin-user.dto";
import {
  toAdminUserDto,
  fromCreateAdminUserDto,
  fromUpdateAdminUserDto,
} from "../mappers/user.mapper";
import { PaginatedResponseDto, MetaDto } from "../../../common/dto/base.dto";

// Mock PrismaService
const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

// Mock UsersService
const mockUsersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("AdminUsersService", () => {
  let service: AdminUsersService;
  let prisma: typeof mockPrismaService;
  let usersService: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
    prisma = module.get(PrismaService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPrismaUser = {
    id: "user-1",
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    userType: "CUSTOMER",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
  };

  const expectedAdminUserDto: AdminUserDto = {
    id: "user-1",
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
  };

  // ============================================================
  // findAll
  // ============================================================
  describe("findAll", () => {
    it("should return paginated users with default pagination", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const query: AdminUsersQueryDto = { page: 1, limit: 20 };
      const result = await service.findAll(query);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: {},
        orderBy: { createdAt: "desc" },
      });
      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(expectedAdminUserDto);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it("should apply search filter with OR on name, email, phone", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const query: AdminUsersQueryDto = { page: 1, limit: 20, search: "john" };
      await service.findAll(query);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: {
          OR: [
            { name: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
            { phone: { contains: "john", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should apply role filter mapped to userType", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const query: AdminUsersQueryDto = {
        page: 1,
        limit: 20,
        role: "ADMIN",
      };
      await service.findAll(query);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: { userType: "ADMIN" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should apply status filter directly", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockPrismaUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const query: AdminUsersQueryDto = {
        page: 1,
        limit: 20,
        status: "INACTIVE",
      };
      await service.findAll(query);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: { status: "INACTIVE" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should combine search, role, and status filters", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const query: AdminUsersQueryDto = {
        page: 1,
        limit: 20,
        search: "john",
        role: "ADMIN",
        status: "ACTIVE",
      };
      await service.findAll(query);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: {
          OR: [
            { name: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
            { phone: { contains: "john", mode: "insensitive" } },
          ],
          userType: "ADMIN",
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should calculate pagination meta correctly", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(50);

      const query: AdminUsersQueryDto = { page: 3, limit: 10 };
      const result = await service.findAll(query);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        where: {},
        orderBy: { createdAt: "desc" },
      });
      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
    });

    it("should return empty items when no users match", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const query: AdminUsersQueryDto = {
        page: 1,
        limit: 20,
        search: "nonexistent",
      };
      const result = await service.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ============================================================
  // findOne
  // ============================================================
  describe("findOne", () => {
    it("should delegate to UsersService.findOne and map result via toAdminUserDto", async () => {
      mockUsersService.findOne.mockResolvedValue(mockPrismaUser);

      const result = await service.findOne("user-1");

      expect(usersService.findOne).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(expectedAdminUserDto);
    });

    it("should propagate NotFoundException from UsersService", async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException("User with ID nonexistent not found"),
      );

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // create — HIGH-1: passwordHash nullable for code-login users
  // ============================================================
  describe("create", () => {
    it("[RED] should allow creating user without password (verification-code login)", () => {
      // HIGH-1: passwordHash should be optional to support pure verification-code login users.
      // The current mapper (fromCreateAdminUserDto) unconditionally copies dto.password,
      // so even when password is undefined, the property `password: undefined` exists in output.
      //
      // After the fix: mapper should conditionally omit password when undefined.
      // This test will FAIL because mapped output still has property 'password'.

      const dto = new CreateAdminUserDto();
      Object.assign(dto, {
        name: "Code Login User",
        email: "code@example.com",
        role: "CUSTOMER",
        // password is intentionally NOT set
      });

      const mapped = fromCreateAdminUserDto(dto as any);

      // The correct behavior: when password is undefined, the property should not exist
      // Current behavior: password: undefined is always included → this assertion FAILS
      expect(mapped).not.toHaveProperty("password");
    });
    it("should map role→userType using fromCreateAdminUserDto and delegate to UsersService.create", async () => {
      const dto: CreateAdminUserDto = {
        name: "New Admin",
        email: "admin@example.com",
        password: "SecurePass123!",
        role: "ADMIN",
      };

      const createdPrismaUser = {
        ...mockPrismaUser,
        name: "New Admin",
        email: "admin@example.com",
        userType: "ADMIN",
      };

      mockUsersService.create.mockResolvedValue(createdPrismaUser);

      const result = await service.create(dto);

      expect(usersService.create).toHaveBeenCalledWith(
        fromCreateAdminUserDto(dto),
      );
      expect(result).toEqual(toAdminUserDto(createdPrismaUser));
      expect(result.role).toBe("ADMIN");
    });

    it("should create a CUSTOMER user when role is CUSTOMER", async () => {
      const dto: CreateAdminUserDto = {
        name: "New Customer",
        email: "customer@example.com",
        password: "SecurePass123!",
        role: "CUSTOMER",
      };

      const createdPrismaUser = {
        ...mockPrismaUser,
        name: "New Customer",
        email: "customer@example.com",
        userType: "CUSTOMER",
      };

      mockUsersService.create.mockResolvedValue(createdPrismaUser);

      const result = await service.create(dto);

      expect(usersService.create).toHaveBeenCalledWith(
        fromCreateAdminUserDto(dto),
      );
      expect(result.role).toBe("CUSTOMER");
    });
  });

  // ============================================================
  // update
  // ============================================================
  describe("update", () => {
    it("should map role→userType using fromUpdateAdminUserDto and delegate to UsersService.update", async () => {
      const dto: UpdateAdminUserDto = {
        name: "Updated Name",
        role: "SUPER_ADMIN",
      };

      const updatedPrismaUser = {
        ...mockPrismaUser,
        name: "Updated Name",
        userType: "SUPER_ADMIN",
      };

      mockUsersService.update.mockResolvedValue(updatedPrismaUser);

      const result = await service.update("user-1", dto);

      expect(usersService.update).toHaveBeenCalledWith(
        "user-1",
        fromUpdateAdminUserDto(dto),
      );
      expect(result).toEqual(toAdminUserDto(updatedPrismaUser));
      expect(result.name).toBe("Updated Name");
      expect(result.role).toBe("SUPER_ADMIN");
    });

    it("should update only status when no role provided", async () => {
      const dto: UpdateAdminUserDto = {
        status: "BLOCKED",
      };

      const updatedPrismaUser = {
        ...mockPrismaUser,
        status: "BLOCKED",
      };

      mockUsersService.update.mockResolvedValue(updatedPrismaUser);

      const result = await service.update("user-1", dto);

      expect(usersService.update).toHaveBeenCalledWith(
        "user-1",
        fromUpdateAdminUserDto(dto),
      );
      expect(result.status).toBe("BLOCKED");
    });
  });

  // ============================================================
  // remove
  // ============================================================
  describe("remove", () => {
    it("should delegate to UsersService.remove", async () => {
      mockUsersService.remove.mockResolvedValue({
        message: "User deleted successfully",
      });

      await service.remove("user-1");

      expect(usersService.remove).toHaveBeenCalledWith("user-1");
    });

    it("should propagate NotFoundException from UsersService", async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException("User with ID nonexistent not found"),
      );

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
