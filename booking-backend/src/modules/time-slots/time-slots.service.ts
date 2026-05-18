import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AdminSettingsService } from '../admin/services/admin-settings.service';
import { CreateTimeSlotDto, UpdateTimeSlotDto } from './dto/time-slot.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TimeSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

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
      throw new ConflictException('Time slot already exists for this service and time range');
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

  async findAll(serviceId?: string, isActive?: boolean, page = 1, limit = 10) {
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
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.timeSlot.count({ where }),
    ]);

    const totalPages = Math.ceil(Number(total) / limit);
    return {
      items: timeSlots,
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
    return { message: 'Time slot deleted successfully' };
  }

  async getAvailableSlots(
    serviceId: string,
    startDate: Date,
    endDate: Date,
    overtimeMinutes?: number,
    _timezone?: string,
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

    // Adjust endDate to end-of-day so that slots with startTime > midnight are included
    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const slots = await this.prisma.timeSlot.findMany({
      where: {
        serviceId,
        isActive: true,
        startTime: {
          gte: startDate,
          lte: endOfDay,
        },
      },
      include: {
        service: true,
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return slots.map((slot, index, arr) => {
      const nextSlot = arr[index + 1];
      let maxOvertimeMinutes: number | undefined;
      if (nextSlot) {
        maxOvertimeMinutes = Math.max(
          0,
          Math.round((nextSlot.startTime.getTime() - slot.endTime.getTime()) / 60000),
        );
      }

      let available = slot.capacity > Number(slot._count.appointments);
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
        bookedCount: Number(slot._count.appointments),
        available,
        maxOvertimeMinutes,
      };
    });
  }

  private async getBusinessHoursForDate(
    date: Date,
  ): Promise<{ openHour: number; openMin: number; closeHour: number; closeMin: number } | null> {
    const businessHours = await this.adminSettingsService.getBusinessHours();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getUTCDay()];
    const daySchedule = (
      businessHours as unknown as Record<string, Array<{ open: string; close: string }> | undefined>
    )[dayName];

    if (!daySchedule || daySchedule.length === 0) return null;

    const { open, close } = daySchedule[0];
    const [localOpenHour, localOpenMin] = open.split(':').map(Number);
    const [localCloseHour, localCloseMin] = close.split(':').map(Number);

    const timezone = businessHours.timezone || 'Asia/Shanghai';
    const offset = this.getUTCOffsetForTimezone(timezone, date);

    return {
      openHour: localOpenHour - offset,
      openMin: localOpenMin,
      closeHour: localCloseHour - offset,
      closeMin: localCloseMin,
    };
  }

  private getUTCOffsetForTimezone(timezone: string, date: Date): number {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const getNum = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const localMs = Date.UTC(
      getNum('year'),
      getNum('month') - 1,
      getNum('day'),
      getNum('hour'),
      getNum('minute'),
      getNum('second'),
    );

    return (localMs - date.getTime()) / 3600000;
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

    await this.prisma.timeSlot.deleteMany({
      where: {
        serviceId,
        startTime: { gte: startDate },
        endTime: { lte: endDateEnd },
        isActive: true,
      },
    });

    while (currentDate <= endDateEnd) {
      const hours = await this.getBusinessHoursForDate(currentDate);
      if (!hours) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        continue;
      }

      let slotStart = new Date(currentDate);
      slotStart.setUTCHours(hours.openHour, hours.openMin, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setUTCHours(hours.closeHour, hours.closeMin, 0, 0);

      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

        if (slotEnd > dayEnd) break;

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

        slotStart = new Date(slotStart.getTime() + (durationMinutes + 30) * 60 * 1000);
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }
}
