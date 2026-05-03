import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AdminStatsService } from "../services/admin-stats.service";
import { AdminStatsDto } from "../dto/admin-stats.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";

@ApiTags("Admin Stats")
@Controller("admin/stats")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get admin dashboard stats" })
  async getStats(): Promise<AdminStatsDto> {
    return this.adminStatsService.getDashboard();
  }
}
