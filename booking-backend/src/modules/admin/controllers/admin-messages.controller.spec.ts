import { Test, TestingModule } from '@nestjs/testing';
import { AdminMessagesController } from './admin-messages.controller';
import { AdminMessagesService } from '../services/admin-messages.service';

describe('AdminMessagesController', () => {
  let controller: AdminMessagesController;

  const mockService = {
    findAll: jest.fn(),
    findUnreadCount: jest.fn(),
  };

  const mockReq = (userId = 'admin-1') => ({ user: { id: userId } }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMessagesController],
      providers: [{ provide: AdminMessagesService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminMessagesController>(AdminMessagesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (GET /admin/messages — MSG-001)', () => {
    it('should return paginated messages with default params', async () => {
      const expected = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockReq());

      expect(result).toEqual(expected);
      expect(mockService.findAll).toHaveBeenCalledWith('admin-1', 1, 20);
    });

    it('should pass custom query params to service', async () => {
      mockService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      await controller.findAll(mockReq(), '2', '10');

      expect(mockService.findAll).toHaveBeenCalledWith('admin-1', 2, 10);
    });

    it('should use default values when query params are omitted', async () => {
      mockService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll(mockReq());

      expect(mockService.findAll).toHaveBeenCalledWith('admin-1', 1, 20);
    });
  });

  describe('getUnreadCount (GET /admin/messages/unread-count — MSG-004)', () => {
    it('should return unread count for the authenticated user', async () => {
      const expected = { count: 5 };
      mockService.findUnreadCount.mockResolvedValue(expected);

      const result = await controller.getUnreadCount(mockReq());

      expect(result).toEqual({ count: 5 });
      expect(mockService.findUnreadCount).toHaveBeenCalledWith('admin-1');
    });

    it('should return zero count when there are no unread messages', async () => {
      mockService.findUnreadCount.mockResolvedValue({ count: 0 });

      const result = await controller.getUnreadCount(mockReq('admin-2'));

      expect(result.count).toBe(0);
      expect(mockService.findUnreadCount).toHaveBeenCalledWith('admin-2');
    });
  });
});
