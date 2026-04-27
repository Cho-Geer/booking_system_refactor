import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { NotificationsGateway, NotificationPayload } from './notifications.gateway';
import { NotificationService } from './notification.service';

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
  handshake: {
    auth: { token: 'valid-token' },
    headers: {},
  },
};

// Mock JWT token
const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MTYyMzkwMjJ9.mock';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: JwtService;
  let wsJwtGuard: WsJwtGuard;

  beforeEach(async () => {
    // Reset mocks before each test
    mockEmit.mockClear();
    mockServer.to.mockClear();
    mockServer.to.mockImplementation(() => ({ emit: mockEmit }));
    mockServer.emit.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ sub: 'test-user', id: 'test-user' }),
          },
        },
        WsJwtGuard,
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get<JwtService>(JwtService);
    wsJwtGuard = module.get<WsJwtGuard>(WsJwtGuard);
    
    // Replace the server with our mock
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    /**
     * GREEN-PHASE TEST: Architecture separation
     * The gateway must use WsJwtGuard.validateToken() for WebSocket authentication
     * instead of calling jwtService.verify() directly.
     * 
     * In the GREEN implementation, JwtService is NOT injected into the gateway;
     * instead WsJwtGuard is injected. The gateway delegates authentication
     * to WsJwtGuard.validateToken(), which internally uses JwtService.
     * 
     * This test verifies:
     * 1. WsJwtGuard.validateToken() IS called during handleConnection
     * 2. The gateway does NOT expose jwtService as a constructor dependency
     */
    it('should delegate authentication to WsJwtGuard.validateToken instead of direct jwtService.verify', async () => {
      const validateTokenSpy = jest.spyOn(wsJwtGuard, 'validateToken');
      
      await gateway.handleConnection(mockSocket as any);
      
      // The gateway should delegate to WsJwtGuard.validateToken()
      expect(validateTokenSpy).toHaveBeenCalled();
      // WsJwtGuard.validateToken internally calls jwtService.verify, so
      // jwtService.verify WILL be called - but as an implementation detail of WsJwtGuard
      // The key point is that the gateway doesn't have JwtService in its constructor
    });

    /**
     * ARCHITECTURE TEST: Verify gateway does not directly depend on JwtService
     * The gateway constructor should inject WsJwtGuard, not JwtService.
     */
    it('should inject WsJwtGuard instead of JwtService in constructor', () => {
      // The gateway should have wsJwtGuard property (from constructor injection)
      expect((gateway as any).wsJwtGuard).toBeDefined();
      // The gateway should NOT have jwtService as a direct dependency
      expect((gateway as any).jwtService).toBeUndefined();
    });

    /**
     * VERIFICATION TEST: Token extract + validate flow works end-to-end
     */
    it('should extract token via WsJwtGuard.extractToken and pass to validateToken', async () => {
      const extractTokenSpy = jest.spyOn(WsJwtGuard, 'extractToken');
      const validateTokenSpy = jest.spyOn(wsJwtGuard, 'validateToken').mockResolvedValue({ userId: 'test-user' });
      
      await gateway.handleConnection(mockSocket as any);
      
      // Token should be extracted first
      expect(extractTokenSpy).toHaveBeenCalledWith(mockSocket);
      // Then validated via WsJwtGuard
      expect(validateTokenSpy).toHaveBeenCalled();
      // Client should be tracked
      expect(gateway.getConnectedClientsCount()).toBe(1);
    });

    it('should track connected clients with valid token', async () => {
      await gateway.handleConnection(mockSocket as any);
      expect(gateway.getConnectedClientsCount()).toBe(1);
    });

    it('should log connection with userId', async () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      await gateway.handleConnection(mockSocket as any);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Client connected'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('userId: test-user'));
    });

    it('should log total connected clients count', async () => {
      const debugSpy = jest.spyOn((gateway as any).logger, 'debug');
      await gateway.handleConnection(mockSocket as any);
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Total connected clients'));
    });

    it('should reject connection without token', () => {
      const socketWithoutToken = {
        ...mockSocket,
        id: 'no-token-socket',
        handshake: { auth: {}, headers: {} },
      };
      const disconnectSpy = jest.fn();
      (socketWithoutToken as any).disconnect = disconnectSpy;

      gateway.handleConnection(socketWithoutToken as any);
      
      expect(disconnectSpy).toHaveBeenCalled();
      expect((socketWithoutToken as any).emit).toHaveBeenCalledWith('error', 'Authentication required');
    });

    it('should reject connection with invalid token', async () => {
      // Mock WsJwtGuard.validateToken to throw (simulating invalid token)
      jest.spyOn(wsJwtGuard, 'validateToken').mockRejectedValueOnce(new Error('Invalid token'));

      const socketWithInvalidToken = {
        ...mockSocket,
        id: 'invalid-token-socket',
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
      };
      const disconnectSpy = jest.fn();
      (socketWithInvalidToken as any).disconnect = disconnectSpy;

      await gateway.handleConnection(socketWithInvalidToken as any);
      
      expect(disconnectSpy).toHaveBeenCalled();
      expect((socketWithInvalidToken as any).emit).toHaveBeenCalledWith('error', 'Invalid token');
    });

    it('should track multiple clients', async () => {
      const socket1 = { ...mockSocket, id: 'socket-1' };
      const socket2 = { ...mockSocket, id: 'socket-2' };
      const socket3 = { ...mockSocket, id: 'socket-3' };

      await gateway.handleConnection(socket1 as any);
      await gateway.handleConnection(socket2 as any);
      await gateway.handleConnection(socket3 as any);

      expect(gateway.getConnectedClientsCount()).toBe(3);
    });

    it('should overwrite tracking for same socket id', async () => {
      await gateway.handleConnection(mockSocket as any);
      await gateway.handleConnection(mockSocket as any);

      expect(gateway.getConnectedClientsCount()).toBe(1);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client tracking', async () => {
      await gateway.handleConnection(mockSocket as any);
      expect(gateway.getConnectedClientsCount()).toBe(1);

      gateway.handleDisconnect(mockSocket as any);
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should log disconnection', async () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      await gateway.handleConnection(mockSocket as any);
      gateway.handleDisconnect(mockSocket as any);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Client disconnected'));
    });

    it('should log userId when available on disconnect', async () => {
      await gateway.handleConnection(mockSocket as any);

      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.handleDisconnect(mockSocket as any);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('userId: test-user'));
    });

    it('should not throw when disconnecting unknown client', () => {
      const unknownSocket = { id: 'unknown-socket' };
      expect(() => gateway.handleDisconnect(unknownSocket as any)).not.toThrow();
    });

    it('should log total connected clients after disconnect', async () => {
      const debugSpy = jest.spyOn((gateway as any).logger, 'debug');
      await gateway.handleConnection(mockSocket as any);
      gateway.handleDisconnect(mockSocket as any);

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Total connected clients'));
    });
  });

  describe('handleJoin', () => {
    it('should make authenticated client join their own room', async () => {
      await gateway.handleConnection(mockSocket as any);
      const data = { room: 'user:test-user' };
      const result = gateway.handleJoin(data, mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('user:test-user');
      expect(result).toEqual({
        event: 'joined',
        data: { room: 'user:test-user', status: 'success' },
      });
    });

    it('should reject unauthenticated client from joining room', () => {
      const unauthenticatedSocket = {
        ...mockSocket,
        id: 'unauth-socket',
        handshake: { auth: {}, headers: {} },
      };
      // Don't call handleConnection - leave unauthenticated
      (gateway as any).connectedClients.set('unauth-socket', { socket: unauthenticatedSocket });
      
      const data = { room: 'user:test-user' };
      const result = gateway.handleJoin(data, unauthenticatedSocket as any);

      expect(result).toEqual({
        event: 'error',
        data: { error: 'Authentication required' },
      });
    });

    it('should reject client from joining unauthorized room', async () => {
      await gateway.handleConnection(mockSocket as any);
      const data = { room: 'user:other-user' };
      const result = gateway.handleJoin(data, mockSocket as any);

      expect(result).toEqual({
        event: 'error',
        data: { error: 'Access denied' },
      });
    });

    it('should allow joining broadcast room', async () => {
      await gateway.handleConnection(mockSocket as any);
      const data = { room: 'broadcast:announcements' };
      const result = gateway.handleJoin(data, mockSocket as any);

      expect(result).toEqual({
        event: 'joined',
        data: { room: 'broadcast:announcements', status: 'success' },
      });
    });

    it('should log room join with userId', async () => {
      await gateway.handleConnection(mockSocket as any);
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      const data = { room: 'user:test-user' };
      gateway.handleJoin(data, mockSocket as any);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('joined room'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('userId: test-user'));
    });
  });

  describe('handleLeave', () => {
    it('should make client leave the room', () => {
      const data = { room: 'user:test-user' };
      const result = gateway.handleLeave(data, mockSocket as any);

      expect(mockSocket.leave).toHaveBeenCalledWith('user:test-user');
      expect(result).toEqual({
        event: 'left',
        data: { room: 'user:test-user', status: 'success' },
      });
    });

    it('should log room leave', () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      const data = { room: 'user:test-user' };
      gateway.handleLeave(data, mockSocket as any);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('left room'));
    });
  });

  describe('sendAppointmentUpdate', () => {
    it('should emit appointment_updated event to user room', () => {
      const userId = 'test-user';
      const data = { appointmentId: '123', status: 'CONFIRMED' };

      gateway.sendAppointmentUpdate(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockEmit).toHaveBeenCalledWith(
        'appointment_updated',
        expect.objectContaining({
          event: 'appointment_updated',
          data: expect.objectContaining(data),
        }),
      );
    });

    it('should include timestamp in payload', () => {
      const userId = 'test-user';
      const data = { appointmentId: '123' };

      gateway.sendAppointmentUpdate(userId, data);

      const callArgs = mockEmit.mock.calls[0];
      const payload = callArgs[1] as NotificationPayload;
      expect(payload.timestamp).toBeDefined();
      expect(typeof payload.timestamp).toBe('string');
    });

    it('should log the emit action', () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.sendAppointmentUpdate('user-1', { appointmentId: '123' });

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Emitting appointment_updated'));
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should emit booking_confirmed event to user room', () => {
      const userId = 'test-user';
      const data = { appointmentId: '123', serviceName: 'Haircut' };

      gateway.sendBookingConfirmation(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockEmit).toHaveBeenCalledWith(
        'booking_confirmed',
        expect.objectContaining({
          event: 'booking_confirmed',
          data: expect.objectContaining(data),
        }),
      );
    });

    it('should include timestamp in payload', () => {
      const userId = 'test-user';
      const data = { appointmentId: '123' };

      gateway.sendBookingConfirmation(userId, data);

      const callArgs = mockEmit.mock.calls[0];
      const payload = callArgs[1] as NotificationPayload;
      expect(payload.timestamp).toBeDefined();
    });

    it('should log the emit action', () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.sendBookingConfirmation('user-1', { appointmentId: '123' });

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Emitting booking_confirmed'));
    });
  });

  describe('sendCancellation', () => {
    it('should emit booking_cancelled event to user room', () => {
      const userId = 'test-user';
      const data = { appointmentId: '123', cancelReason: 'User requested' };

      gateway.sendCancellation(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockEmit).toHaveBeenCalledWith(
        'booking_cancelled',
        expect.objectContaining({
          event: 'booking_cancelled',
          data: expect.objectContaining(data),
        }),
      );
    });

    it('should include timestamp in payload', () => {
      const userId = 'test-user';
      const data = { appointmentId: '123' };

      gateway.sendCancellation(userId, data);

      const callArgs = mockEmit.mock.calls[0];
      const payload = callArgs[1] as NotificationPayload;
      expect(payload.timestamp).toBeDefined();
    });

    it('should log the emit action', () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.sendCancellation('user-1', { appointmentId: '123' });

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Emitting booking_cancelled'));
    });
  });

  describe('sendBroadcast', () => {
    it('should emit event to all connected clients', () => {
      const event = 'system_maintenance';
      const data = { message: 'System will be down for maintenance' };

      gateway.sendBroadcast(event, data);

      expect(mockServer.emit).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          event,
          data: expect.objectContaining(data),
        }),
      );
    });

    it('should include timestamp in payload', () => {
      gateway.sendBroadcast('test_event', { key: 'value' });

      const callArgs = mockServer.emit.mock.calls[0];
      const payload = callArgs[1] as NotificationPayload;
      expect(payload.timestamp).toBeDefined();
      expect(typeof payload.timestamp).toBe('string');
    });

    it('should log the broadcast action', () => {
      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');
      gateway.sendBroadcast('test_event', {});

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Broadcasting event'));
    });

    it('should emit with empty data', () => {
      gateway.sendBroadcast('empty_event', {});

      expect(mockServer.emit).toHaveBeenCalledWith(
        'empty_event',
        expect.objectContaining({
          event: 'empty_event',
          data: {},
        }),
      );
    });
  });

  describe('isUserConnected', () => {
    it('should return true when user is connected', async () => {
      await gateway.handleConnection(mockSocket as any);

      expect(gateway.isUserConnected('test-user')).toBe(true);
    });

    it('should return false when user is not connected', () => {
      expect(gateway.isUserConnected('non-existent-user')).toBe(false);
    });

    it('should return false after user disconnects', async () => {
      await gateway.handleConnection(mockSocket as any);
      gateway.handleDisconnect(mockSocket as any);

      expect(gateway.isUserConnected('test-user')).toBe(false);
    });

    it('should return true for any connected user', async () => {
      const socket1 = { ...mockSocket, id: 'socket-1' };
      const socket2 = { ...mockSocket, id: 'socket-2' };

      await gateway.handleConnection(socket1 as any);
      await gateway.handleConnection(socket2 as any);

      expect(gateway.isUserConnected('test-user')).toBe(true);
    });

    it('should return false for connected client without userId', async () => {
      // This case should not happen with new auth flow, but test for safety
      await gateway.handleConnection(mockSocket as any);
      // Manually remove userId (simulating edge case)
      const clientData = (gateway as any).connectedClients.get('test-socket-id');
      if (clientData) {
        clientData.userId = undefined;
      }

      expect(gateway.isUserConnected('any-user')).toBe(false);
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return 0 initially', () => {
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should increment on connection', async () => {
      await gateway.handleConnection(mockSocket as any);
      expect(gateway.getConnectedClientsCount()).toBe(1);
    });

    it('should decrement on disconnection', async () => {
      await gateway.handleConnection(mockSocket as any);
      gateway.handleDisconnect(mockSocket as any);
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should handle multiple connections and disconnections', async () => {
      const socket1 = { ...mockSocket, id: 'socket-1' };
      const socket2 = { ...mockSocket, id: 'socket-2' };
      const socket3 = { ...mockSocket, id: 'socket-3' };

      await gateway.handleConnection(socket1 as any);
      await gateway.handleConnection(socket2 as any);
      await gateway.handleConnection(socket3 as any);
      expect(gateway.getConnectedClientsCount()).toBe(3);

      gateway.handleDisconnect(socket2 as any);
      expect(gateway.getConnectedClientsCount()).toBe(2);

      gateway.handleDisconnect(socket1 as any);
      expect(gateway.getConnectedClientsCount()).toBe(1);

      gateway.handleDisconnect(socket3 as any);
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });
  });
});
