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
    // Check for duplicate time slot (serviceId + startTime + endTime)
    const existingSlot = await this.prisma.timeSlot.findFirst({
      where: {
        serviceId: createTimeSlotDto.serviceId,
        startTime: new Date(createTimeSlotDto.startTime),
        endTime: new Date(createTimeSlotDto.endTime),
      },
    });

    if (existingSlot) {
      throw new ConflictException(
        "Time slot already exists for this service and time range",
      );
    }

    return this.prisma.timeSlot.create({
      data: {
        serviceId: createTimeSlotDto.serviceId,
        startTime: new Date(createTimeSlotDto.startTime),
        endTime: new Date(createTimeSlotDto.endTime),
        capacity: createTimeSlotDto.capacity || 1,
        isActive: true,
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
    limit = 10,
  ) {
    const skip = (page - 1) * limit;
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
        take: limit,
        where,
        include: {
          service: true,
        },
        orderBy: { startTime: "asc" },
      }),
      this.prisma.timeSlot.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: timeSlots,
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

  async getAvailableSlots(
    serviceId: string,
    startDate: Date,
    endDate: Date,
    overtimeMinutes?: number,
    timezone?: string,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    await this.generateTimeSlotsForDateRange(
      { id: service.id, durationMinutes: service.durationMinutes },
      startDate,
      endDate,
    );

    const slots = await this.prisma.timeSlot.findMany({
      where: {
        serviceId,
        isActive: true,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return slots.map((slot, index, arr) => {
      const nextSlot = arr[index + 1];
      let maxOvertimeMinutes: number | undefined;
      if (nextSlot) {
        maxOvertimeMinutes = Math.max(
          0,
          Math.round(
            (nextSlot.startTime.getTime() - slot.endTime.getTime()) / 60000,
          ),
        );
      }

      let available = slot.capacity > slot._count.appointments;
      if (
        overtimeMinutes !== undefined &&
        maxOvertimeMinutes !== undefined &&
        overtimeMinutes > maxOvertimeMinutes
      ) {
        available = false;
      }

      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        bookedCount: slot._count.appointments,
        available,
        maxOvertimeMinutes,
      };
    });
  }

  private async generateTimeSlotsForDateRange(
    service: { id: string; durationMinutes: number },
    startDate: Date,
    endDate: Date,
  ) {
    const { id: serviceId, durationMinutes } = service;
    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0);

    const endDateEnd = new Date(endDate);
    endDateEnd.setUTCHours(23, 59, 59, 999);

    while (currentDate <= endDateEnd) {
      let slotStart = new Date(currentDate);
      slotStart.setUTCHours(9, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setUTCHours(17, 0, 0, 0);

      while (slotStart < dayEnd) {
        const slotEnd = new Date(
          slotStart.getTime() + durationMinutes * 60 * 1000,
        );

        // Use upsert with the compound unique identifier (using a composite key approach)
        // Since we removed @unique from slotTime, we use findFirst + create as a workaround
        // for the upsert since Prisma's upsert requires a unique constraint.
        const existingSlot = await this.prisma.timeSlot.findFirst({
          where: {
            serviceId,
            startTime: slotStart,
            endTime: slotEnd,
          },
        });

        if (existingSlot) {
          await this.prisma.timeSlot.update({
            where: { id: existingSlot.id },
            data: {
              serviceId,
              capacity: 1,
              isActive: true,
            },
          });
        } else {
          await this.prisma.timeSlot.create({
            data: {
              serviceId,
              startTime: slotStart,
              endTime: slotEnd,
              capacity: 1,
              isActive: true,
            },
          });
        }

        slotStart = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }
}
