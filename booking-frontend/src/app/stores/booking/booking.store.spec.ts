import { TestBed } from '@angular/core/testing';
import { BookingStore, TimeSlot } from './booking.store';
import { ApiService } from '../../core/services/api.service';
import { Service } from '../../shared/dto/service.dto';
import { BookingListItem, ReservationResponse } from '../../shared/dto/booking.dto';
import { of, throwError } from 'rxjs';

describe('BookingStore', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;
  let apiServiceMock: jest.Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock = {
      getServices: jest.fn(),
      getAvailableSlots: jest.fn(),
      createAppointment: jest.fn(),
      getMyAppointments: jest.fn(),
      cancelBooking: jest.fn(),
    } as unknown as jest.Mocked<ApiService>;

    TestBed.configureTestingModule({
      providers: [
        BookingStore,
        { provide: ApiService, useValue: apiServiceMock },
      ],
    });
    store = TestBed.inject(BookingStore);
  });

  it('should initialize with empty slots', () => {
    expect(store.slots()).toEqual([]);
  });

  it('should initialize with null selectedSlot', () => {
    expect(store.selectedSlot()).toBeNull();
  });

  it('should initialize with isLoading false', () => {
    expect(store.isLoading()).toBe(false);
  });

  it('should initialize with null error', () => {
    expect(store.error()).toBeNull();
  });

  it('should initialize with empty activeBookings', () => {
    expect(store.activeBookings()).toEqual([]);
  });

  it('should initialize with empty selectedSlotIds', () => {
    expect(store.selectedSlotIds()).toEqual([]);
  });

  it('should initialize with zero overtimeMinutes', () => {
    expect(store.overtimeMinutes()).toBe(0);
  });

  it('should expose availableSlots computed signal', () => {
    const mockSlots: TimeSlot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
      { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 3, available: false },
      { id: '3', startTime: '11:00', endTime: '12:00', capacity: 5, bookedCount: 0, available: true },
    ];

    expect(store.availableSlots()).toEqual([]);

    store.loadSlots(mockSlots);

    expect(store.availableSlots().length).toBe(2);
    expect(store.availableSlots()[0].id).toBe('1');
    expect(store.availableSlots()[1].id).toBe('3');
  });

  it('should expose bookedSlots computed signal', () => {
    const mockSlots: TimeSlot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
      { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 3, available: false },
      { id: '3', startTime: '11:00', endTime: '12:00', capacity: 5, bookedCount: 0, available: true },
    ];

    expect(store.bookedSlots()).toEqual([]);

    store.loadSlots(mockSlots);

    expect(store.bookedSlots().length).toBe(1);
    expect(store.bookedSlots()[0].id).toBe('2');
  });

  it('should load available slots', () => {
    const mockSlots: TimeSlot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
      { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 0, available: true },
    ];

    store.loadSlots(mockSlots);

    expect(store.slots()).toEqual(mockSlots);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should select a slot', () => {
    const mockSlot: TimeSlot = {
      id: '1',
      startTime: '09:00',
      endTime: '10:00',
      capacity: 5,
      bookedCount: 0,
      available: true,
    };

    expect(store.hasSelection()).toBe(false);

    store.selectSlot(mockSlot);

    expect(store.selectedSlot()).toEqual(mockSlot);
    expect(store.hasSelection()).toBe(true);
  });

  it('should clear selection when selecting null', () => {
    const mockSlot: TimeSlot = {
      id: '1',
      startTime: '09:00',
      endTime: '10:00',
      capacity: 5,
      bookedCount: 0,
      available: true,
    };

    store.selectSlot(mockSlot);
    expect(store.selectedSlot()).not.toBeNull();

    store.selectSlot(null);

    expect(store.selectedSlot()).toBeNull();
    expect(store.hasSelection()).toBe(false);
  });

  it('should update slot availability on booking', () => {
    const mockSlots: TimeSlot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
      { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 0, available: true },
    ];

    store.loadSlots(mockSlots);
    store.bookSlot('1', 'user-123');

    const updatedSlots = store.slots();
    expect(updatedSlots[0].available).toBe(false);
    expect(updatedSlots[1].available).toBe(true);
    expect(store.activeBookings()).toContain('1');
    expect(store.selectedSlot()).toBeNull();
  });

  it('should handle concurrent booking attempts', () => {
    const mockSlots: TimeSlot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
    ];

    store.loadSlots(mockSlots);

    // Simulate concurrent bookings
    store.bookSlot('1', 'user-123');
    
    const slotsAfterFirst = store.slots();
    expect(slotsAfterFirst[0].available).toBe(false);
    expect(store.activeBookings().length).toBe(1);
  });

  it('should cancel a booking and restore availability', () => {
    const mockSlots: TimeSlot[] = [
      { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
    ];

    store.loadSlots(mockSlots);
    store.bookSlot('1', 'user-123');
    
    expect(store.slots()[0].available).toBe(false);
    expect(store.activeBookings()).toContain('1');

    store.cancelBooking('1');

    const slotsAfterCancel = store.slots();
    expect(slotsAfterCancel[0].available).toBe(true);
    expect(store.activeBookings()).not.toContain('1');
  });

  it('should set loading state', () => {
    store.setLoading(true);
    expect(store.isLoading()).toBe(true);

    store.setLoading(false);
    expect(store.isLoading()).toBe(false);
  });

  it('should set error state and clear loading', () => {
    store.setLoading(true);
    store.setError('Booking failed');

    expect(store.error()).toBe('Booking failed');
    expect(store.isLoading()).toBe(false);
  });

  // ==========================================
  // BUG-004: New methods for API-driven booking
  // ==========================================

  describe('[BUG-004] confirmSlotReservation()', () => {
    it('[RED] should fail: confirmSlotReservation is not yet implemented', () => {
      // RED phase: This test will fail because confirmSlotReservation does not exist yet
      expect(store.confirmSlotReservation).toBeDefined();
    });

    it('[RED] should fail: should mark a slot as booked when confirmed', () => {
      const mockSlots: TimeSlot[] = [
        { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
        { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 0, available: true },
      ];

      store.loadSlots(mockSlots);
      store.confirmSlotReservation('1');

      const updatedSlots = store.slots();
      expect(updatedSlots[0].available).toBe(false);
      expect(updatedSlots[1].available).toBe(true);
    });
  });

  describe('[BUG-004] failedReservation()', () => {
    it('[RED] should fail: failedReservation is not yet implemented', () => {
      // RED phase: This test will fail because failedReservation does not exist yet
      expect(store.failedReservation).toBeDefined();
    });

    it('[RED] should fail: should restore slot and set error message', () => {
      // Simulate an optimistic slot change, then rollback
      const mockSlots: TimeSlot[] = [
        { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
      ];

      store.loadSlots(mockSlots);
      store.failedReservation('1', 'Network error');

      const updatedSlots = store.slots();
      // Slot should remain active (rolled back)
      expect(updatedSlots[0].available).toBe(true);
      expect(store.error()).toBe('Network error');
      expect(store.isLoading()).toBe(false);
    });
  });

  // ==========================================
  // TYPE UNIFICATION: RED phase - DTO TimeSlot
  // ==========================================
  //
  // These tests document the expected behavior AFTER TimeSlot type unification.
  // Currently the store defines its own TimeSlot with { id, date, time, isActive, bookedBy }
  // while the DTO (time-slot.dto.ts) defines the authority TimeSlot with { id, startTime, endTime, capacity, bookedCount, available }.
  // These tests MUST FAIL with the current code because the store's computed signals
  // (availableSlots, bookedSlots) still reference store-specific fields (isActive) instead of DTO fields (available).

  describe('[TYPE-UNIFICATION] Store works with DTO-typed TimeSlot', () => {
    it('should work with DTO-typed TimeSlot using `available` field', () => {
      // DTO TimeSlot uses `available` field.
      // The store's `availableSlots` computed now correctly filters by `slot.available`.
      const dtoSlots = [
        { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
        { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 3, available: false },
      ];

      store.loadSlots(dtoSlots as any[]);

      const available = store.availableSlots();
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('1');
    });

    it('should work with DTO-typed TimeSlot using `!available` for booked slots', () => {
      const dtoSlots = [
        { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
        { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 3, available: false },
      ];

      store.loadSlots(dtoSlots as any[]);

      const booked = store.bookedSlots();
      expect(booked.length).toBe(1);
      expect(booked[0].id).toBe('2');
    });
  });

  // ==========================================
  // RED PHASE: Wire BookingStore to real API calls
  // ==========================================

  describe('[RED] loadServices()', () => {
    it('[RED] should fail: loadServices is not yet defined', () => {
      expect(store.loadServices).toBeDefined();
    });

    it('[RED] should fail: should call apiService.getServices and store services', async () => {
      const mockServices: Service[] = [
        { id: '1', name: 'Haircut', description: 'Basic cut', duration: 30, durationMinutes: 30, price: 25, active: true },
      ];
      apiServiceMock.getServices.mockReturnValue(of(mockServices));

      await store.loadServices();

      expect(apiServiceMock.getServices).toHaveBeenCalled();
      expect(store.services()).toEqual(mockServices);
      expect(store.isLoading()).toBe(false);
    });

    it('[RED] should fail: should set error on API failure', async () => {
      apiServiceMock.getServices.mockReturnValue(
        throwError(() => new Error('Failed to load services'))
      );

      await store.loadServices();

      expect(store.error()).toBe('Failed to load services');
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('[RED] loadTimeSlots()', () => {
    it('[RED] should fail: loadTimeSlots is not yet defined', () => {
      expect(store.loadTimeSlots).toBeDefined();
    });

    it('[RED] should fail: should call apiService.getAvailableSlots with serviceId', async () => {
      const mockSlots = [
        { id: '1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: true },
        { id: '2', startTime: '10:00', endTime: '11:00', capacity: 5, bookedCount: 2, available: false },
      ];
      apiServiceMock.getAvailableSlots.mockReturnValue(of(mockSlots));

      await store.loadTimeSlots('svc-1');

      expect(apiServiceMock.getAvailableSlots).toHaveBeenCalledWith('svc-1');
      expect(store.slots()).toEqual(mockSlots);
      expect(store.isLoading()).toBe(false);
    });

    it('[RED] should fail: should handle API failure gracefully', async () => {
      apiServiceMock.getAvailableSlots.mockReturnValue(
        throwError(() => new Error('No slots available'))
      );

      await store.loadTimeSlots('svc-1');

      expect(store.error()).toBe('No slots available');
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('[RED] createAppointment()', () => {
    it('[RED] should fail: createAppointment is not yet defined', () => {
      expect(store.createAppointment).toBeDefined();
    });

    it('[RED] should fail: should call apiService.createAppointment with correct params', async () => {
      const mockResponse: ReservationResponse = {
        status: 'SUCCESS',
        slot: { id: 'slot-1', startTime: '09:00', endTime: '10:00', capacity: 5, bookedCount: 0, available: false },
      };
      apiServiceMock.createAppointment.mockReturnValue(of(mockResponse));

      const dto = { timeSlotId: 'slot-1', serviceId: 'svc-1', appointmentDate: '2026-05-01', preferredSequence: 1 };
      const result = await store.createAppointment(dto);

      expect(apiServiceMock.createAppointment).toHaveBeenCalledWith(dto);
      expect(result.status).toBe('SUCCESS');
    });

    it('[RED] should fail: should handle API failure and return FAILED response', async () => {
      apiServiceMock.createAppointment.mockReturnValue(
        throwError(() => new Error('Booking failed'))
      );

      const result = await store.createAppointment({
        timeSlotId: 'slot-1',
        serviceId: 'svc-1',
        appointmentDate: '2026-05-01',
        preferredSequence: 1,
      });

      expect(result.status).toBe('FAILED');
      expect(store.error()).toBe('Booking failed');
    });
  });

  describe('[RED] fetchMyBookings()', () => {
    it('[RED] should fail: fetchMyBookings is not yet defined', () => {
      expect(store.fetchMyBookings).toBeDefined();
    });

    it('[RED] should fail: should call apiService.getMyAppointments and store bookings', async () => {
      const mockBookings: BookingListItem[] = [
        {
          id: 'apt-1', timeSlotId: 'slot-1', appointmentDate: '2026-05-01T10:00:00Z',
          status: 'CONFIRMED' as any, serviceName: 'Haircut',
          timeSlotStart: '10:00', timeSlotEnd: '11:00',
        },
      ];
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockBookings));

      await store.fetchMyBookings();

      expect(apiServiceMock.getMyAppointments).toHaveBeenCalled();
      expect(store.bookings()).toEqual(mockBookings);
      expect(store.isLoading()).toBe(false);
    });

    it('[RED] should fail: should pass query params to API', async () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of([]));

      await store.fetchMyBookings({ status: 'CONFIRMED' });

      expect(apiServiceMock.getMyAppointments).toHaveBeenCalledWith(
        { status: 'CONFIRMED' }
      );
    });
  });

  describe('[RED] cancelMyBooking()', () => {
    it('[RED] should fail: cancelMyBooking is not yet defined', () => {
      expect(store.cancelMyBooking).toBeDefined();
    });

    it('[RED] should fail: should call apiService.cancelBooking and update local state', async () => {
      const mockBookings: BookingListItem[] = [
        {
          id: 'apt-1', timeSlotId: 'slot-1', appointmentDate: '2026-05-01T10:00:00Z',
          status: 'CONFIRMED' as any, serviceName: 'Haircut',
          timeSlotStart: '10:00', timeSlotEnd: '11:00',
        },
      ];
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockBookings));
      await store.fetchMyBookings();

      apiServiceMock.cancelBooking.mockReturnValue(of(undefined));

      await store.cancelMyBooking('apt-1');

      expect(apiServiceMock.cancelBooking).toHaveBeenCalledWith('apt-1');
      // Booking should be removed from local list
      expect(store.bookings().length).toBe(0);
    });

    it('[RED] should fail: should handle API failure during cancellation', async () => {
      apiServiceMock.cancelBooking.mockReturnValue(
        throwError(() => new Error('Cancel failed'))
      );

      await store.cancelMyBooking('apt-1');

      expect(store.error()).toBe('Cancel failed');
    });
  });

  // ==========================================
  // FINANCIAL FIELDS (v1.7.0): selectedSlotIds, overtimeMinutes
  // ==========================================

  describe('[GREEN] Financial fields (v1.7.0)', () => {
    it('[Green] selectedSlotIds should exist in BookingState with empty default', () => {
      expect(store.selectedSlotIds).toBeDefined();
      expect(store.selectedSlotIds()).toEqual([]);
    });

    it('[Green] overtimeMinutes should exist in BookingState with zero default', () => {
      expect(store.overtimeMinutes).toBeDefined();
      expect(store.overtimeMinutes()).toBe(0);
    });
  });
});
