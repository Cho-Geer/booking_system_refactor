import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { RateLimit } from "../../rate-limiter/rate-limiter.decorator";
import {
  AdminSettingsService,
  BusinessHoursDto,
} from "../services/admin-settings.service";

@ApiTags("Admin Settings")
@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
export class AdminSettingsController {
  constructor(
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  @Get("business-hours")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RateLimit({ tier: "api", key: "ip", limit: 30 })
  @ApiOperation({ summary: "Get business hours settings" })
  @ApiResponse({ status: 200, description: "Business hours configuration" })
  async getBusinessHours(): Promise<BusinessHoursDto> {
    return this.adminSettingsService.getBusinessHours();
  }

  @Put("business-hours")
  @Roles("SUPER_ADMIN")
  @RateLimit({ tier: "api", key: "ip", limit: 30 })
  @ApiOperation({ summary: "Update business hours settings" })
  @ApiResponse({ status: 200, description: "营业时间已更新" })
  async updateBusinessHours(
    @Body() data: Omit<BusinessHoursDto, "updatedAt">,
  ): Promise<{ message: string }> {
    return this.adminSettingsService.updateBusinessHours(data);
  }
}
