import { Test, TestingModule } from "@nestjs/testing";
import { AdminNotificationsService } from "./admin-notifications.service";
import { PrismaService } from "../../../common/database/prisma.service";

describe("AdminNotificationsService", () => {
  let service: AdminNotificationsService;
  let prisma: any;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockNotifications = [
    {
      id: "notif-1",
      userId: "user-1",
      type: "SYSTEM",
      title: "Test Notification",
      content: "This is a test notification body",
      isRead: false,
      createdAt: new Date("2026-05-08T10:00:00.000Z"),
    },
    {
      id: "notif-2",
      userId: "user-1",
      type: "EMAIL",
      title: "Read Notification",
      content: "This notification is already read",
      isRead: true,
      createdAt: new Date("2026-05-07T10:00:00.000Z"),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminNotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminNotificationsService>(AdminNotificationsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated notifications with correct mapping", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications,
      );
      mockPrismaService.notification.count.mockResolvedValue(2);

      const result = await service.findAll("user-1", 1, 20, false);

      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("notif-1");
      expect(result.items[0].type).toBe("info");
      expect(result.items[0].title).toBe("Test Notification");
      expect(result.items[0].body).toBe("This is a test notification body");
      expect(result.items[0].read).toBe(false);
      expect(result.items[0].created_at).toBe("2026-05-08T10:00:00.000Z");
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by unread_only when true", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([
        mockNotifications[0],
      ]);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.findAll("user-1", 1, 10, true);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("notif-1");
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      });
    });

    it("should handle empty results", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.findAll("user-2", 1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it("should respect pagination skip value", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(50);

      await service.findAll("user-1", 3, 10);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 10,
      });
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read for the correct user", async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.markAsRead("notif-1", "user-1");

      expect(
        mockPrismaService.notification.updateMany,
      ).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
        data: { isRead: true },
      });
    });

    it("should succeed even if notification does not exist", async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.markAsRead("nonexistent", "user-1"),
      ).resolves.not.toThrow();
    });
  });

  describe("getUnreadCount", () => {
    it("should return the count of unread notifications", async () => {
      mockPrismaService.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount("user-1");

      expect(result.count).toBe(3);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
      });
    });

    it("should return 0 when no unread notifications exist", async () => {
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount("user-1");

      expect(result.count).toBe(0);
    });
  });
});
