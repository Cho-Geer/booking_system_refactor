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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RateLimit } from '../../rate-limiter/rate-limiter.decorator';
import { AdminServicesService } from '../services/admin-services.service';
import {
  AdminServiceDto,
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  AdminServicesQueryDto,
} from '../dto/admin-service.dto';
import { MetaDto } from '../../../common/dto/base.dto';

@ApiTags('Admin Services')
@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 60 })
  @ApiOperation({ summary: 'List all services (search, filter by active)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of services',
  })
  async findAll(
    @Query() query: AdminServicesQueryDto,
  ): Promise<{ items: AdminServiceDto[]; meta: MetaDto }> {
    return this.adminServicesService.findAll(query);
  }

  @Get('summary')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 60 })
  @ApiOperation({ summary: 'Get services summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Services summary statistics',
  })
  async getSummary() {
    return this.adminServicesService.getSummary();
  }

  @Get(':id/affected-appointments')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get affected appointment counts when disabling a service' })
  @ApiResponse({ status: 200, description: 'Affected appointment counts' })
  async getAffectedAppointments(@Param('id') id: string) {
    return this.adminServicesService.getAffectedAppointments(id);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id') id: string): Promise<AdminServiceDto> {
    return this.adminServicesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 20 })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created' })
  async create(@Body() createDto: CreateAdminServiceDto): Promise<AdminServiceDto> {
    return this.adminServicesService.create(createDto);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 30 })
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAdminServiceDto,
  ): Promise<AdminServiceDto> {
    return this.adminServicesService.update(id, updateDto);
  }

  @Post(':id/image')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip' })
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload service image' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ): Promise<{ image_url: string }> {
    return this.adminServicesService.uploadImage(id, file);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip', limit: 20 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable a service (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Service disabled' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.adminServicesService.remove(id);
  }
}
