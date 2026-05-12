import { Test, TestingModule } from "@nestjs/testing";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { AdminNotificationsService } from "../services/admin-notifications.service";
import { NotificationListDto, UnreadCountDto } from "../dto/admin-notifications.dto";

describe("AdminNotificationsController", () => {
  let controller: AdminNotificationsController;
  let service: AdminNotificationsService;

  const mockService = {
    findAll: jest.fn(),
    markAsRead: jest.fn(),
    getUnreadCount: jest.fn(),
  };

  const mockReq = (userId = "admin-1") =>
    ({ user: { id: userId } } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminNotificationsController],
      providers: [
        { provide: AdminNotificationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AdminNotificationsController>(
      AdminNotificationsController,
    );
    service = module.get<AdminNotificationsService>(
      AdminNotificationsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll (GET /admin/notifications)", () => {
    it("should return paginated notifications with default params", async () => {
      const expected: NotificationListDto = {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false },
      };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockReq());

      expect(result).toEqual(expected);
      expect(mockService.findAll).toHaveBeenCalledWith("admin-1", 1, 20, false);
    });

    it("should pass query params to service", async () => {
      mockService.findAll.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });

      await controller.findAll(mockReq(), "2", "10", "true");

      expect(mockService.findAll).toHaveBeenCalledWith("admin-1", 2, 10, true);
    });

    it("should handle unread_only filter", async () => {
      mockService.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

      await controller.findAll(mockReq(), "1", "20", "true");

      expect(mockService.findAll).toHaveBeenCalledWith("admin-1", 1, 20, true);
    });
  });

  describe("markAsRead (POST /admin/notifications/:id/read)", () => {
    it("should mark notification as read", async () => {
      mockService.markAsRead.mockResolvedValue(undefined);

      const result = await controller.markAsRead(mockReq(), "notif-1");

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe("Notification marked as read");
      expect(mockService.markAsRead).toHaveBeenCalledWith("notif-1", "admin-1");
    });
  });

  describe("getUnreadCount (GET /admin/messages/unread-count)", () => {
    it("should return unread count", async () => {
      const expected: UnreadCountDto = { count: 5 };
      mockService.getUnreadCount.mockResolvedValue(expected);

      const result = await controller.getUnreadCount(mockReq());

      expect(result.count).toBe(5);
      expect(mockService.getUnreadCount).toHaveBeenCalledWith("admin-1");
    });
  });
});
