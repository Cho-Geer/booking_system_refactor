import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { AdminUsersService } from "../services/admin-users.service";
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AdminUserDto,
} from "../dto/admin-user.dto";
import { PaginatedResponseDto } from "../../../common/dto/base.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";

@ApiTags("Admin Users")
@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "List all users with pagination and filters" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of users",
  })
  async findAll(
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserDto>> {
    return this.adminUsersService.findAll(query);
  }

  @Post()
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new user (SUPER_ADMIN only)" })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
  })
  @ApiResponse({ status: 403, description: "Forbidden" })
  async create(@Body() dto: CreateAdminUserDto): Promise<AdminUserDto> {
    return this.adminUsersService.create(dto);
  }

  @Put(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update a user" })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserDto,
  ): Promise<AdminUserDto> {
    return this.adminUsersService.update(id, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a user" })
  @ApiResponse({
    status: 204,
    description: "User deleted successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.adminUsersService.remove(id);
  }
}
