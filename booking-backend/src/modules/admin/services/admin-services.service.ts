import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/database/prisma.service";
import { ServicesService } from "../../services/services.service";
import {
  AdminServiceDto,
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  AdminServicesQueryDto,
} from "../dto/admin-service.dto";
import { MetaDto } from "../../../common/dto/base.dto";
import {
  toAdminServiceDto,
  fromCreateAdminServiceDto,
  fromUpdateAdminServiceDto,
} from "../mappers/service.mapper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToDto(service: any): AdminServiceDto {
  return toAdminServiceDto(service);
}

@Injectable()
export class AdminServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicesService: ServicesService,
  ) {}

  async findAll(
    query: AdminServicesQueryDto,
  ): Promise<{ items: AdminServiceDto[]; meta: MetaDto }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    // Active filter: map `active` → `isActive`
    if (query.active !== undefined) {
      where.isActive = query.active;
    }

    // Search filter: name OR description LIKE (case-insensitive)
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: services.map(mapToDto),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<AdminServiceDto> {
    const service = await this.servicesService.findOne(id);
    return mapToDto(service as any);
  }

  async create(dto: CreateAdminServiceDto): Promise<AdminServiceDto> {
    const prismaData = fromCreateAdminServiceDto(dto);
    const service = await this.servicesService.create(prismaData as any);
    return mapToDto(service as any);
  }

  async update(
    id: string,
    dto: UpdateAdminServiceDto,
  ): Promise<AdminServiceDto> {
    const prismaData = fromUpdateAdminServiceDto(dto);
    const service = await this.servicesService.update(id, prismaData as any);
    return mapToDto(service as any);
  }

  async remove(id: string): Promise<void> {
    await this.servicesService.remove(id);
  }
}
