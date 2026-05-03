import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyBookingsComponent } from './my-bookings.component';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../stores/auth/auth.store';
import { signal } from '@angular/core';
import { of } from 'rxjs';

/**
 * Responsive Design Tests for MyBookings Component
 */
describe('MyBookingsComponent - Responsive Design', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;
  let apiServiceMock: Record<string, jest.Mock>;
  let authStoreMock: Record<string, unknown>;

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
      getMyAppointments: jest.fn(() => of(mockAppointments)),
      cancelBooking: jest.fn(() => of(void 0)),
    };

    authStoreMock = {
      isLoading: signal(false),
      error: signal(null),
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
    fixture.detectChanges();
  });

  describe('touch-friendly click targets', () => {
    it('[RED] should have cancel buttons present with data-testid', () => {
      fixture.detectChanges();
      const cancelButtons = fixture.nativeElement.querySelectorAll('[data-testid="cancel-button"]');
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it('[RED] should have filter tab buttons present', () => {
      const filterTabs = fixture.nativeElement.querySelectorAll('[data-testid="filter-tab"]');
      expect(filterTabs.length).toBeGreaterThan(0);
    });
  });

  describe('pull-to-refresh', () => {
    it('[RED] should have pullToRefreshState signal initialized to idle', () => {
      expect(component.pullToRefreshState).toBeDefined();
      expect(component.pullToRefreshState()).toBe('idle');
    });

    it('[RED] should be able to set pull progress', () => {
      expect(component.pullProgress).toBeDefined();
      component.pullProgress.set(50);
      expect(component.pullProgress()).toBe(50);
    });

    it('[RED] should set state to refreshing and call API when triggerRefresh is called', () => {
      component.triggerRefresh();
      expect(apiServiceMock.getMyAppointments).toHaveBeenCalled();
      expect(component.pullToRefreshState()).toBe('idle');
    });

    it('[RED] should call loadAppointments on trigger refresh', () => {
      component.triggerRefresh();
      expect(apiServiceMock.getMyAppointments).toHaveBeenCalled();
    });

    it('[RED] should reset pull state after refresh completes', () => {
      component.triggerRefresh();
      expect(component.pullToRefreshState()).toBe('idle');
      expect(component.pullProgress()).toBe(0);
    });
  });

  describe('cancel dialog', () => {
    it('[RED] should render cancel dialog when requested', () => {
      component.requestCancel('apt-1');
      fixture.detectChanges();

      // AppModal renders a dialog - check that showCancelDialog is true
      expect(component.showCancelDialog()).toBe(true);
    });
  });
});
