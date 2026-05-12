import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminAppointmentsService } from "../services/admin-appointments.service";
import {
  AdminAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
  BatchCancelDto,
  CreateAdminAppointmentDto,
} from "../dto/admin-appointment.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { RateLimit } from "../../rate-limiter/rate-limiter.decorator";

@ApiTags("Admin Appointments")
@Controller("admin/appointments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
@ApiBearerAuth("JWT-auth")
export class AdminAppointmentsController {
  constructor(
    private readonly adminAppointmentsService: AdminAppointmentsService,
  ) {}

  @Get()
  @RateLimit({ tier: "api", key: "ip", limit: 30 })
  @ApiOperation({ summary: "List all appointments with filters" })
  @ApiResponse({ status: 200, description: "Paginated list of appointments" })
  async findAll(@Query() query: AdminAppointmentsQueryDto) {
    return this.adminAppointmentsService.findAll(query);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update appointment status" })
  @ApiResponse({ status: 200, description: "Status updated" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiResponse({ status: 404, description: "Appointment not found" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: any,
  ) {
    const performedBy = req?.user?.id;
    return this.adminAppointmentsService.updateStatus(id, dto, performedBy);
  }

  @Post()
  @RateLimit({ tier: "api", key: "ip", limit: 30 })
  @ApiOperation({ summary: "Create appointment on behalf of a customer" })
  @ApiResponse({ status: 201, description: "Appointment created" })
  @ApiResponse({ status: 404, description: "User or service not found" })
  async create(@Body() dto: CreateAdminAppointmentDto, @Req() req: any) {
    const performedBy = req?.user?.id;
    return this.adminAppointmentsService.create(dto, performedBy);
  }

  @Post("batch-cancel")
  @ApiOperation({ summary: "Batch cancel appointments" })
  @ApiResponse({ status: 200, description: "Batch cancel result" })
  async batchCancel(@Body() dto: BatchCancelDto) {
    return this.adminAppointmentsService.batchCancel(dto);
  }
}
