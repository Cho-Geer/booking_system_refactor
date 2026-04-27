import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { CreateTimeSlotDto, UpdateTimeSlotDto } from "./dto/time-slot.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class TimeSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTimeSlotDto: CreateTimeSlotDto) {
    // Check for duplicate time slot (slotTime is unique)
    const existingSlot = await this.prisma.timeSlot.findUnique({
      where: {
        slotTime: createTimeSlotDto.slotTime,
      },
    });

    if (existingSlot) {
      throw new ConflictException("Time slot already exists for this time");
    }

    return this.prisma.timeSlot.create({
      data: {
        serviceId: createTimeSlotDto.serviceId,
        slotTime: createTimeSlotDto.slotTime,
        durationMinutes: createTimeSlotDto.durationMinutes || 60,
        capacity: createTimeSlotDto.capacity || 1,
        isActive:
          createTimeSlotDto.isActive !== undefined
            ? createTimeSlotDto.isActive
            : true,
        displayOrder: createTimeSlotDto.displayOrder || 0,
      },
      include: {
        service: true,
      },
    });
  }

  async findAll(
    serviceId?: string,
    isActive?: boolean,
    page = 1,
    pageSize = 10,
  ) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.TimeSlotWhereInput = {};

    if (serviceId) {
      where.serviceId = serviceId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [timeSlots, total] = await Promise.all([
      this.prisma.timeSlot.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          service: true,
        },
        orderBy: { slotTime: "asc" },
      }),
      this.prisma.timeSlot.count({ where }),
    ]);

    return {
      data: timeSlots,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }

    return timeSlot;
  }

  async update(id: string, updateTimeSlotDto: UpdateTimeSlotDto) {
    const timeSlot = await this.prisma.timeSlot.findUnique({ where: { id } });
    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }

    return this.prisma.timeSlot.update({
      where: { id },
      data: updateTimeSlotDto,
      include: {
        service: true,
      },
    });
  }

  async remove(id: string) {
    const timeSlot = await this.prisma.timeSlot.findUnique({ where: { id } });
    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }

    await this.prisma.timeSlot.delete({ where: { id } });
    return { message: "Time slot deleted successfully" };
  }

  async getAvailableSlots(serviceId: string, startDate: Date, endDate: Date) {
    return this.prisma.timeSlot.findMany({
      where: {
        serviceId,
        isActive: true,
        slotTime: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      include: {
        service: true,
      },
      orderBy: { slotTime: "asc" },
    });
  }
}
