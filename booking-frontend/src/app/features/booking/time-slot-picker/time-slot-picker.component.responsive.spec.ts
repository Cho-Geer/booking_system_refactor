import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeSlotPickerComponent } from './time-slot-picker.component';
import { BookingStore } from '../../../stores/booking/booking.store';
import { signal } from '@angular/core';

/**
 * Responsive Design Tests for TimeSlotPicker Component
 * Tests: touch-friendly slot buttons, responsive grid layout
 */
describe('TimeSlotPickerComponent - Responsive Design', () => {
  let component: TimeSlotPickerComponent;
  let fixture: ComponentFixture<TimeSlotPickerComponent>;
  let bookingStoreMock: Record<string, unknown>;

  const mockSlots = [
    { id: 'slot-1', startTime: '2026-05-15T09:00:00Z', endTime: '2026-05-15T10:00:00Z', available: true },
    { id: 'slot-2', startTime: '2026-05-15T10:00:00Z', endTime: '2026-05-15T11:00:00Z', available: true },
    { id: 'slot-3', startTime: '2026-05-15T11:00:00Z', endTime: '2026-05-15T12:00:00Z', available: false },
  ];

  beforeEach(async () => {
    bookingStoreMock = {
      availableSlots: signal(mockSlots),
      selectedSlot: signal(null),
      isLoading: signal(false),
      error: signal<string | null>(null),
      selectSlot: jest.fn(),
      loadAvailableSlots: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TimeSlotPickerComponent],
      providers: [
        { provide: BookingStore, useValue: bookingStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('touch-friendly slot buttons', () => {
    it('[RED] should render slot buttons', () => {
      const slotButtons = fixture.nativeElement.querySelectorAll('.slot-button');
      expect(slotButtons.length).toBeGreaterThan(0);
    });

    it('[RED] should have slot buttons with 100% width for mobile layout', () => {
      const slotButtons = fixture.nativeElement.querySelectorAll('.slot-button');
      slotButtons.forEach((btn: HTMLElement) => {
        expect(btn.classList.contains('w-full')).toBeTruthy();
      });
    });
  });

  describe('responsive grid layout', () => {
    it('[RED] should render time-slots container', () => {
      const container = fixture.nativeElement.querySelector('.time-slots');
      expect(container).toBeTruthy();
      // Grid is responsive: single column on mobile via CSS
    });
  });
});
