import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeSlotPickerComponent } from './time-slot-picker.component';
import { BookingStore } from '../../../stores/booking/booking.store';
import { SocketService } from '../../../core/services/socket.service';

/**
 * Responsive Design Tests for TimeSlotPicker Component
 * Tests: touch-friendly slot buttons, responsive grid layout
 */
describe('TimeSlotPickerComponent - Responsive Design', () => {
  let component: TimeSlotPickerComponent;
  let fixture: ComponentFixture<TimeSlotPickerComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storeMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookingServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let socketServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSlots: any[];

  beforeEach(async () => {
    mockSlots = [
      { id: 'slot-1', startTime: '2026-05-15T09:00:00Z', endTime: '2026-05-15T10:00:00Z', capacity: 5, bookedCount: 1, available: true },
      { id: 'slot-2', startTime: '2026-05-15T10:00:00Z', endTime: '2026-05-15T11:00:00Z', capacity: 5, bookedCount: 0, available: true },
      { id: 'slot-3', startTime: '2026-05-15T11:00:00Z', endTime: '2026-05-15T12:00:00Z', capacity: 1, bookedCount: 1, available: false },
    ];

    storeMock = {
      slots: jest.fn(() => []),
      selectedSlot: jest.fn(() => null),
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      availableSlots: jest.fn(() => mockSlots.filter((s: { available: boolean }) => s.available)),
      bookedSlots: jest.fn(() => mockSlots.filter((s: { available: boolean }) => !s.available)),
      hasSelection: jest.fn(() => false),
      loadSlots: jest.fn(),
      selectSlot: jest.fn(),
      bookSlot: jest.fn(),
      cancelBooking: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    };

    bookingServiceMock = {
      generatePreferSeq: jest.fn(() => 3),
      generateIdempotencyKey: jest.fn(() => 'key-123'),
      reserveSlot: jest.fn(),
      cancelBooking: jest.fn(),
    };

    socketServiceMock = {
      subscribeToSlotUpdates: jest.fn(() => ({
        pipe: jest.fn(() => ({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
      })),
      connect: jest.fn(),
      disconnect: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      isConnected: jest.fn(() => false),
    };

    await TestBed.configureTestingModule({
      imports: [TimeSlotPickerComponent],
      providers: [
        { provide: BookingStore, useValue: storeMock },
        { provide: BookingService, useValue: bookingServiceMock },
        { provide: SocketService, useValue: socketServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('touch-friendly slot cards', () => {
    it('[RED] should render slot cards', () => {
      const slotCards = fixture.nativeElement.querySelectorAll('.slot-card');
      expect(slotCards.length).toBeGreaterThan(0);
    });

    it('[RED] should have slot cards with full width', () => {
      const slotCards = fixture.nativeElement.querySelectorAll('.slot-card');
      slotCards.forEach((btn: HTMLElement) => {
        expect(btn.classList.contains('w-full')).toBeTruthy();
      });
    });
  });

  describe('responsive grid layout', () => {
    it('[RED] should render time-slots-grid container', () => {
      const container = fixture.nativeElement.querySelector('.time-slots-grid');
      expect(container).toBeTruthy();
      // Grid is responsive: 3 cols on desktop, 2 on tablet, 1 on mobile via CSS
    });
  });
});
