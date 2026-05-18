import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { RateLimit } from '../rate-limiter/rate-limiter.decorator';

@ApiTags('Services')
@Controller('services')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@RateLimit({ tier: 'public', key: 'ip' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created' })
  async create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all services with pagination' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async findAll(
    @Query('page', OptionalParseIntPipe) page: number = 1,
    @Query('limit', OptionalParseIntPipe) limit: number = 20,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.servicesService.findAll(page, limit, isActive);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID (convenience endpoint, not explicitly in contract)' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete service' })
  @ApiResponse({ status: 200, description: 'Service deleted' })
  async remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
