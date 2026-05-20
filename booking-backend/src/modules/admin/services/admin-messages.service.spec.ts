import { Test, TestingModule } from '@nestjs/testing';
import { AdminMessagesService } from './admin-messages.service';
import { PrismaService } from '../../../common/database/prisma.service';

describe('AdminMessagesService', () => {
  let service: AdminMessagesService;

  const mockPrismaService = {
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockMessages = [
    {
      id: 'msg-1',
      senderId: 'sender-1',
      recipientId: 'user-1',
      subject: '系统维护通知',
      body: '系统将于 5月5日 02:00 进行例行维护。',
      readAt: null,
      createdAt: new Date('2026-05-04T08:00:00.000Z'),
      sender: { name: 'System Admin' },
    },
    {
      id: 'msg-2',
      senderId: 'sender-2',
      recipientId: 'user-1',
      subject: '请假申请',
      body: '申请 5月10日 请假一天。',
      readAt: new Date('2026-05-03T14:30:00.000Z'),
      createdAt: new Date('2026-05-03T14:30:00.000Z'),
      sender: { name: 'Zhang Wei' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMessagesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminMessagesService>(AdminMessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated messages with sender name resolved', async () => {
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);
      mockPrismaService.message.count.mockResolvedValue(2);

      const result = await service.findAll('user-1', 1, 20);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('msg-1');
      expect(result.items[0].sender).toBe('System Admin');
      expect(result.items[0].subject).toBe('系统维护通知');
      expect(result.items[0].body).toBe('系统将于 5月5日 02:00 进行例行维护。');
      expect(result.items[0].read).toBe(false);
      expect(result.items[0].createdAt).toBe('2026-05-04T08:00:00.000Z');
      expect(result.items[1].id).toBe('msg-2');
      expect(result.items[1].sender).toBe('Zhang Wei');
      expect(result.items[1].read).toBe(true);

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: { sender: { select: { name: true } } },
      });
    });

    it('should customize page and limit params', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.message.count.mockResolvedValue(50);

      await service.findAll('user-1', 3, 10);

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 20,
        take: 10,
        include: { sender: { select: { name: true } } },
      });
      expect(mockPrismaService.message.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1' },
      });
    });

    it('should handle empty results', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await service.findAll('user-2', 1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should respect pagination skip value for non-first pages', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.message.count.mockResolvedValue(100);

      await service.findAll('user-1', 5, 10);

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 40,
        take: 10,
        include: { sender: { select: { name: true } } },
      });
    });
  });

  describe('findUnreadCount', () => {
    it('should return the count of unread messages for the user', async () => {
      mockPrismaService.message.count.mockResolvedValue(3);

      const result = await service.findUnreadCount('user-1');

      expect(result.count).toBe(3);
      expect(mockPrismaService.message.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
      });
    });

    it('should return 0 when no unread messages exist', async () => {
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await service.findUnreadCount('user-1');

      expect(result.count).toBe(0);
    });
  });
});
