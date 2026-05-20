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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminUsersService } from '../services/admin-users.service';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AdminUserDto,
  SendCreateUserCodeDto,
} from '../dto/admin-user.dto';
import { PaginatedResponseDto } from '../../../common/dto/base.dto';
import { SendCodeResponseDto } from '../../auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RateLimit } from '../../rate-limiter/rate-limiter.decorator';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 60 })
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
  })
  async findAll(@Query() query: AdminUsersQueryDto): Promise<PaginatedResponseDto<AdminUserDto>> {
    return this.adminUsersService.findAll(query);
  }

  @Post('send-code')
  @Roles('SUPER_ADMIN')
  @RateLimit({ tier: 'auth', key: 'email', limit: 5 })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send verification code for creating admin user (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Verification code sent' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async sendCode(@Body() dto: SendCreateUserCodeDto): Promise<SendCodeResponseDto> {
    return this.adminUsersService.sendCode(dto);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 20 })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (SUPER_ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateAdminUserDto): Promise<AdminUserDto> {
    return this.adminUsersService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 30 })
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto): Promise<AdminUserDto> {
    return this.adminUsersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 20 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.adminUsersService.remove(id);
  }
}
