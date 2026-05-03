import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { AdminReportsService } from "../services/admin-reports.service";
import {
  ReportQueryDto,
  AdminReportSummaryDto,
} from "../dto/admin-report.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";

@ApiTags("Admin Reports")
@ApiBearerAuth("JWT-auth")
@Controller("admin/reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  /**
   * GET /api/v1/admin/reports/summary
   * Aggregated booking/revenue/cancellation stats within a date range
   */
  @Get("summary")
  @ApiOperation({ summary: "Get admin report summary for date range" })
  @ApiQuery({
    name: "startDate",
    required: true,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: true,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Report summary retrieved successfully",
    type: AdminReportSummaryDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin role required" })
  async getSummary(
    @Query(new ValidationPipe({ transform: true })) query: ReportQueryDto,
  ): Promise<AdminReportSummaryDto> {
    return this.adminReportsService.getSummary(
      query.startDate,
      query.endDate,
    );
  }
}
