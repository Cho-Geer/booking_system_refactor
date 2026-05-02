import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminStats } from '../../dto/admin.dto';
import { of, throwError } from 'rxjs';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { AppBadgeComponent } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { AppChartComponent } from '../../../../shared/components/atoms/app-chart/app-chart.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  const defaultStats: AdminStats = {
    totalBookings: 0,
    todayBookings: 0,
    activeUsers: 0,
    totalRevenue: 0,
    bookingTrend: [],
    servicePopularity: [],
  };

  const mockStats: AdminStats = {
    totalBookings: 1234,
    todayBookings: 56,
    activeUsers: 789,
    totalRevenue: 45678.9,
    bookingTrend: [
      { date: '2026-04-26', count: 12 },
      { date: '2026-04-27', count: 19 },
      { date: '2026-04-28', count: 15 },
      { date: '2026-04-29', count: 22 },
      { date: '2026-04-30', count: 30 },
      { date: '2026-05-01', count: 25 },
      { date: '2026-05-02', count: 18 },
    ],
    servicePopularity: [
      { serviceName: 'Haircut', count: 45 },
      { serviceName: 'Massage', count: 30 },
      { serviceName: 'Facial', count: 20 },
      { serviceName: 'Manicure', count: 15 },
    ],
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
      imports: [DashboardComponent, RouterTestingModule],
      providers: [AdminStore, { provide: AdminService, useValue: mockAdminService }],
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(AdminStore);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial empty stats after load', () => {
    expect(component.vm().stats).toBeTruthy();
  });

  it('should display stats from store', () => {
    store.setStats(mockStats);
    expect(component.vm().stats?.totalBookings).toBe(1234);
    expect(component.vm().stats?.todayBookings).toBe(56);
  });

  it('should display loading state', () => {
    store.setLoading(true);
    expect(component.vm().isLoading).toBe(true);
  });

  it('should load stats on init', () => {
    expect(mockAdminService.getStats).toHaveBeenCalled();
  });

  it('should handle error when loading stats', () => {
    mockAdminService.getStats.mockReturnValue(
      throwError(() => new Error('Failed to load'))
    );
    component['loadStats']();
    expect(store.error()).toBe('Failed to load');
  });

  describe('Page Header', () => {
    it('[Red] should display title "Dashboard"', () => {
      const title = fixture.nativeElement.querySelector('h1');
      expect(title.textContent).toContain('Dashboard');
    });

    it('[Red] should display subtitle "Overview of your booking system"', () => {
      const subtitle = fixture.nativeElement.querySelector('.dashboard-subtitle');
      expect(subtitle.textContent).toContain('Overview of your booking system');
    });

    it('[Red] should display current date', () => {
      const dateEl = fixture.nativeElement.querySelector('.dashboard-date');
      expect(dateEl).toBeTruthy();
      expect(dateEl.textContent).toMatch(/[A-Za-z]+ \d+,? \d{4}/);
    });
  });

  describe('Quick Actions', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('[Red] should display 4 quick action buttons', () => {
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      const quickActionButtons = buttons.filter(
        (b) =>
          b.componentInstance.label() === 'New Booking' ||
          b.componentInstance.label() === 'Add Service' ||
          b.componentInstance.label() === 'Manage Users' ||
          b.componentInstance.label() === 'View Reports'
      );
      expect(quickActionButtons.length).toBe(4);
    });

    it('[Red] should have "New Booking" primary button', () => {
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      const btn = buttons.find((b) => b.componentInstance.label() === 'New Booking');
      expect(btn).toBeTruthy();
      expect(btn!.componentInstance.variant()).toBe('primary');
    });

    it('[Red] should have "Add Service" secondary button', () => {
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      const btn = buttons.find((b) => b.componentInstance.label() === 'Add Service');
      expect(btn).toBeTruthy();
      expect(btn!.componentInstance.variant()).toBe('secondary');
    });

    it('[Red] should have "Manage Users" secondary button', () => {
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      const btn = buttons.find((b) => b.componentInstance.label() === 'Manage Users');
      expect(btn).toBeTruthy();
      expect(btn!.componentInstance.variant()).toBe('secondary');
    });

    it('[Red] should have "View Reports" ghost button', () => {
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      const btn = buttons.find((b) => b.componentInstance.label() === 'View Reports');
      expect(btn).toBeTruthy();
      expect(btn!.componentInstance.variant()).toBe('ghost');
    });
  });

  describe('Stats Cards', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('[Red] should display 4 stat cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      // 4 stats + 2 charts + 1 recent bookings = 7 total
      expect(cards.length).toBe(7);
    });

    it('[Red] should use elevated variant on stat cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      for (let i = 0; i < 4; i++) {
        const card = cards[i].componentInstance as AppCardComponent;
        expect(card.variant()).toBe('elevated');
      }
    });

    it('[Red] should display Total Bookings card with calendar icon and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      const cardEl = cards[0].nativeElement;
      expect(cardEl.textContent).toContain('Total Bookings');
      expect(cardEl.querySelector('.pi-calendar')).toBeTruthy();
      expect(cardEl.textContent).toContain('1,234');
      expect(cardEl.textContent).toContain('+12% from last month');
    });

    it('[Red] should display Today\'s Bookings card with clock icon and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      const cardEl = cards[1].nativeElement;
      expect(cardEl.textContent).toContain("Today's Bookings");
      expect(cardEl.querySelector('.pi-clock')).toBeTruthy();
      expect(cardEl.textContent).toContain('56');
      expect(cardEl.textContent).toContain('+5% from yesterday');
    });

    it('[Red] should display Active Users card with users icon and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      const cardEl = cards[2].nativeElement;
      expect(cardEl.textContent).toContain('Active Users');
      expect(cardEl.querySelector('.pi-users')).toBeTruthy();
      expect(cardEl.textContent).toContain('789');
      expect(cardEl.textContent).toContain('+8% this week');
    });

    it('[Red] should display Total Revenue card with dollar icon and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      const cardEl = cards[3].nativeElement;
      expect(cardEl.textContent).toContain('Total Revenue');
      expect(cardEl.querySelector('.pi-dollar')).toBeTruthy();
      expect(cardEl.textContent).toContain('$45,678.90');
      expect(cardEl.textContent).toContain('+15% from last month');
    });

    it('[Red] should apply app-dashboard-card-hover class on stat cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      for (let i = 0; i < 4; i++) {
        const card = cards[i].componentInstance as AppCardComponent;
        expect(card.combinedStyleClass).toContain('app-dashboard-card-hover');
      }
    });
  });

  describe('Charts', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('[Red] should display booking trend line chart', () => {
      const charts = fixture.debugElement.queryAll(By.css('app-chart'));
      const lineChart = charts.find((c) => c.componentInstance.type() === 'line');
      expect(lineChart).toBeTruthy();
      expect(lineChart!.componentInstance.data().labels?.length).toBe(7);
    });

    it('[Red] should display service popularity doughnut chart', () => {
      const charts = fixture.debugElement.queryAll(By.css('app-chart'));
      const doughnutChart = charts.find((c) => c.componentInstance.type() === 'doughnut');
      expect(doughnutChart).toBeTruthy();
      expect(doughnutChart!.componentInstance.data().labels?.length).toBe(4);
    });
  });

  describe('Recent Bookings', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('[Red] should display recent bookings table with 5 rows', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(5);
    });

    it('[Red] should display correct columns in table header', () => {
      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const headerTexts = Array.from(headers).map((h: any) => h.textContent.trim());
      expect(headerTexts).toEqual(['Service', 'Customer', 'Date', 'Status', 'Actions']);
    });

    it('[Red] should use app-badge for status in each row', () => {
      const badges = fixture.debugElement.queryAll(By.css('app-badge'));
      expect(badges.length).toBe(5);
    });

    it('[Red] should have View buttons for each row', () => {
      const viewButtons = fixture
        .debugElement.queryAll(By.css('app-button'))
        .filter((b) => b.componentInstance.label() === 'View');
      expect(viewButtons.length).toBe(5);
    });

    it('[Red] should have "View All" link', () => {
      const link = fixture.nativeElement.querySelector('.view-all-link');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('View All');
    });
  });
});
