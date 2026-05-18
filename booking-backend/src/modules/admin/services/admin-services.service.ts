import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { ServicesService } from '../../services/services.service';
import { AdminAppointmentsService } from './admin-appointments.service';
import {
  AdminServiceDto,
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  AdminServicesQueryDto,
} from '../dto/admin-service.dto';
import { MetaDto } from '../../../common/dto/base.dto';
import {
  toAdminServiceDto,
  fromCreateAdminServiceDto,
  fromUpdateAdminServiceDto,
} from '../mappers/service.mapper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToDto(service: any): AdminServiceDto {
  return toAdminServiceDto(service);
}

export interface CascadeResult {
  cancelledCount: number;
  failedCount: number;
}

export interface AffectedAppointmentsResponse {
  serviceName: string;
  pendingCount: number;
  confirmedCount: number;
  totalAffected: number;
}

@Injectable()
export class AdminServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicesService: ServicesService,
    private readonly adminAppointmentsService: AdminAppointmentsService,
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
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Category filter: match by category name
    if (query.category) {
      where.category = { name: { contains: query.category, mode: 'insensitive' } };
    }

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        skip,
        take: limit,
        where,
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    const totalPages = Math.ceil(Number(total) / limit);

    return {
      items: services.map(mapToDto),
      meta: {
        total: Number(total),
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
    // Auto-calculate pricePerMinute if not explicitly provided
    if (
      dto.pricePerMinute === undefined &&
      dto.price !== undefined &&
      dto.duration !== undefined &&
      dto.duration > 0
    ) {
      dto = {
        ...dto,
        pricePerMinute: Math.round((dto.price / dto.duration) * 100) / 100,
      };
    }
    const prismaData = fromCreateAdminServiceDto(dto);

    // Resolve category name to categoryId
    if (dto.category) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { name: dto.category },
      });
      if (!category) {
        throw new NotFoundException(`Category '${dto.category}' not found`);
      }
      (prismaData as Record<string, unknown>).categoryId = category.id;
    }

    const service = await this.servicesService.create(prismaData as any);
    return mapToDto(service as any);
  }

  async update(
    id: string,
    dto: UpdateAdminServiceDto,
  ): Promise<AdminServiceDto & { cascade?: CascadeResult }> {
    // Auto-calculate pricePerMinute only when both price AND duration present in DTO
    if (
      dto.pricePerMinute === undefined &&
      dto.price !== undefined &&
      dto.duration !== undefined &&
      dto.duration > 0
    ) {
      dto = {
        ...dto,
        pricePerMinute: Math.round((dto.price / dto.duration) * 100) / 100,
      };
    }
    const prismaData = fromUpdateAdminServiceDto(dto);

    // Resolve category name to categoryId
    if (dto.category) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { name: dto.category },
      });
      if (!category) {
        throw new NotFoundException(`Category '${dto.category}' not found`);
      }
      (prismaData as Record<string, unknown>).categoryId = category.id;
    }

    // Cascade: if active is being set to false, check previous state
    let wasPreviouslyActive = false;
    if (dto.active === false) {
      const currentService = await this.servicesService.findOne(id);
      wasPreviouslyActive = currentService.isActive === true;
    }

    const service = await this.servicesService.update(id, prismaData as any);

    // Cascade: if service transitioned from active → inactive
    if (dto.active === false && wasPreviouslyActive) {
      const pendingAppointments = await this.prisma.appointment.findMany({
        where: { serviceId: id, status: 'PENDING' },
        select: { id: true },
      });

      if (pendingAppointments.length === 0) {
        return { ...mapToDto(service as any) };
      }

      let cancelledCount = 0;
      let failedCount = 0;

      for (const appointment of pendingAppointments) {
        try {
          await this.adminAppointmentsService.updateStatus(appointment.id, {
            status: 'CANCELLED',
            reason: `Service "${service.name}" was disabled by admin`,
          });
          cancelledCount++;
          // Create activity log entry
          try {
            await this.prisma.activityLog.create({
              data: {
                userId: null,
                action: 'BOOKING_CANCEL',
                resourceType: 'APPOINTMENT',
                resourceId: appointment.id,
                metadata: {
                  reason: `Service "${service.name}" was disabled by admin`,
                  cascade: true,
                },
              },
            });
          } catch {
            // Audit log errors are non-fatal
          }
        } catch {
          failedCount++;
        }
      }

      return {
        ...mapToDto(service as any),
        cascade: { cancelledCount, failedCount },
      };
    }

    return mapToDto(service as any);
  }

  async getAffectedAppointments(id: string): Promise<AffectedAppointmentsResponse> {
    const service = await this.servicesService.findOne(id);

    const [pendingCount, confirmedCount] = await Promise.all([
      this.prisma.appointment.count({
        where: { serviceId: id, status: 'PENDING' },
      }),
      this.prisma.appointment.count({
        where: { serviceId: id, status: 'CONFIRMED' },
      }),
    ]);

    return {
      serviceName: service.name,
      pendingCount,
      confirmedCount,
      totalAffected: pendingCount + confirmedCount,
    };
  }

  async uploadImage(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
  ): Promise<{ image_url: string }> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const imageUrl = `/uploads/services/${file.filename ?? file.originalname}`;

    await this.prisma.service.update({
      where: { id },
      data: { imageUrl },
    });

    return { image_url: imageUrl };
  }

  async remove(id: string): Promise<void> {
    await this.servicesService.remove(id);
  }

  async getSummary(): Promise<{
    totalServices: number;
    activeServicesCount: number;
    inactiveServicesCount: number;
    averagePrice: number;
    categories: { category: string; count: number }[];
  }> {
    const [totalServices, activeServicesCount, priceAgg, categoryGroups] = await Promise.all([
      this.prisma.service.count(),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.service.aggregate({
        _avg: { price: true },
      }),
      this.prisma.service.groupBy({
        by: ['categoryId'],
        _count: { id: true },
      }),
    ]);

    const categoryIds = categoryGroups
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);
    const categoryNames =
      categoryIds.length > 0
        ? await this.prisma.serviceCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [];
    const categoryMap = new Map(categoryNames.map((c) => [c.id, c.name]));

    return {
      totalServices,
      activeServicesCount,
      inactiveServicesCount: Number(totalServices) - Number(activeServicesCount),
      averagePrice: Number(priceAgg._avg.price) || 0,
      categories: categoryGroups.map((g) => ({
        category: categoryMap.get(g.categoryId ?? '') || (g.categoryId ?? ''),
        count: Number(g._count.id),
      })),
    };
  }
}
