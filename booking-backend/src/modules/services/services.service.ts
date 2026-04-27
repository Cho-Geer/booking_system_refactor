import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createServiceDto: CreateServiceDto) {
    return this.prisma.service.create({
      data: createServiceDto,
      include: {
        category: true,
      },
    });
  }

  async findAll(page = 1, pageSize = 10, isActive?: boolean) {
    const skip = (page - 1) * pageSize;
    const where = isActive !== undefined ? { isActive } : {};

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          category: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data: services,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    await this.prisma.service.delete({ where: { id } });
    return { message: "Service deleted successfully" };
  }
}
