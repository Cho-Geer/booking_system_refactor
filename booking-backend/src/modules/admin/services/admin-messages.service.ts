import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  MessageItemDto,
  MessageListResponseDto,
  MessageUnreadCountDto,
} from '../dto/admin-messages.dto';

function mapMessage(item: any): MessageItemDto {
  return {
    id: item.id,
    sender: item.sender?.name ?? '',
    subject: item.subject,
    body: item.body,
    read: item.readAt !== null,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : String(item.createdAt),
  };
}

@Injectable()
export class AdminMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<MessageListResponseDto> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { sender: { select: { name: true } } },
      }),
      this.prisma.message.count({
        where: { recipientId: userId },
      }),
    ]);

    return {
      items: items.map(mapMessage),
      total,
      page,
      limit,
    };
  }

  async findUnreadCount(userId: string): Promise<MessageUnreadCountDto> {
    const count = await this.prisma.message.count({
      where: { recipientId: userId, readAt: null },
    });
    return { count };
  }
}
