import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Request } from "express";
import { AdminNotificationsService } from "../services/admin-notifications.service";
import {
  NotificationListDto,
  UnreadCountDto,
  NotificationItemDto,
} from "../dto/admin-notifications.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";

@ApiTags("Admin Notifications")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  @Get("notifications")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get paginated notification list (SYS-002)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({
    name: "unread_only",
    required: false,
    type: Boolean,
    description: "Filter to only unread notifications",
  })
  async findAll(
    @Req() req: Request,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("unread_only") unreadOnly?: string,
  ): Promise<NotificationListDto> {
    const userId = (req.user as any).id;
    return this.adminNotificationsService.findAll(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      unreadOnly === "true",
    );
  }

  @Post("notifications/:id/read")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Mark a notification as read (SYS-003)" })
  async markAsRead(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ statusCode: number; message: string }> {
    const userId = (req.user as any).id;
    await this.adminNotificationsService.markAsRead(id, userId);
    return { statusCode: 200, message: "Notification marked as read" };
  }

  @Get("messages/unread-count")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get unread notification count for bell badge (MSG-004)" })
  async getUnreadCount(
    @Req() req: Request,
  ): Promise<UnreadCountDto> {
    const userId = (req.user as any).id;
    return this.adminNotificationsService.getUnreadCount(userId);
  }
}
