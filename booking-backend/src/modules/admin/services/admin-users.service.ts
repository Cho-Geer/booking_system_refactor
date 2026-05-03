import { Injectable, NotFoundException } from "@nestjs/common";
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

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * List admin users with pagination, search, role, and status filters.
   * - `search`: OR condition on name, email, phone using contains + mode: 'insensitive'
   * - `role`: mapped to userType Prisma field
   * - `status`: passed through directly
   */
  async findAll(query: AdminUsersQueryDto): Promise<PaginatedResponseDto<AdminUserDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Search filter: OR on name, email, phone
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Role filter: maps to userType
    if (query.role) {
      where.userType = query.role;
    }

    // Status filter: direct pass-through
    if (query.status) {
      where.status = query.status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const meta: MetaDto = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const items = users.map(toAdminUserDto);

    return { items, meta };
  }

  /**
   * Find a user by ID, mapped to AdminUserDto.
   * Delegates to UsersService.findOne.
   */
  async findOne(id: string): Promise<AdminUserDto> {
    const user = await this.usersService.findOne(id);
    return toAdminUserDto(user);
  }

  /**
   * Create a new admin user.
   * Maps role→userType via fromCreateAdminUserDto, delegates to UsersService.create.
   */
  async create(dto: CreateAdminUserDto): Promise<AdminUserDto> {
    // fromCreateAdminUserDto maps role→userType, cast for UsersService.create compatibility
    const createData = fromCreateAdminUserDto(dto) as Parameters<
      typeof this.usersService.create
    >[0];
    const user = await this.usersService.create(createData);
    return toAdminUserDto(user);
  }

  /**
   * Update an existing admin user.
   * Maps role→userType via fromUpdateAdminUserDto, delegates to UsersService.update.
   */
  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUserDto> {
    const updateData = fromUpdateAdminUserDto(dto) as Parameters<
      typeof this.usersService.update
    >[1];
    const user = await this.usersService.update(id, updateData);
    return toAdminUserDto(user);
  }

  /**
   * Remove a user by ID.
   * Delegates to UsersService.remove.
   */
  async remove(id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
