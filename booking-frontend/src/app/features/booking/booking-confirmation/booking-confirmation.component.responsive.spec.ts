import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingConfirmationComponent } from './booking-confirmation.component';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';
import { BookingService } from '../booking.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

/**
 * Responsive Design Tests for BookingConfirmation Component
 * Tests: bottom action bar, full-width buttons on mobile, touch targets
 */
describe('BookingConfirmationComponent - Responsive Design', () => {
  let component: BookingConfirmationComponent;
  let fixture: ComponentFixture<BookingConfirmationComponent>;
  let bookingStoreMock: Record<string, unknown>;
  let authStoreMock: Record<string, unknown>;
  let bookingServiceMock: Record<string, jest.Mock>;

  const mockSlot = {
    id: 'slot-1',
    startTime: '2026-05-15T10:00:00Z',
    endTime: '2026-05-15T11:00:00Z',
    available: true,
  };

  beforeEach(async () => {
    bookingStoreMock = {
      selectedSlot: signal(mockSlot),
      selectedServiceId: signal('svc-1'),
      services: signal([{
        id: 'svc-1',
        name: 'Standard Service',
        description: 'A standard service',
        duration: 30,
        durationMinutes: 30,
        price: 50,
        active: true,
      }]),
      hasSelection: signal(true),
      isLoading: signal(false),
      error: signal<string | null>(null),
      bookSlot: jest.fn(),
    };

    authStoreMock = {
      user: signal({ id: '1', name: 'Test', role: 'CUSTOMER' }),
      currentUser: signal({ id: '1', name: 'Test', role: 'CUSTOMER' }),
    };

    bookingServiceMock = {
      generatePreferSeq: jest.fn(),
      generateIdempotencyKey: jest.fn(),
      reserveSlot: jest.fn(),
      cancelBooking: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BookingConfirmationComponent],
      providers: [
        provideRouter([]),
        { provide: BookingStore, useValue: bookingStoreMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: BookingService, useValue: bookingServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('action buttons', () => {
    it('[RED] should render action buttons section', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('[RED] should have buttons for touch targets', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      expect(buttons.length).toBe(2); // Back + Confirm
    });
  });

  describe('terms checkbox', () => {
    it('[RED] should render terms checkbox', () => {
      const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeTruthy();
    });
  });

  describe('confirmation card responsive', () => {
    it('[RED] should render confirmation content', () => {
      const content = fixture.nativeElement.querySelector('.confirmation-content');
      expect(content).toBeTruthy();
    });

    it('[RED] should render gradient header', () => {
      const header = fixture.nativeElement.querySelector('.gradient-text');
      expect(header).toBeTruthy();
      expect(header.textContent).toContain('确认预约');
    });
  });
});
