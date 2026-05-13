import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from '../src/modules/notifications/notifications.gateway';
import { WsJwtGuard } from '../src/common/guards/ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';

// Mock socket.io Server and Socket
const mockEmit = jest.fn();
const mockServer = {
  to: jest.fn().mockImplementation(() => ({ emit: mockEmit })),
  emit: jest.fn(),
};

const mockSocket = {
  id: 'test-socket-id',
  join: jest.fn(),
  leave: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  handshake: {
    auth: {},
    headers: {},
  },
};

// Mock JwtService
const mockJwtService = {
  verify: jest.fn(),
  decode: jest.fn(),
};

/**
 * FIX-P0-006 GREEN Phase: 验证 WebSocket 网关 JWT 认证已实现
 * 
 * 安全修复已完成：
 * - NotificationsGateway.handleConnection() 现在验证 JWT token
 * - 无 token 或无效 token 的连接会被拒绝并断开
 * - 有效 token 的连接会被接受并追踪 userId
 * - join 消息现在会验证客户端认证状态
 */
describe('FIX-P0-006: WebSocket JWT Authentication (GREEN)', () => {
  let gateway: NotificationsGateway;

  beforeEach(async () => {
    mockEmit.mockClear();
    mockServer.to.mockClear();
    mockServer.to.mockImplementation(() => ({ emit: mockEmit }));
    mockServer.emit.mockClear();
    mockSocket.join.mockClear();
    mockSocket.handshake.auth = {};
    mockSocket.handshake.headers = {};

    // Reset JwtService mock for each test
    mockJwtService.verify.mockReset();
    mockJwtService.decode.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        WsJwtGuard,
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Authentication (GREEN)', () => {
    it('should REJECT connection without auth token', () => {
      /**
       * GREEN 阶段：Gateway 现在拒绝没有 auth token 的连接
       */
      const socketWithoutAuth = { ...mockSocket, id: 'unauth-socket' };
      
      gateway.handleConnection(socketWithoutAuth as any);
      
      // 验证：未认证连接被拒绝（emit error 并 disconnect）
      expect(socketWithoutAuth.emit).toHaveBeenCalledWith('error', 'Authentication required');
      expect(socketWithoutAuth.disconnect).toHaveBeenCalled();
      // 客户端未被添加到 connectedClients
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should REJECT connection with invalid JWT token', () => {
      /**
       * GREEN 阶段：Gateway 现在拒绝无效 token
       */
      const socketWithInvalidToken = {
        ...mockSocket,
        id: 'invalid-token-socket',
        handshake: {
          auth: { token: 'invalid.jwt.token' },
          headers: {},
        },
      };

      // Mock JwtService to throw on invalid token
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      gateway.handleConnection(socketWithInvalidToken as any);
      
      // 验证：无效 token 连接被拒绝
      expect(socketWithInvalidToken.emit).toHaveBeenCalledWith('error', 'Invalid token');
      expect(socketWithInvalidToken.disconnect).toHaveBeenCalled();
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should ACCEPT connection with valid JWT token', () => {
      /**
       * GREEN 阶段：Gateway 现在接受有效 token
       */
      const socketWithValidToken = {
        ...mockSocket,
        id: 'valid-token-socket',
        handshake: {
          auth: { token: 'valid.jwt.token' },
          headers: {},
        },
      };

      // Mock JwtService to return valid payload
      mockJwtService.verify.mockReturnValue({ sub: 'user-123' });

      gateway.handleConnection(socketWithValidToken as any);
      
      // 验证：有效 token 连接成功
      expect(gateway.getConnectedClientsCount()).toBe(1);
      expect(gateway.isUserConnected('user-123')).toBe(true);
    });

    it('should extract userId from JWT token on connection', () => {
      /**
       * GREEN 阶段：Gateway 现在从 JWT token 中提取 userId
       */
      const socketWithToken = {
        ...mockSocket,
        id: 'token-socket',
        handshake: {
          auth: { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.mock' },
          headers: {},
        },
      };

      // Mock JwtService to return decoded token
      mockJwtService.verify.mockReturnValue({ sub: 'user-123' });

      gateway.handleConnection(socketWithToken as any);
      
      // 验证：userId 被正确提取并存储
      expect(gateway.isUserConnected('user-123')).toBe(true);
    });
  });

  describe('Message Auth Guard (GREEN)', () => {
    it('should REJECT "join" message from unauthenticated connection', () => {
      /**
       * GREEN 阶段：未认证连接发送 join 消息会被拒绝
       */
      // Connect without auth (will be rejected, not added to connectedClients)
      gateway.handleConnection(mockSocket as any);
      
      // Try to join admin room without auth
      const result = gateway.handleJoin(
        { room: 'admin:secret-room' },
        mockSocket as any,
      );

      // 验证：未认证用户的 join 被拒绝，返回错误对象
      expect(result).toEqual({ event: 'error', data: { error: 'Authentication required' } });
    });

    it('should only allow joining user-specific rooms for authenticated users', () => {
      /**
       * GREEN 阶段：用户只能加入自己的房间
       */
      const socketWithToken = {
        ...mockSocket,
        id: 'auth-socket',
        handshake: {
          auth: { token: 'valid.jwt.token' },
          headers: {},
        },
      };

      // Mock JwtService to return valid payload
      mockJwtService.verify.mockReturnValue({ sub: 'user-456' });

      // Connect with valid token
      gateway.handleConnection(socketWithToken as any);
      
      // User tries to join another user's room
      const result = gateway.handleJoin(
        { room: 'user:some-other-user' },
        socketWithToken as any,
      );

      // 验证：跨用户房间访问被拒绝
      expect(result).toEqual({ event: 'error', data: { error: 'Access denied' } });
    });
  });
});
