import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyBookingsComponent } from './my-bookings.component';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../stores/auth/auth.store';
import { of, throwError } from 'rxjs';

describe('MyBookingsComponent', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStoreMock: any;

  const mockAppointments = [
    {
      id: 'apt-1',
      timeSlotId: 'slot-1',
      appointmentDate: '2026-05-15T10:00:00Z',
      status: 'CONFIRMED',
      serviceName: 'Haircut',
      timeSlotStart: '2026-05-15T10:00:00Z',
      timeSlotEnd: '2026-05-15T11:00:00Z',
    },
    {
      id: 'apt-2',
      timeSlotId: 'slot-2',
      appointmentDate: '2026-05-16T14:00:00Z',
      status: 'PENDING',
      serviceName: 'Coloring',
      timeSlotStart: '2026-05-16T14:00:00Z',
      timeSlotEnd: '2026-05-16T15:00:00Z',
    },
  ];

  beforeEach(async () => {
    apiServiceMock = {
      getMyAppointments: jest.fn(),
      cancelBooking: jest.fn(),
    };

    authStoreMock = {
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
    };

    await TestBed.configureTestingModule({
      imports: [MyBookingsComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AuthStore, useValue: authStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyBookingsComponent);
    component = fixture.componentInstance;

    // Default mock: return empty array for getMyAppointments
    apiServiceMock.getMyAppointments.mockReturnValue(of([]));
    apiServiceMock.cancelBooking.mockReturnValue(of(void 0));
  });

  describe('initialization', () => {
    it('[RED] should fail: should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('[RED] should fail: should load appointments on init', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();
      expect(apiServiceMock.getMyAppointments).toHaveBeenCalled();
      expect(component.appointments().length).toBe(2);
    });

    it('[RED] should fail: should set active filter to "all" by default', () => {
      fixture.detectChanges();
      expect(component.activeFilter()).toBe('all');
    });
  });

  describe('filtering', () => {
    it('[RED] should fail: should filter appointments by status', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();

      component.setFilter('CONFIRMED');
      expect(component.activeFilter()).toBe('CONFIRMED');
      expect(component.filteredAppointments().length).toBe(1);
      expect(component.filteredAppointments()[0].id).toBe('apt-1');
    });

    it('[RED] should fail: should show all appointments when filter is "all"', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();

      component.setFilter('all');
      expect(component.filteredAppointments().length).toBe(2);
    });
  });

  describe('cancel appointment', () => {
    it('[RED] should fail: should show confirmation dialog before cancelling', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();

      component.requestCancel('apt-1');
      expect(component.showCancelDialog()).toBe(true);
      expect(component.cancellingId()).toBe('apt-1');
    });

    it('[RED] should fail: should confirm cancellation and remove from list', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      apiServiceMock.cancelBooking.mockReturnValue(of(void 0));
      fixture.detectChanges();

      component.requestCancel('apt-1');
      component.confirmCancel();

      expect(apiServiceMock.cancelBooking).toHaveBeenCalledWith('apt-1');
      expect(component.showCancelDialog()).toBe(false);
      expect(component.cancellingId()).toBeNull();
      expect(component.appointments().length).toBe(1);
    });

    it('[RED] should fail: should cancel dialog without cancelling', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();

      component.requestCancel('apt-1');
      component.dismissCancel();

      expect(component.showCancelDialog()).toBe(false);
      expect(component.cancellingId()).toBeNull();
      expect(apiServiceMock.cancelBooking).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('[RED] should fail: should handle load error', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(throwError(() => new Error('Failed to load')));
      fixture.detectChanges();
      expect(component.loadError()).toBe('Failed to load');
    });

    it('[RED] should fail: should retry loading after error', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(throwError(() => new Error('Failed to load')));
      fixture.detectChanges();
      expect(component.loadError()).toBe('Failed to load');

      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      component.loadAppointments();
      expect(component.loadError()).toBeNull();
      expect(component.appointments().length).toBe(2);
    });
  });

  describe('template rendering', () => {
    it('[RED] should fail: should show empty state when no appointments', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of([]));
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
      expect(emptyEl).toBeTruthy();
    });

    it('[RED] should fail: should render appointment cards when data exists', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('[data-testid="booking-card"]');
      expect(cards.length).toBe(2);
    });

    it('[RED] should fail: should not show cancel dialog by default', () => {
      apiServiceMock.getMyAppointments.mockReturnValue(of(mockAppointments));
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('[data-testid="cancel-dialog"]');
      expect(dialog).toBeFalsy();
    });
  });
});
