import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { AdminServicesService } from "../services/admin-services.service";
import {
  AdminServiceDto,
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  AdminServicesQueryDto,
} from "../dto/admin-service.dto";
import { MetaDto } from "../../../common/dto/base.dto";

@ApiTags("Admin Services")
@Controller("admin/services")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
export class AdminServicesController {
  constructor(
    private readonly adminServicesService: AdminServicesService,
  ) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "List all services (search, filter by active)" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of services",
  })
  async findAll(
    @Query() query: AdminServicesQueryDto,
  ): Promise<{ items: AdminServiceDto[]; meta: MetaDto }> {
    return this.adminServicesService.findAll(query);
  }

  @Get("summary")
  @Roles("ADMIN", "SUPER_ADMIN")
  @RateLimit({ tier: "api", key: "ip", limit: 60 })
  @ApiOperation({ summary: "Get services summary statistics" })
  @ApiResponse({
    status: 200,
    description: "Services summary statistics",
  })
  async getSummary() {
    return this.adminServicesService.getSummary();
  }

  @Get(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get service by ID" })
  @ApiResponse({ status: 200, description: "Service found" })
  @ApiResponse({ status: 404, description: "Service not found" })
  async findOne(@Param("id") id: string): Promise<AdminServiceDto> {
    return this.adminServicesService.findOne(id);
  }

  @Post()
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new service" })
  @ApiResponse({ status: 201, description: "Service created" })
  async create(
    @Body() createDto: CreateAdminServiceDto,
  ): Promise<AdminServiceDto> {
    return this.adminServicesService.create(createDto);
  }

  @Put(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update a service" })
  @ApiResponse({ status: 200, description: "Service updated" })
  @ApiResponse({ status: 404, description: "Service not found" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAdminServiceDto,
  ): Promise<AdminServiceDto> {
    return this.adminServicesService.update(id, updateDto);
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a service (SUPER_ADMIN only)" })
  @ApiResponse({ status: 204, description: "Service deleted (no content)" })
  @ApiResponse({ status: 404, description: "Service not found" })
  async remove(@Param("id") id: string): Promise<void> {
    return this.adminServicesService.remove(id);
  }
}
