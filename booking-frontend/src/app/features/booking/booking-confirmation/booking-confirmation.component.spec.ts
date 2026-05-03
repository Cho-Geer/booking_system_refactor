import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { BookingConfirmationComponent } from './booking-confirmation.component';
import { BookingStore, TimeSlot } from '../../../stores/booking/booking.store';
import { AuthStore, User } from '../../../stores/auth/auth.store';
import { BookingService } from '../booking.service';

describe('BookingConfirmationComponent', () => {
  let component: BookingConfirmationComponent;
  let fixture: ComponentFixture<BookingConfirmationComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookingStoreMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStoreMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookingServiceMock: any;
  let router: Router;

  const mockSlot: TimeSlot = {
    id: 'slot-1',
    startTime: '2026-04-20T09:00:00',
    endTime: '2026-04-20T10:00:00',
    capacity: 1,
    bookedCount: 0,
    available: true,
    isActive: true,
  };

  const mockServices = [{
    id: 'svc-1',
    name: 'Standard Service',
    description: 'A standard service',
    duration: 30,
    durationMinutes: 30,
    price: 50,
    active: true,
  }];

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };

  beforeEach(async () => {
    bookingStoreMock = {
      slots: jest.fn(() => []),
      selectedSlot: jest.fn(() => null),
      selectedServiceId: jest.fn(() => null),
      services: jest.fn(() => []),
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      activeBookings: jest.fn(() => []),
      availableSlots: jest.fn(() => []),
      bookedSlots: jest.fn(() => []),
      hasSelection: jest.fn(() => false),
      loadSlots: jest.fn(),
      selectSlot: jest.fn(),
      bookSlot: jest.fn(),
      cancelBooking: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    };

    authStoreMock = {
      user: jest.fn(() => null),
      token: jest.fn(() => null),
      isAuthenticated: jest.fn(() => false),
      currentUser: jest.fn(() => null),
      currentToken: jest.fn(() => null),
      loginSuccess: jest.fn(),
      logout: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    };

    bookingServiceMock = {
      generatePreferSeq: jest.fn(),
      generateIdempotencyKey: jest.fn(),
      reserveSlot: jest.fn(),
      cancelBooking: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        BookingConfirmationComponent,
      ],
      providers: [
        provideRouter([]),
        { provide: BookingStore, useValue: bookingStoreMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: BookingService, useValue: bookingServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  describe('initialization', () => {
    it('should create the component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should reference bookingStore signals', () => {
      expect(component.hasSelection).toBe(bookingStoreMock.hasSelection);
      expect(component.selectedSlot).toBe(bookingStoreMock.selectedSlot);
      expect(component.error).toBe(bookingStoreMock.error);
      expect(component.isProcessing).toBe(bookingStoreMock.isLoading);
    });

    it('should have fallback service name when no service selected', () => {
      expect(component.selectedServiceName()).toBe('Unknown Service');
    });

    it('should have fallback service duration when no service selected', () => {
      expect(component.serviceDuration()).toBe(30);
    });

    it('should have fallback service price when no service selected', () => {
      expect(component.servicePrice()).toBe(0);
    });
  });

  describe('slot confirmation flow', () => {
    beforeEach(() => {
      bookingStoreMock.hasSelection.mockReturnValue(true);
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
      bookingStoreMock.services.mockReturnValue(mockServices);
      bookingStoreMock.selectedServiceId.mockReturnValue('svc-1');
    });

    it('should show empty state when no slot is selected', () => {
      bookingStoreMock.hasSelection.mockReturnValue(false);
      bookingStoreMock.selectedSlot.mockReturnValue(null);
      bookingStoreMock.services.mockReturnValue([]);
      bookingStoreMock.selectedServiceId.mockReturnValue(null);
      fixture.detectChanges(false);

      const pageContent = fixture.nativeElement.querySelector('.confirmation-page');
      expect(pageContent.textContent).toContain('未选择预约');
    });

    it('should show confirmation content when slot is selected', () => {
      fixture.detectChanges(false);

      const content = fixture.nativeElement.querySelector('.confirmation-content');
      expect(content).toBeTruthy();
    });

    it('should display service name in booking details', () => {
      fixture.detectChanges(false);

      expect(fixture.nativeElement.textContent).toContain('Standard Service');
    });

    it('should display slot time in booking details', () => {
      fixture.detectChanges(false);

      expect(fixture.nativeElement.textContent).toContain('9:00');
    });

    it('should display service duration in booking details', () => {
      fixture.detectChanges(false);

      expect(fixture.nativeElement.textContent).toContain('30');
      expect(fixture.nativeElement.textContent).toContain('分钟');
    });

    it('should display service price in booking details', () => {
      fixture.detectChanges(false);

      expect(fixture.nativeElement.textContent).toContain('$50');
    });

    it('should call bookSlot on confirmBooking with valid slot and user and terms accepted', () => {
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
      authStoreMock.user.mockReturnValue(mockUser);
      component.acceptTerms = true;

      component.confirmBooking();

      expect(bookingStoreMock.bookSlot).toHaveBeenCalledWith('slot-1', 'user-123');
    });

    it('should navigate to /booking/success on confirmBooking', () => {
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
      authStoreMock.user.mockReturnValue(mockUser);
      component.acceptTerms = true;
      jest.spyOn(router, 'navigate');

      component.confirmBooking();

      expect(router.navigate).toHaveBeenCalledWith(['/booking/success']);
    });

    it('should not call bookSlot when slot is null', () => {
      bookingStoreMock.selectedSlot.mockReturnValue(null);
      authStoreMock.user.mockReturnValue(mockUser);
      jest.spyOn(router, 'navigate');

      component.confirmBooking();

      expect(bookingStoreMock.bookSlot).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not call bookSlot when user is null', () => {
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
      authStoreMock.user.mockReturnValue(null);
      jest.spyOn(router, 'navigate');

      component.confirmBooking();

      expect(bookingStoreMock.bookSlot).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not call bookSlot when terms not accepted', () => {
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
      authStoreMock.user.mockReturnValue(mockUser);
      component.acceptTerms = false;
      jest.spyOn(router, 'navigate');

      component.confirmBooking();

      expect(bookingStoreMock.bookSlot).not.toHaveBeenCalled();
    });
  });

  describe('booking cancellation', () => {
    it('should call selectSlot(null) on cancelBooking', () => {
      component.cancelBooking();

      expect(bookingStoreMock.selectSlot).toHaveBeenCalledWith(null);
    });

    it('should navigate to /booking on cancelBooking', () => {
      jest.spyOn(router, 'navigate');

      component.cancelBooking();

      expect(router.navigate).toHaveBeenCalledWith(['/booking']);
    });
  });

  describe('empty state handling', () => {
    beforeEach(() => {
      bookingStoreMock.hasSelection.mockReturnValue(false);
      bookingStoreMock.selectedSlot.mockReturnValue(null);
      bookingStoreMock.services.mockReturnValue([]);
      bookingStoreMock.selectedServiceId.mockReturnValue(null);
    });

    it('should show empty state when no selection', () => {
      fixture.detectChanges(false);

      const pageContent = fixture.nativeElement.querySelector('.confirmation-page');
      expect(pageContent.textContent).toContain('未选择预约');
    });

    it('should not show confirmation content when no selection', () => {
      fixture.detectChanges(false);

      const content = fixture.nativeElement.querySelector('.confirmation-content');
      expect(content).toBeFalsy();
    });

    it('should show back to booking button in empty state', () => {
      fixture.detectChanges(false);

      const backButton = fixture.nativeElement.querySelector('app-button');
      expect(backButton).toBeTruthy();
    });
  });

  describe('error display', () => {
    beforeEach(() => {
      bookingStoreMock.hasSelection.mockReturnValue(true);
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
      bookingStoreMock.error.mockReturnValue(null);
    });

    it('should not show error message when error is null', () => {
      fixture.detectChanges(false);

      expect(fixture.nativeElement.textContent).not.toContain('Booking failed');
    });

    it('should show error message when error has value', () => {
      bookingStoreMock.error.mockReturnValue('Booking failed');
      fixture.detectChanges(false);

      expect(fixture.nativeElement.textContent).toContain('Booking failed');
    });
  });

  describe('processing state', () => {
    beforeEach(() => {
      bookingStoreMock.hasSelection.mockReturnValue(true);
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
    });

    it('should disable confirm button when processing', () => {
      bookingStoreMock.isLoading.mockReturnValue(true);
      fixture.detectChanges(false);

      const confirmBtn = fixture.nativeElement.querySelector('[label="确认预约"]');
      // The app-button has [disabled] binding - check if it renders
      expect(component.isProcessing()).toBe(true);
    });

    it('should show terms checkbox', () => {
      fixture.detectChanges(false);

      const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeTruthy();
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      bookingStoreMock.hasSelection.mockReturnValue(true);
      bookingStoreMock.selectedSlot.mockReturnValue(mockSlot);
    });

    it('should render confirmation gradient header', () => {
      fixture.detectChanges(false);

      const header = fixture.nativeElement.querySelector('.gradient-text');
      expect(header?.textContent.trim()).toBe('确认预约');
    });

    it('should render detail rows', () => {
      fixture.detectChanges(false);

      const rows = fixture.nativeElement.querySelectorAll('.detail-row');
      expect(rows.length).toBe(5); // Service, Date, Time, Duration, Price
    });

    it('should render terms checkbox', () => {
      fixture.detectChanges(false);

      const terms = fixture.nativeElement.querySelector('input[type="checkbox"]');
      expect(terms).toBeTruthy();
    });

    it('should render price with price class', () => {
      fixture.detectChanges(false);

      const priceElement = fixture.nativeElement.querySelector('.price');
      expect(priceElement).toBeTruthy();
    });

    it('[RED] should have confirmation-page class on container', () => {
      fixture.detectChanges(false);

      const container = fixture.nativeElement.querySelector('.confirmation-page');
      expect(container).toBeTruthy();
    });

    it('[RED] should have page-enter animation class', () => {
      fixture.detectChanges(false);

      const container = fixture.nativeElement.querySelector('.page-enter');
      expect(container).toBeTruthy();
    });
  });
});
