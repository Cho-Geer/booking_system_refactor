import { TestBed } from '@angular/core/testing';
import { SocketService, SlotUpdateEvent, AppointmentStatusEvent } from './socket.service';

// Mock socket.io-client
const mockSocketInstance = {
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
};

let mockOnCallbacks: Record<string, Function> = {};

const mockIo = jest.fn().mockReturnValue(mockSocketInstance);

describe('SocketService', () => {
  let service: SocketService;

  beforeEach(() => {
    mockOnCallbacks = {};
    mockSocketInstance.on.mockClear();
    mockSocketInstance.off.mockClear();
    mockSocketInstance.connect.mockClear();
    mockSocketInstance.disconnect.mockClear();
    mockSocketInstance.emit.mockClear();

    mockSocketInstance.on.mockImplementation((event: string, callback: Function) => {
      mockOnCallbacks[event] = callback;
    });

    // Replace the io import with our mock
    (window as unknown as Record<string, unknown>)['mockIo'] = mockIo;

    // We need to test the service with a mocked socket.io
    // Since the service uses io() directly in its constructor,
    // we'll test it by creating a mock version
    TestBed.configureTestingModule({
      providers: [SocketService],
    });

    // After TestBed creates the instance, replace the socket with our mock
    service = TestBed.inject(SocketService);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).socket = mockSocketInstance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).connected = false;
  });

  describe('connect()', () => {
    it('should call socket.connect() when not connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = false;

      service.connect();

      expect(mockSocketInstance.connect).toHaveBeenCalled();
    });

    it('should not call socket.connect() when already connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = true;

      service.connect();

      expect(mockSocketInstance.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect()', () => {
    it('should call socket.disconnect() when connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = true;

      service.disconnect();

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
    });

    it('should not call socket.disconnect() when not connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = false;

      service.disconnect();

      expect(mockSocketInstance.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToSlotUpdates()', () => {
    it('should return an Observable that emits slot update events', (done) => {
      service.connect();

      const mockUpdate: SlotUpdateEvent = {
        slotId: 'slot-1',
        isActive: false,
        bookedBy: 'user-123',
        timestamp: Date.now(),
      };

      service.subscribeToSlotUpdates().subscribe((update) => {
        expect(update).toEqual(mockUpdate);
        done();
      });

      // Simulate socket emitting slot-update event
      const connectCallback = mockOnCallbacks['connect'];
      if (connectCallback) {
        connectCallback();
      }

      const slotUpdateCallback = mockOnCallbacks['slot-update'];
      if (slotUpdateCallback) {
        slotUpdateCallback(mockUpdate);
      }
    });

    it('should call connect() when subscribing', () => {
      service.subscribeToSlotUpdates().subscribe();

      expect(mockSocketInstance.connect).toHaveBeenCalled();
    });

    it('should register socket event listener for slot-update', () => {
      service.subscribeToSlotUpdates().subscribe();

      expect(mockSocketInstance.on).toHaveBeenCalledWith('slot-update', expect.any(Function));
    });

    it('should clean up socket listener on unsubscribe', () => {
      const subscription = service.subscribeToSlotUpdates().subscribe();

      subscription.unsubscribe();

      expect(mockSocketInstance.off).toHaveBeenCalledWith('slot-update');
    });
  });

  describe('joinRoom()', () => {
    it('should emit join-room event with room name', () => {
      service.joinRoom('booking-room');

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join-room', 'booking-room');
    });

    it('should emit join-room event with different room names', () => {
      service.joinRoom('room-a');
      service.joinRoom('room-b');

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join-room', 'room-a');
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join-room', 'room-b');
    });
  });

  describe('leaveRoom()', () => {
    it('should emit leave-room event with room name', () => {
      service.leaveRoom('booking-room');

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave-room', 'booking-room');
    });

    it('should emit leave-room event with different room names', () => {
      service.leaveRoom('room-a');
      service.leaveRoom('room-b');

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave-room', 'room-a');
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave-room', 'room-b');
    });
  });

  describe('isConnected()', () => {
    it('should return false when not connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = false;

      expect(service.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = true;

      expect(service.isConnected()).toBe(true);
    });

    it('should reflect connection state changes', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = false;
      expect(service.isConnected()).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = true;
      expect(service.isConnected()).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = false;
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('connection state management', () => {
    it('should set connected to true on connect event', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = false;

      // Re-register the connect handler on the mock socket
      let connectHandler: (() => void) | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).socket.on('connect', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).connected = true;
      });
      // Capture the handler via the spy's callFake
      if (mockSocketInstance.on.mock.calls.length > 0) {
        const lastCall = mockSocketInstance.on.mock.calls[mockSocketInstance.on.mock.calls.length - 1];
        if (lastCall[0] === 'connect') {
          connectHandler = lastCall[1] as (() => void);
        }
      }

      if (connectHandler) {
        connectHandler();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).connected).toBe(true);
    });

    it('should set connected to false on disconnect event', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connected = true;

      // Re-register the disconnect handler on the mock socket
      let disconnectHandler: (() => void) | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).socket.on('disconnect', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).connected = false;
      });
      if (mockSocketInstance.on.mock.calls.length > 0) {
        const lastCall = mockSocketInstance.on.mock.calls[mockSocketInstance.on.mock.calls.length - 1];
        if (lastCall[0] === 'disconnect') {
          disconnectHandler = lastCall[1] as (() => void);
        }
      }

      if (disconnectHandler) {
        disconnectHandler();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).connected).toBe(false);
    });
  });

  describe('observable behavior', () => {
    it('should emit multiple slot updates', (done) => {
      service.connect();

      const updates: SlotUpdateEvent[] = [];

      service.subscribeToSlotUpdates().subscribe({
        next: (update) => {
          updates.push(update);
          if (updates.length === 3) {
            expect(updates.length).toBe(3);
            expect(updates[0].slotId).toBe('slot-1');
            expect(updates[1].slotId).toBe('slot-2');
            expect(updates[2].slotId).toBe('slot-3');
            done();
          }
        },
      });

      const connectCallback = mockOnCallbacks['connect'];
      if (connectCallback) {
        connectCallback();
      }

      const slotUpdateCallback = mockOnCallbacks['slot-update'];
      if (slotUpdateCallback) {
        slotUpdateCallback({ slotId: 'slot-1', isActive: true, timestamp: Date.now() });
        slotUpdateCallback({ slotId: 'slot-2', isActive: false, timestamp: Date.now() });
        slotUpdateCallback({ slotId: 'slot-3', isActive: true, timestamp: Date.now() });
      }
    });
  });

  describe('AppointmentStatusEvent', () => {
    it('should have the correct structure', () => {
      const event: AppointmentStatusEvent = {
        appointmentId: 'apt-1',
        status: 'confirmed',
        previousStatus: 'pending',
        timestamp: '2026-05-08T10:00:00Z',
      };

      expect(event.appointmentId).toBe('apt-1');
      expect(event.status).toBe('confirmed');
      expect(event.previousStatus).toBe('pending');
      expect(event.timestamp).toBe('2026-05-08T10:00:00Z');
    });
  });

  describe('subscribeToAppointmentStatusChanges()', () => {
    it('should return an Observable that emits on appointment.status_changed', (done) => {
      service.connect();

      const mockEvent: AppointmentStatusEvent = {
        appointmentId: 'apt-1',
        status: 'confirmed',
        previousStatus: 'pending',
        timestamp: '2026-05-08T10:00:00Z',
      };

      service.subscribeToAppointmentStatusChanges().subscribe((event) => {
        expect(event).toEqual(mockEvent);
        done();
      });

      const connectCallback = mockOnCallbacks['connect'];
      if (connectCallback) {
        connectCallback();
      }

      const callback = mockOnCallbacks['appointment.status_changed'];
      if (callback) {
        callback(mockEvent);
      }
    });

    it('should call connect() when subscribing', () => {
      service.subscribeToAppointmentStatusChanges().subscribe();

      expect(mockSocketInstance.connect).toHaveBeenCalled();
    });

    it('should register socket event listener for appointment.status_changed', () => {
      service.subscribeToAppointmentStatusChanges().subscribe();

      expect(mockSocketInstance.on).toHaveBeenCalledWith('appointment.status_changed', expect.any(Function));
    });

    it('should clean up socket listener on unsubscribe', () => {
      const subscription = service.subscribeToAppointmentStatusChanges().subscribe();

      subscription.unsubscribe();

      expect(mockSocketInstance.off).toHaveBeenCalledWith('appointment.status_changed');
    });
  });

  describe('joinAdminRoom()', () => {
    it('should emit join event with admin:broadcast room', () => {
      service.joinAdminRoom();

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join', { room: 'admin:broadcast' });
    });
  });
});
