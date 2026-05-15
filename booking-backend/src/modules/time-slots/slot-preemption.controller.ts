import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  SlotPreemptionService,
  ReservationInput,
} from "./slot-preemption.service";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * DTO for slot reservation request body.
 */
export class ReserveSlotDto {
  /**
   * Preferred sequence number (0-9).
   * Generated randomly by the frontend to distribute load.
   */
  preferSeq!: number;

  /**
   * Service ID for the appointment.
   */
  serviceId!: string;

  /**
   * Customer name.
   */
  customerName!: string;

  /**
   * Customer email address.
   */
  customerEmail!: string;

  /**
   * Customer phone number.
   */
  customerPhone!: string;

  /**
   * Optional notes for the appointment.
   */
  notes?: string;
}

/**
 * Controller for high-concurrency slot reservation endpoints.
 *
 * API Contract: T005-CONCURRENCY-DESIGN Section 11
 */
@ApiTags("Slot Reservation")
@ApiBearerAuth()
@Controller("slots")
@UseGuards(JwtAuthGuard)
export class SlotPreemptionController {
  constructor(private readonly slotPreemptionService: SlotPreemptionService) {}

  /**
   * Reserve a time slot for booking.
   *
   * POST /api/v1/slots/:slotId/reserve
   *
   * @param slotId The time slot ID to reserve
   * @param body Reservation data
   * @param userId User ID from JWT token
   * @param idempotencyKey Optional idempotency key for retry safety
   */
  @Post(":slotId/reserve")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Reserve a time slot",
    description:
      "Atomically reserve a time slot with optimistic locking and retry logic. Supports idempotency via Idempotency-Key header.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    description:
      "Optional idempotency key for safe retries (SHA256 hash recommended)",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Slot reserved successfully",
    schema: {
      example: {
        success: true,
        status: "SUCCESS",
        appointment: {
          id: "appointment-uuid",
          userId: "user-uuid",
          timeSlotId: "slot-uuid",
          serviceId: "service-uuid",
          status: "PENDING",
          customerName: "John Doe",
          customerEmail: "john@example.com",
          createdAt: "2026-04-15T10:00:00Z",
        },
        allocatedSeq: 3,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Rate limit exceeded",
    schema: {
      example: {
        statusCode: 429,
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: 1,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Slot reservation failed after retries",
    schema: {
      example: {
        statusCode: 409,
        message: "Slot reservation failed: maximum retries exceeded",
      },
    },
  })
  async reserveSlot(
    @Param("slotId") slotId: string,
    @Body() body: ReserveSlotDto,
    @Req() req: AuthenticatedRequest,
    @Headers("Idempotency-Key") idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    // Extract user ID from JWT token (attached by JwtAuthGuard)
    const userId = req.user?.id;

    // Validate preferSeq range
    if (body.preferSeq < 0 || body.preferSeq >= 10) {
      throw new BadRequestException("preferSeq must be between 0 and 9");
    }

    // Validate required fields
    if (!userId) {
      throw new BadRequestException(
        "User ID is required (should be provided by JWT guard)",
      );
    }

    const input: ReservationInput = {
      userId,
      slotId,
      preferSeq: body.preferSeq,
      serviceId: body.serviceId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      notes: body.notes,
      idempotencyKey,
    };

    const result = await this.slotPreemptionService.reserveSlot(input);

    // Map result to appropriate HTTP response
    if (result.status === "RATE_LIMITED") {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: result.reason,
        retryAfter: result.retryAfter,
      };
    }

    if (result.status === "CONFLICT" || result.status === "FAILED") {
      return {
        statusCode:
          result.status === "CONFLICT"
            ? HttpStatus.CONFLICT
            : HttpStatus.SERVICE_UNAVAILABLE,
        message: result.reason,
      };
    }

    // Success
    return {
      success: true,
      appointment: result.appointment,
      allocatedSeq: result.allocatedSeq,
    };
  }
}
