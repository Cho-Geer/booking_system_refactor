import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from "./dto/appointment.dto";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { withRetry, isTransientDbError } from "../../common/utils/retry.util";
import { sleep } from "../../common/utils/sleep.util";

// Configuration constants for high-concurrency slot preemption
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 100;

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Exposed sleep method for retry backoff.
   * Public visibility allows tests to mock/spy on it.
   * Delegates to the shared utility function.
   */
  public sleep(ms: number): Promise<void> {
    return sleep(ms);
  }

  /**
   * Create a new appointment with atomic slot preemption for high-concurrency safety.
   * Uses optimistic locking with currentSequence field and exponential backoff retry.
   */
  async create(createAppointmentDto: CreateAppointmentDto, userId: string) {
    // Check if time slot exists and is available
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: createAppointmentDto.timeSlotId },
    });

    if (!timeSlot) {
      throw new NotFoundException("Time slot not found");
    }

    if (!timeSlot.isActive) {
      throw new ConflictException("Time slot is not available");
    }

    // Attempt atomic slot preemption with retry logic
    let appointment;
    try {
      appointment = await withRetry(
        (attempt) =>
          this.attemptAtomicCreate(
            createAppointmentDto,
            timeSlot.currentSequence,
            attempt,
            userId,
          ),
        {
          maxRetries: MAX_RETRIES,
          baseDelayMs: BACKOFF_BASE_MS,
          operationName: "atomicCreateAppointment",
          logger: this.logger,
        },
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(
          `Slot reservation failed after ${MAX_RETRIES} attempts: maximum retries exceeded`,
        );
      }
      if (isTransientDbError(error)) {
        throw new ConflictException(
          "Slot reservation failed: Database timeout",
        );
      }
      throw error;
    }

    // Extract customer info from JSON
    const customerInfo = appointment.customerInfo as unknown as CustomerInfo;

    // Queue appointment confirmation email
    try {
      await this.emailService.sendAppointmentConfirmation({
        appointmentId: appointment.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        serviceName: appointment.service.name,
        date: appointment.timeSlot.startTime.toISOString().split("T")[0],
        time: appointment.timeSlot.startTime.toISOString(),
      });
    } catch (error) {
      this.logger.error(
        "Failed to queue appointment confirmation email:",
        error,
      );
    }

    // Send real-time booking confirmation notification
    try {
      this.notificationService.notifyBookingConfirmation({
        appointmentId: appointment.id,
        userId: appointment.userId,
        serviceName: appointment.service.name,
        date: appointment.timeSlot.startTime.toISOString().split("T")[0],
        time: appointment.timeSlot.startTime.toISOString(),
        status: appointment.status,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
      });
    } catch (error) {
      this.logger.error(
        "Failed to send booking confirmation notification:",
        error,
      );
    }

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        userId: appointment.userId,
        action: "BOOKING_CREATE",
        resourceType: "APPOINTMENT",
        resourceId: appointment.id,
        metadata: { serviceId: appointment.serviceId, timeSlotId: appointment.timeSlotId },
      },
    });

    return appointment;
  }

  /**
   * Single attempt at atomic appointment creation with optimistic locking.
   * Returns the created appointment, or throws if the slot is taken.
   * Retry-worthy errors (collision, timeout) propagate to the caller for withRetry to handle.
   */
  private async attemptAtomicCreate(
    createAppointmentDto: CreateAppointmentDto,
    initialSequence: number,
    attempt: number,
    userId: string,
  ) {
    const targetSeq = initialSequence + attempt;

    try {
      const appointment = await this.prisma.$transaction(
        async (tx) => {
          // Atomic slot reservation using optimistic locking
          const updateResult = await tx.timeSlot.updateMany({
            where: {
              id: createAppointmentDto.timeSlotId,
              isActive: true,
              currentSequence: targetSeq,
            },
            data: {
              currentSequence: { increment: 1 },
            },
          });

          if (updateResult.count === 0) {
            // Collision detected - slot already taken or sequence mismatch
            throw new ConflictException(
              "Slot reservation collision: concurrent booking detected",
            );
          }

          // Slot claimed successfully — create appointment
          const newAppointment = await tx.appointment.create({
            data: {
              userId,
              timeSlotId: createAppointmentDto.timeSlotId,
              serviceId: createAppointmentDto.serviceId,
              customerInfo: (createAppointmentDto.customerInfo ?? {}) as Prisma.InputJsonValue,
              remarks: createAppointmentDto.notes,
              status: AppointmentStatus.PENDING,
              appointmentDate: createAppointmentDto.appointmentDate
                ? new Date(createAppointmentDto.appointmentDate)
                : new Date(),
              slotSequence: targetSeq,
              appointmentNumber: `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            },
            include: {
              timeSlot: true,
              service: true,
            },
          });

          return newAppointment;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 5000,
          timeout: 10000,
        },
      );

      this.logger.log(
        `Appointment created: slotId=${createAppointmentDto.timeSlotId}, seq=${targetSeq}, userId=${userId}`,
      );
      return appointment;
    } catch (error: unknown) {
      // Let retry logic handle transient DB errors
      if (isTransientDbError(error)) {
        throw error;
      }

      // Re-throw non-transient errors (ConflictException, NotFoundException, etc.)
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: AppointmentStatus,
    userId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.AppointmentWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        skip,
        take: limit,
        where,
        include: {
          timeSlot: true,
          service: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: appointments,
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
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        timeSlot: true,
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    const data: Prisma.AppointmentUpdateInput = { ...updateAppointmentDto };
    if (updateAppointmentDto.status === AppointmentStatus.CANCELLED) {
      data.remarks = updateAppointmentDto.cancelReason || appointment.remarks;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        timeSlot: true,
        service: true,
      },
    });

    const customerInfo = updated.customerInfo as unknown as CustomerInfo;

    if (
      updateAppointmentDto.status &&
      updateAppointmentDto.status !== appointment.status
    ) {
      try {
        this.notificationService.notifyAppointmentUpdate({
          appointmentId: updated.id,
          userId: updated.userId,
          serviceName: updated.service.name,
          date: updated.timeSlot.startTime.toISOString().split("T")[0],
          time: updated.timeSlot.startTime.toISOString(),
          status: updated.status,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
        });
      } catch (error) {
        this.logger.error(
          "Failed to send appointment update notification:",
          error,
        );
      }

      try {
        this.notificationsGateway.sendAppointmentStatusChanged({
          appointmentId: updated.id,
          status: updated.status,
          previousStatus: appointment.status,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error(
          "Failed to broadcast appointment status change:",
          error,
        );
      }

      // Audit log for status change
      await this.prisma.activityLog.create({
        data: {
          userId: updated.userId,
          action: "STATUS_CHANGE",
          resourceType: "APPOINTMENT",
          resourceId: updated.id,
          metadata: { previousStatus: appointment.status, newStatus: updated.status, cancelReason: updateAppointmentDto.cancelReason },
        },
      });
    }

    return updated;
  }

  async cancel(id: string, reason: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { timeSlot: true, service: true },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException("Appointment is already cancelled");
    }

    const customerInfo = appointment.customerInfo as unknown as CustomerInfo;

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          remarks: reason,
        },
        include: {
          timeSlot: true,
          service: true,
        },
      });

      return cancelled;
    });

    try {
      await this.emailService.sendAppointmentCancellation({
        appointmentId: updated.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        serviceName: updated.service.name,
        date: updated.timeSlot.startTime.toISOString().split("T")[0],
        time: updated.timeSlot.startTime.toISOString(),
        cancelReason: reason,
      });
    } catch (error) {
      this.logger.error(
        "Failed to queue appointment cancellation email:",
        error,
      );
    }

    try {
      this.notificationService.notifyCancellation({
        appointmentId: updated.id,
        userId: updated.userId,
        serviceName: updated.service.name,
        date: updated.timeSlot.startTime.toISOString().split("T")[0],
        time: updated.timeSlot.startTime.toISOString(),
        cancelReason: reason,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
      });
    } catch (error) {
      this.logger.error("Failed to send cancellation notification:", error);
    }

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        userId: updated.userId,
        action: "BOOKING_CANCEL",
        resourceType: "APPOINTMENT",
        resourceId: updated.id,
        metadata: { reason },
      },
    });

    return updated;
  }

  async remove(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    await this.prisma.appointment.delete({ where: { id } });
    return { message: "Appointment deleted successfully" };
  }
}
