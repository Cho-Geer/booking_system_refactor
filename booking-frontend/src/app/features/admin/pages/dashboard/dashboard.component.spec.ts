jest.mock('chart.js/auto', () => {
  const mockChart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn(),
  }));
  mockChart.register = jest.fn();
  return { __esModule: true, default: mockChart };
});

// Mock MutationObserver
class MockMutationObserver {
  constructor(_callback: (mutations: MutationRecord[]) => void) {}
  observe = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'MutationObserver', {
  writable: true,
  configurable: true,
  value: MockMutationObserver,
});

// Mock HTMLCanvasElement for Chart.js in JSDOM
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminAppointment, AdminStats, AppointmentStatus, PaginatedResponse, StatCard, SystemHealth } from '../../dto/admin.dto';
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

  const sc = (value: number, change = 0, positive = true, target = 1000, progressPct = 0): StatCard => ({
    value, changePercentage: change, isPositive: positive, target, progressPercentage: progressPct,
  });

  const defaultStats: AdminStats = {
    totalBookings: sc(0),
    todayBookings: sc(0),
    pendingBookings: sc(0),
    activeUsers: sc(0),
    totalRevenue: sc(0),
    bookingTrend: [],
    servicePopularity: [],
    timeDistribution: [],
  };

  const mockStats: AdminStats = {
    totalBookings: sc(1234, 12, true, 1500, 82),
    todayBookings: sc(56, 25, true, 100, 56),
    pendingBookings: sc(12, -3, false, 50, 24),
    activeUsers: sc(789, 8, true, 1000, 79),
    totalRevenue: sc(45678.9, 15, true, 50000, 91),
    bookingTrend: [
      { date: '2026-04-26', count: 12, revenue: 600 },
      { date: '2026-04-27', count: 19, revenue: 950 },
      { date: '2026-04-28', count: 15, revenue: 750 },
      { date: '2026-04-29', count: 22, revenue: 1100 },
      { date: '2026-04-30', count: 30, revenue: 1500 },
      { date: '2026-05-01', count: 25, revenue: 1250 },
      { date: '2026-05-02', count: 18, revenue: 900 },
    ],
    servicePopularity: [
      { serviceName: 'Haircut', count: 45, percentage: 40.91 },
      { serviceName: 'Massage', count: 30, percentage: 27.27 },
      { serviceName: 'Facial', count: 20, percentage: 18.18 },
      { serviceName: 'Manicure', count: 15, percentage: 13.64 },
    ],
    timeDistribution: [
      { hour: '09:00', count: 8 },
      { hour: '10:00', count: 12 },
      { hour: '11:00', count: 15 },
      { hour: '14:00', count: 10 },
      { hour: '15:00', count: 7 },
      { hour: '16:00', count: 11 },
      { hour: '17:00', count: 9 },
      { hour: '18:00', count: 5 },
    ],
  };

  beforeEach(async () => {
    const mockSystemHealth: SystemHealth = {
      server: 'Online', database: 'Online', api: 'Online',
      lastBackup: 'Today, 02:15 AM', uptime: '99.9%',
    };

    mockAdminService = {
      getStats: jest.fn().mockReturnValue(of(defaultStats)),
      getUsers: jest.fn().mockReturnValue(of({
        items: [
          { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567890', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' },
          { id: 'u2', name: 'Bob Smith', email: 'bob@example.com', phone: '+0987654321', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-02T00:00:00Z' },
        ], total: 2, page: 1, limit: 5,
      })),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn().mockReturnValue(of({
        items: [
          { id: 'svc1', name: 'Haircut', description: 'Standard haircut service', duration: 30, price: 25, active: true, createdAt: '2026-01-01T00:00:00Z' },
          { id: 'svc2', name: 'Massage', description: 'Full body massage', duration: 60, price: 60, active: true, createdAt: '2026-01-02T00:00:00Z' },
        ], total: 2, page: 1, limit: 5,
      })),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest.fn().mockReturnValue(of({
        items: [
          { id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice Johnson', serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1', appointmentDate: '2026-05-06T14:00:00Z', status: 'CONFIRMED' as AppointmentStatus, createdAt: '2026-05-05T10:00:00Z' },
          { id: '2', appointmentNumber: 'APT-002', userId: 'u2', userName: 'Bob Smith', serviceId: 'svc2', serviceName: 'Massage', timeSlotId: 'ts2', appointmentDate: '2026-05-06T15:00:00Z', status: 'PENDING' as AppointmentStatus, createdAt: '2026-05-05T11:00:00Z' },
        ], total: 2, page: 1, limit: 5,
      })),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
      getSystemStatus: jest.fn().mockReturnValue(of(mockSystemHealth)),
      getTimeDistribution: jest.fn(),
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
    expect(component.vm().stats?.totalBookings?.value).toBe(1234);
    expect(component.vm().stats?.todayBookings?.value).toBe(56);
  });

  it('should display loading state', () => {
    store.setLoading(true);
    expect(component.vm().isLoading).toBe(true);
  });

  it('should load stats on init', () => {
    expect(mockAdminService.getStats).toHaveBeenCalled();
  });

  it('should load recent bookings on init', () => {
    expect(mockAdminService.getAdminAppointments).toHaveBeenCalledWith({ limit: 5, page: 1 });
  });

  it('should handle error when loading stats', () => {
    mockAdminService.getStats.mockReturnValue(
      throwError(() => new Error('Failed to load'))
    );
    component['loadStats']();
    expect(store.error()).toBe('Failed to load');
  });

  describe('Page Header / Welcome Card', () => {
    it('should display welcome greeting in h1', () => {
      const title = fixture.nativeElement.querySelector('app-welcome-card h1');
      expect(title.textContent).toContain('Welcome back, Admin!');
    });

    it('should display the current date in welcome card', () => {
      const welcomeEl = fixture.nativeElement.querySelector('app-welcome-card');
      expect(welcomeEl.textContent).toMatch(/[A-Za-z]+ \d+,? \d{4}/);
    });
  });

  describe('Stats Cards', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('should display 4 stat cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      expect(cards.length).toBe(4);
    });

    it('should use card-lift class on stat cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card .card-lift'));
      expect(cards.length).toBe(4);
    });

    it('should display Today\'s Bookings card with value and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      const cardEl = cards[0].nativeElement;
      expect(cardEl.textContent).toContain("Today's Bookings");
      expect(cardEl.querySelector('.pi-calendar')).toBeTruthy();
      expect(cardEl.textContent).toContain('56');
      expect(cardEl.textContent).toContain('+25%');
    });

    it('should display Pending Confirmation card with value and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      const cardEl = cards[1].nativeElement;
      expect(cardEl.textContent).toContain('Pending Confirmation');
      expect(cardEl.querySelector('.pi-clock')).toBeTruthy();
      expect(cardEl.textContent).toContain('12');
      expect(cardEl.textContent).toContain('-3%');
    });

    it('should display Total Customers card with value and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      const cardEl = cards[2].nativeElement;
      expect(cardEl.textContent).toContain('Total Customers');
      expect(cardEl.querySelector('.pi-users')).toBeTruthy();
      expect(cardEl.textContent).toContain('789');
      expect(cardEl.textContent).toContain('+8%');
    });

    it('should display Total Revenue card with value and trend', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      const cardEl = cards[3].nativeElement;
      expect(cardEl.textContent).toContain('Total Revenue');
      expect(cardEl.querySelector('.pi-dollar')).toBeTruthy();
      expect(cardEl.textContent).toContain('45,678.9');
      expect(cardEl.textContent).toContain('+15%');
    });
  });

  describe('Charts', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('should render charts-section with deferred placeholder', () => {
      const section = fixture.debugElement.query(By.css('app-charts-section'));
      expect(section).toBeTruthy();
    });
  });

  describe('Recent Bookings', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('should display recent bookings rows from API response', () => {
      const panel = fixture.nativeElement.querySelector('app-recent-bookings-panel');
      const rows = panel.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('should display correct columns in table header', () => {
      const panel = fixture.nativeElement.querySelector('app-recent-bookings-panel');
      const headers = panel.querySelectorAll('thead th');
      const headerTexts = Array.from(headers).map((h: any) => h.textContent.trim());
      expect(headerTexts).toEqual(['Customer', 'Service', 'Date', 'Status', 'Actions']);
    });

    it('should use app-badge for status in rows', () => {
      const panel = fixture.debugElement.query(By.css('app-recent-bookings-panel'));
      expect(panel.queryAll(By.css('app-badge')).length).toBeGreaterThanOrEqual(1);
    });

    it('should have View All link', () => {
      const panel = fixture.nativeElement.querySelector('app-recent-bookings-panel');
      expect(panel).toBeTruthy();
      expect(panel.textContent).toContain('View All');
    });
  });

  describe('Recent Users', () => {
    it('should load recent users on init', () => {
      expect(mockAdminService.getUsers).toHaveBeenCalledWith({ limit: 5, page: 1 });
    });

    it('should display recent users panel', () => {
      const panel = fixture.nativeElement.querySelector('app-recent-users-panel');
      expect(panel).toBeTruthy();
    });

    it('should map recent users to rows', () => {
      const rows = component.recentUsersRows();
      expect(rows.length).toBe(2);
      expect(rows[0].user.name).toBe('Alice Johnson');
      expect(rows[0].user.email).toBe('alice@example.com');
      expect(rows[0].user.role).toBe('CUSTOMER');
      expect(rows[0].initials).toBe('AJ');
    });
  });

  describe('Recent Services', () => {
    it('should load recent services on init', () => {
      expect(mockAdminService.getAdminServices).toHaveBeenCalledWith({ limit: 5, page: 1 });
    });

    it('should display recent services panel', () => {
      const panel = fixture.nativeElement.querySelector('app-recent-services-panel');
      expect(panel).toBeTruthy();
    });

    it('should map recent services to rows', () => {
      const rows = component.recentServicesRows();
      expect(rows.length).toBe(2);
      expect(rows[0].service.name).toBe('Haircut');
      expect(rows[0].service.price).toBe(25);
      expect(rows[0].service.active).toBe(true);
      expect(rows[0].statusBadge).toBe('confirmed');
    });
  });

  describe('[RED] Time Distribution Chart', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('should render charts section with deferred content', () => {
      const section = fixture.debugElement.query(By.css('app-charts-section'));
      expect(section).toBeTruthy();
    });
  });

  describe('System Status', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('should display system status panel with Server indicator', () => {
      const panel = fixture.debugElement.query(By.css('app-system-status-panel'));
      expect(panel).toBeTruthy();
      expect(panel.nativeElement.textContent).toContain('System Status');
      expect(panel.nativeElement.textContent).toContain('Server');
    });
  });

  describe('Stat Cards Labels', () => {
    beforeEach(() => {
      store.setStats(mockStats);
      fixture.detectChanges();
    });

    it('should display Pending Confirmation label', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
      expect(cards.length).toBe(4);
      const texts = cards.map(c => c.nativeElement.textContent);
      expect(texts.some(t => t.includes('Pending Confirmation'))).toBe(true);
    });
  });

  // ==========================================
  // STAFF WORKLOAD REMOVAL (v1.7.1)
  // ==========================================

  describe('[GREEN] staffWorkload removal (v1.7.1)', () => {
    it('[Green] staffWorkload is removed from AdminStats test data', () => {
      expect('staffWorkload' in defaultStats).toBe(false);
    });

    it('[Green] mockStats does not contain staffWorkload', () => {
      expect('staffWorkload' in mockStats).toBe(false);
    });
  });

  describe('[RED] Empty State — No hardcoded fallback', () => {
    it('should not contain hardcoded stat card fallback values like 24, 1254, 3245', () => {
      store.setStats(null);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('24');
      expect(compiled.textContent).not.toContain('1254');
      expect(compiled.textContent).not.toContain('3245');
    });

    it('should not contain hardcoded APT-001 fallback booking number', () => {
      store.setStats(null);
      store.setAppointments([], 0, 1);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('APT-001');
    });
  });
});
