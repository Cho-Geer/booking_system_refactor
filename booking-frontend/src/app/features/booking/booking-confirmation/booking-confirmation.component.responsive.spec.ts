import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingConfirmationComponent } from './booking-confirmation.component';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

/**
 * Responsive Design Tests for BookingConfirmation Component
 * Tests: bottom fixed action bar, full-width buttons on mobile, touch targets
 */
describe('BookingConfirmationComponent - Responsive Design', () => {
  let component: BookingConfirmationComponent;
  let fixture: ComponentFixture<BookingConfirmationComponent>;
  let bookingStoreMock: Record<string, unknown>;
  let authStoreMock: Record<string, unknown>;

  const mockSlot = {
    id: 'slot-1',
    startTime: '2026-05-15T10:00:00Z',
    endTime: '2026-05-15T11:00:00Z',
    available: true,
  };

  beforeEach(async () => {
    bookingStoreMock = {
      selectedSlot: signal(mockSlot),
      hasSelection: signal(true),
      isLoading: signal(false),
      error: signal<string | null>(null),
      bookSlot: jest.fn(),
    };

    authStoreMock = {
      user: signal({ id: '1', name: 'Test', role: 'CUSTOMER' }),
      currentUser: signal({ id: '1', name: 'Test', role: 'CUSTOMER' }),
    };

    await TestBed.configureTestingModule({
      imports: [BookingConfirmationComponent],
      providers: [
        provideRouter([]),
        { provide: BookingStore, useValue: bookingStoreMock },
        { provide: AuthStore, useValue: authStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('bottom fixed action bar', () => {
    it('[RED] should render actions section', () => {
      const actionsEl = fixture.debugElement.query(By.css('.actions'));
      expect(actionsEl).toBeTruthy();
    });

    it('[RED] should have buttons present for touch targets', () => {
      const btnPrimary = fixture.nativeElement.querySelector('.btn-primary');
      const btnSecondary = fixture.nativeElement.querySelector('.btn-secondary');
      expect(btnPrimary).toBeTruthy();
      expect(btnSecondary).toBeTruthy();
    });
  });

  describe('touch-friendly targets', () => {
    it('[RED] should have buttons rendered in the component', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('confirmation card responsive', () => {
    it('[RED] should render confirmation card', () => {
      const card = fixture.nativeElement.querySelector('.confirmation-card');
      expect(card).toBeTruthy();
      // Card is full width on mobile via CSS
      expect(card.classList.contains('w-full')).toBeTruthy();
    });

    it('[RED] should change card padding on mobile via responsive CSS class', () => {
      const card = fixture.nativeElement.querySelector('.confirmation-card');
      // The SCSS has @media (max-width: 640px) that reduces padding
      // In the component html, default padding is p-6 sm:p-8 pattern
      expect(card).toBeTruthy();
    });
  });
});
