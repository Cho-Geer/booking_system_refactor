import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { NotificationService } from '../../../modules/notifications/notification.service';
import { EmailService } from '../../../modules/email/email.service';
import {
  AdminAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
  BatchCancelDto,
  BatchCancelResponseDto,
  CreateAdminAppointmentDto,
  AdminAppointmentDto,
} from '../dto/admin-appointment.dto';
import { MetaDto } from '../../../common/dto/base.dto';
import { toAdminAppointmentDto, generateAppointmentNumber } from '../mappers/appointment.mapper';

/**
 * Valid state transitions for admin appointment status updates.
 * Key: current status, Value: allowed target statuses.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
};

@Injectable()
export class AdminAppointmentsService {
  private readonly logger = new Logger(AdminAppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new appointment on behalf of a customer.
   * Validates user and service exist, auto-assigns time slot if not provided,
   * generates appointment number, and creates the appointment record.
   */
  async create(dto: CreateAdminAppointmentDto, performedBy?: string): Promise<AdminAppointmentDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
    }

    const price = new Prisma.Decimal(service.price ?? 0);
    const taxRate = new Prisma.Decimal(service.taxRate ?? 0);
    const taxIncludedAmount = price.mul(new Prisma.Decimal(1).add(taxRate));

    let timeSlotId = dto.timeSlotId;
    if (!timeSlotId) {
      const slot = await this.prisma.timeSlot.findFirst({
        where: { isActive: true },
        orderBy: { startTime: 'asc' },
      });
      if (!slot) {
        throw new BadRequestException('No available time slot found');
      }
      timeSlotId = slot.id;
    } else {
      const timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id: timeSlotId },
      });
      if (!timeSlot) {
        throw new NotFoundException(`Time slot with ID ${timeSlotId} not found`);
      }
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        userId: dto.userId,
        serviceId: dto.serviceId,
        timeSlotId,
        appointmentDate: new Date(dto.appointmentDate),
        appointmentNumber: generateAppointmentNumber(),
        customerInfo: {},
        status: 'PENDING',
        durationMinutes: service.durationMinutes + (dto.overtimeMinutes ?? 0),
        price,
        taxRate,
        taxIncludedAmount,
        remarks: dto.notes ?? null,
      },
      include: {
        user: { select: { name: true } },
        service: { select: { name: true } },
        timeSlot: true,
      },
    });

    this.logger.log(
      `Admin created appointment ${appointment.appointmentNumber} for user ${dto.userId}${performedBy ? ` by ${performedBy}` : ''}`,
    );

    return toAdminAppointmentDto(appointment);
  }

  /**
   * Retrieve paginated appointments with optional filters.
   *
   * Supports filtering by:
   * - date range (startDate / endDate on appointmentDate)
   * - serviceId
   * - userId
   * - status
   */
  async findAll(
    query: AdminAppointmentsQueryDto,
  ): Promise<{ items: AdminAppointmentDto[]; meta: MetaDto }> {
    const { page = 1, limit = 20, status, startDate, endDate, serviceId, userId, search } = query;

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (search) {
      where.OR = [
        { appointmentNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day for inclusive filtering
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.appointmentDate = dateFilter;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: { select: { name: true } },
          service: { select: { name: true } },
          timeSlot: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const totalPages = Math.ceil(Number(total) / limit);

    return {
      items: appointments.map((appt) => toAdminAppointmentDto(appt)),
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

  /**
   * Update appointment status with state machine validation.
   *
   * Valid transitions:
   * - PENDING  → CONFIRMED, CANCELLED
   * - CONFIRMED → COMPLETED, CANCELLED
   * - COMPLETED → CANCELLED
   * - CANCELLED → (none)
   * - EXPIRED   → (none)
   *
   * Cancellation requires a reason.
   */
  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    performedBy?: string,
  ): Promise<{ id: string; status: string; updatedAt: Date }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    const currentStatus = appointment.status;
    const newStatus = dto.status;

    // Validate state transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Cancellation requires a reason
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'CANCELLED' && dto.reason) {
      updateData.remarks = dto.reason;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Admin updated appointment ${id}: ${currentStatus} -> ${newStatus}${performedBy ? ` by ${performedBy}` : ''}`,
    );

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Batch cancel appointments. Non-transactional — processes each
   * appointment individually and collects failures.
   *
   * For each successfully cancelled appointment:
   * - Creates an audit log entry via activityLog.create
   * - Sends a WebSocket notification via notificationService.notifyCancellation (fire-and-forget)
   * - Sends an email via emailService.sendAppointmentCancellation (fire-and-forget)
   */
  async batchCancel(
    dto: BatchCancelDto,
    performedBy?: string,
  ): Promise<BatchCancelResponseDto> {
    const failedIds: string[] = [];
    let successCount = 0;

    for (const id of dto.ids) {
      try {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id },
          include: {
            user: { select: { name: true, email: true } },
            service: { select: { name: true } },
            timeSlot: { select: { startTime: true, endTime: true } },
          },
        });

        if (!appointment) {
          failedIds.push(id);
          continue;
        }

        if (appointment.status === 'CANCELLED') {
          failedIds.push(id);
          continue;
        }

        const updateData: Record<string, unknown> = {
          status: 'CANCELLED',
        };
        if (dto.reason) {
          updateData.remarks = dto.reason;
        }

        await this.prisma.appointment.update({
          where: { id },
          data: updateData,
        });

        // Create audit log entry
        try {
          await this.prisma.activityLog.create({
            data: {
              userId: appointment.userId,
              action: 'BOOKING_CANCEL',
              resourceType: 'APPOINTMENT',
              resourceId: id,
              metadata: {
                reason: dto.reason ?? null,
                performedBy: performedBy ?? null,
              },
            },
          });
        } catch (auditError) {
          this.logger.error(
            `Failed to create audit log for cancelled appointment ${id}: ${(auditError as Error).message}`,
          );
          // Audit log errors are not fatal — continue processing
        }

        // Fire-and-forget: WebSocket notification
        try {
          const dateStr = appointment.appointmentDate
            ? appointment.appointmentDate.toISOString().split('T')[0]
            : '';
          const timeStr = appointment.timeSlot?.startTime
            ? appointment.timeSlot.startTime.toISOString().split('T')[1]?.substring(0, 5) ?? ''
            : '';
          this.notificationService.notifyCancellation({
            appointmentId: id,
            userId: appointment.userId,
            serviceName: appointment.service?.name ?? 'Unknown Service',
            date: dateStr,
            time: timeStr,
            cancelReason: dto.reason ?? 'No reason provided',
            customerName: appointment.user?.name ?? 'Customer',
            customerEmail: appointment.user?.email ?? '',
          });
        } catch (notifError) {
          this.logger.warn(
            `Failed to send cancellation notification for appointment ${id}: ${(notifError as Error).message}`,
          );
        }

        // Fire-and-forget: Email notification
        try {
          const dateStr = appointment.appointmentDate
            ? appointment.appointmentDate.toISOString().split('T')[0]
            : '';
          this.emailService.sendAppointmentCancellation({
            appointmentId: id,
            customerName: appointment.user?.name ?? 'Customer',
            customerEmail: appointment.user?.email ?? '',
            serviceName: appointment.service?.name ?? 'Unknown Service',
            date: dateStr,
            cancelReason: dto.reason ?? 'No reason provided',
          });
        } catch (emailError) {
          this.logger.warn(
            `Failed to send cancellation email for appointment ${id}: ${(emailError as Error).message}`,
          );
        }

        successCount++;
      } catch (error) {
        this.logger.warn(`Failed to cancel appointment ${id}: ${(error as Error).message}`);
        failedIds.push(id);
      }
    }

    return {
      successCount,
      failedCount: failedIds.length,
      failedIds,
    };
  }
}
