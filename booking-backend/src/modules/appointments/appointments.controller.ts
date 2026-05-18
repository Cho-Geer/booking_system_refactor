import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole, AppointmentStatus } from '@prisma/client';
import { RateLimit } from '../rate-limiter/rate-limiter.decorator';
import { CacheService } from '../cache/cache.service';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly cacheService: CacheService,
  ) {}

  @Post()
  @Roles(SystemRole.CUSTOMER)
  @RateLimit({ tier: 'api', key: 'ip', limit: 30 })
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  @ApiResponse({ status: 409, description: 'Time slot not available' })
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const userId = (req.user as { id?: string } | undefined)?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const cacheKey = `idempotent:apt:${idempotencyKey}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await this.appointmentsService.create(createAppointmentDto, userId);
    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }

  @Get()
  @RateLimit({ tier: 'api', key: 'user' })
  @Roles(SystemRole.CUSTOMER)
  @ApiOperation({ summary: 'Get all appointments' })
  @ApiResponse({ status: 200, description: 'List of appointments' })
  async findAll(
    @Query('page', OptionalParseIntPipe) page: number = 1,
    @Query('limit', OptionalParseIntPipe) limit: number = 20,
    @Query('status') status?: AppointmentStatus,
    @Query('userId') userId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.appointmentsService.findAll(page, limit, status, userId, startDate, endDate);
  }

  @Get('my')
  @Roles(SystemRole.CUSTOMER)
  @RateLimit({ tier: 'api', key: 'user' })
  @ApiOperation({ summary: 'Get my appointments' })
  @ApiResponse({ status: 200, description: 'List of user appointments' })
  async getMyAppointments(
    @Req() req: Request,
    @Query('page', OptionalParseIntPipe) page: number = 1,
    @Query('limit', OptionalParseIntPipe) limit: number = 20,
  ) {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.appointmentsService.findAll(page, limit, undefined, userId);
  }

  @Get(':id')
  @Roles(SystemRole.CUSTOMER)
  @RateLimit({ tier: 'api', key: 'user' })
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiResponse({ status: 200, description: 'Appointment found' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(SystemRole.CUSTOMER)
  @RateLimit({ tier: 'strict', key: 'user' })
  @ApiOperation({ summary: 'Update appointment' })
  @ApiResponse({ status: 200, description: 'Appointment updated' })
  async update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Post(':id/cancel')
  @Roles(SystemRole.CUSTOMER)
  @RateLimit({ tier: 'strict', key: 'user' })
  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled' })
  async cancel(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.appointmentsService.cancel(id, body.reason);
  }

  @Delete(':id')
  @RateLimit({ tier: 'strict', key: 'user' })
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete appointment' })
  @ApiResponse({ status: 200, description: 'Appointment deleted' })
  async remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
