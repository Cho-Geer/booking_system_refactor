import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DashboardComponent } from './dashboard.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminStats } from '../../dto/admin.dto';
import { of, throwError } from 'rxjs';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  const defaultStats: AdminStats = {
    totalBookings: 0, todayBookings: 0, activeUsers: 0,
    totalRevenue: 0, bookingTrend: [], servicePopularity: [],
  };

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn().mockReturnValue(of(defaultStats)),
      getUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn(),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        AdminStore,
        { provide: AdminService, useValue: mockAdminService },
      ],
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(AdminStore);
    // Trigger ngOnInit which loads default (empty) stats
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial empty stats after load', () => {
    expect(component.vm().stats).toBeTruthy();
  });

  it('should display stats from store', () => {
    const mockStats: AdminStats = {
      totalBookings: 150,
      todayBookings: 12,
      activeUsers: 45,
      totalRevenue: 12500.50,
      bookingTrend: [
        { date: '2026-04-24', count: 5 },
        { date: '2026-04-25', count: 8 },
      ],
      servicePopularity: [
        { serviceName: 'Haircut', count: 30 },
        { serviceName: 'Massage', count: 20 },
      ],
    };

    store.setStats(mockStats);

    expect(component.vm().stats?.totalBookings).toBe(150);
    expect(component.vm().stats?.todayBookings).toBe(12);
  });

  it('should display loading state', () => {
    store.setLoading(true);
    expect(component.vm().isLoading).toBe(true);
  });

  it('should load stats on init', () => {
    expect(mockAdminService.getStats).toHaveBeenCalled();
  });

  it('should handle error when loading stats', () => {
    // Reset mock to return error
    mockAdminService.getStats.mockReturnValue(throwError(() => new Error('Failed to load')));

    // Re-trigger load
    component['loadStats']();

    expect(store.error()).toBe('Failed to load');
  });

  describe('admin card hover micro-interaction', () => {
    it('[RED] should use app-card-hover class on admin stat cards', () => {
      const mockStats: AdminStats = {
        totalBookings: 150, todayBookings: 12, activeUsers: 45,
        totalRevenue: 12500.50,
        bookingTrend: [{ date: '2026-04-24', count: 5 }],
        servicePopularity: [{ serviceName: 'Haircut', count: 30 }],
      };
      store.setStats(mockStats);
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('app-card');
      expect(cards.length).toBeGreaterThan(0);
      // app-card-hover class should be combined via app-card's combinedStyleClass
      const firstCard = fixture.debugElement.query(By.css('app-card'));
      expect(firstCard).toBeTruthy();
      // The app-card component combines styleClass with app-card-hover internally
      expect(firstCard.componentInstance.styleClass()).toContain('app-dashboard-card-hover');
    });

    it('[RED] should have app-dashboard-card-hover class in combinedStyleClass', () => {
      const mockStats: AdminStats = {
        totalBookings: 150, todayBookings: 12, activeUsers: 45,
        totalRevenue: 12500.50,
        bookingTrend: [{ date: '2026-04-24', count: 5 }],
        servicePopularity: [{ serviceName: 'Haircut', count: 30 }],
      };
      store.setStats(mockStats);
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      expect(cards.length).toBeGreaterThan(0);
      // First card should have dashboard hover class
      const firstCard = cards[0].componentInstance as AppCardComponent;
      expect(firstCard.combinedStyleClass).toContain('app-dashboard-card-hover');
    });
  });
});
