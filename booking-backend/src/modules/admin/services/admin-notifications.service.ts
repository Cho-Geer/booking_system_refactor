import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/database/prisma.service";
import {
  NotificationItemDto,
  NotificationListDto,
  UnreadCountDto,
} from "../dto/admin-notifications.dto";

const PRISMA_TYPE_TO_DISPLAY: Record<string, string> = {
  SMS: "info",
  EMAIL: "info",
  WECHAT: "info",
  PUSH: "info",
  SYSTEM: "info",
};

function mapNotification(item: any): NotificationItemDto {
  return {
    id: item.id,
    type: PRISMA_TYPE_TO_DISPLAY[item.type] ?? "info",
    title: item.title,
    body: item.content,
    read: item.isRead,
    created_at: item.createdAt instanceof Date
      ? item.createdAt.toISOString()
      : String(item.createdAt),
  };
}

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<NotificationListDto> {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      items: items.map(mapNotification),
      meta: { total, page, limit, totalPages, hasNext, hasPrev },
    };
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<UnreadCountDto> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
