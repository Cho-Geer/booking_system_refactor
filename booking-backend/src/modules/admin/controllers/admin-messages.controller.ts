import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminMessagesService } from '../services/admin-messages.service';
import { MessageListResponseDto, MessageUnreadCountDto } from '../dto/admin-messages.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RateLimit } from '../../rate-limiter/rate-limiter.decorator';

@ApiTags('Admin Messages')
@Controller('admin/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminMessagesController {
  constructor(private readonly adminMessagesService: AdminMessagesService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip' })
  @ApiOperation({ summary: 'Get paginated admin messages (MSG-001)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageListResponseDto> {
    const userId = (req.user as any).id;
    return this.adminMessagesService.findAll(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('unread-count')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RateLimit({ tier: 'api', key: 'ip' })
  @ApiOperation({ summary: 'Get unread message count for badge (MSG-004)' })
  async getUnreadCount(@Req() req: Request): Promise<MessageUnreadCountDto> {
    const userId = (req.user as any).id;
    return this.adminMessagesService.findUnreadCount(userId);
  }
}
