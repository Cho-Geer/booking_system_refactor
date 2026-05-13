import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminAppointmentsQuery, AppointmentStatus, StatCard, SystemHealthDetail, TimeRange, TimeRangeSelection, BookingTableRow, RecentUserRow, RecentServiceRow } from '../../dto/admin.dto';
import { getInitials, getInitialsBg, mapStatus } from '../../shared/admin-utils';
import { buildBookingTrendChartData, BOOKING_TREND_CHART_OPTIONS, buildServicePopularityChartData, DOUGHNUT_CHART_OPTIONS, buildTimeDistributionChartData, BAR_CHART_OPTIONS } from '../../shared/dashboard-chart-factories';
import { WelcomeCardComponent } from '../../organisms/welcome-card/welcome-card.component';
import { NotificationBellComponent } from '../../molecules/notification-bell/notification-bell.component';
import { StatsCardsRowComponent } from '../../organisms/stats-cards-row/stats-cards-row.component';
import { ChartsSectionComponent } from '../../organisms/charts-section/charts-section.component';
import { RecentBookingsPanelComponent } from '../../organisms/recent-bookings-panel/recent-bookings-panel.component';
import { RecentUsersPanelComponent } from '../../organisms/recent-users-panel/recent-users-panel.component';
import { RecentServicesPanelComponent } from '../../organisms/recent-services-panel/recent-services-panel.component';
import { SystemStatusPanelComponent } from '../../organisms/system-status-panel/system-status-panel.component';
import { SocketService, AppointmentStatusEvent, SystemHealthEvent } from '../../../../core/services/socket.service';
import { Subscription, interval, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    WelcomeCardComponent, NotificationBellComponent, StatsCardsRowComponent, ChartsSectionComponent,
    RecentBookingsPanelComponent, RecentUsersPanelComponent, RecentServicesPanelComponent, SystemStatusPanelComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);
  private readonly socketService = inject(SocketService);
  private healthSubscription?: Subscription;
  private appointmentSubscription?: Subscription;
  private pollInterval?: Subscription;

  readonly vm = this.store.vm;
  readonly systemMetrics = signal<SystemHealthDetail | null>(null);
  readonly timeRange = signal<TimeRange>('last30d');
  readonly today = new Date();

  readonly statsCards = computed(() => {
    const s = this.vm().stats;
    const todaySC = s?.todayBookings;
    const pendingSC = s?.pendingBookings;
    const activeSC = s?.activeUsers;
    const revenueSC = s?.totalRevenue;
    if (!s) return [];
    return [
      { label: "Today's Bookings", value: todaySC?.value ?? 0, icon: 'pi pi-calendar', iconBg: 'bg-accent-green/10', iconColor: 'text-accent-green', ...this.formatTrend(todaySC, '0%', true), progress: todaySC?.progressPercentage ?? 0, target: todaySC?.target ?? 0, color: 'from-accent-green to-accent-green-dark' },
      { label: 'Pending Confirmation', value: pendingSC?.value ?? 0, icon: 'pi pi-clock', iconBg: 'bg-accent-yellow/10', iconColor: 'text-accent-yellow', ...this.formatTrend(pendingSC, '0%', false), progress: pendingSC?.progressPercentage ?? 0, target: pendingSC?.target ?? 0, color: 'from-accent-yellow to-accent-orange' },
      { label: 'Total Customers', value: activeSC?.value ?? 0, icon: 'pi pi-users', iconBg: 'bg-accent-green/10', iconColor: 'text-accent-green', ...this.formatTrend(activeSC, '0%', true), progress: activeSC?.progressPercentage ?? 0, target: activeSC?.target ?? 0, color: 'from-accent-green to-green-700' },
      { label: 'Total Revenue', value: revenueSC?.value ?? 0, icon: 'pi pi-dollar', iconBg: 'bg-accent-purple/10', iconColor: 'text-accent-purple', ...this.formatTrend(revenueSC, '0%', true), progress: revenueSC?.progressPercentage ?? 0, target: revenueSC?.target ?? 0, color: 'from-accent-purple to-purple-800' },
    ];
  });

  readonly bookingTrendChartData = computed(() => {
    const bt = this.store.bookingTrend()?.length ? this.store.bookingTrend() : this.store.stats()?.bookingTrend ?? [];
    return buildBookingTrendChartData(bt);
  });
  readonly bookingTrendChartOptions = BOOKING_TREND_CHART_OPTIONS;
  readonly servicePopularityChartData = computed(() => {
    const sp = this.store.servicePopularity()?.length ? this.store.servicePopularity() : this.store.stats()?.servicePopularity ?? [];
    return buildServicePopularityChartData(sp);
  });
  readonly doughnutOptions = DOUGHNUT_CHART_OPTIONS;
  readonly timeDistributionChartData = computed(() => {
    const td = this.store.timeDistribution()?.length ? this.store.timeDistribution() : this.store.stats()?.timeDistribution ?? [];
    return buildTimeDistributionChartData(td);
  });
  readonly barOptions = BAR_CHART_OPTIONS;

  readonly systemStatus = computed(() => {
    const h = this.vm().systemHealth;
    if (!h) return [];
    return [
      { label: 'Server', status: h.server, color: h.server === 'Online' ? 'text-accent-green' : 'text-accent-red' },
      { label: 'Database', status: h.database, color: h.database === 'Online' ? 'text-accent-green' : 'text-accent-red' },
      { label: 'API', status: h.api, color: h.api === 'Online' ? 'text-accent-green' : 'text-accent-red' },
      { label: 'Redis', status: h.redis, color: h.redis === 'Online' ? 'text-accent-green' : 'text-accent-red' },
      { label: 'Last Backup', status: h.lastBackup, color: 'text-text-secondary' },
      { label: 'Uptime', status: h.uptime, color: 'text-text-secondary' },
    ];
  });

  readonly recentBookings = computed(() => {
    const appts = this.vm().appointments;
    return appts?.length ? appts.slice(0, 5) : [];
  });

  readonly bookingRows = computed<BookingTableRow[]>(() =>
    this.recentBookings().map(b => ({ booking: b, initials: getInitials(b.userName), initialsBg: getInitialsBg(b.userName), statusBadge: mapStatus(b.status) }))
  );

  readonly recentUsersRows = computed<RecentUserRow[]>(() =>
    (this.vm().recentUsers ?? []).map(u => ({
      user: u,
      initials: getInitials(u.name),
      initialsBg: getInitialsBg(u.name),
      roleBadge: u.role === 'CUSTOMER' ? 'confirmed' : 'pending',
    }))
  );

  readonly recentServicesRows = computed<RecentServiceRow[]>(() =>
    (this.vm().recentServices ?? []).map(s => ({
      service: s,
      statusBadge: s.active ? 'confirmed' : 'cancelled',
    }))
  );

  ngOnInit(): void {
    this.store.clearError();
    this.loadStats(this.timeRange());
    this.loadSystemStatus();
    this.loadRecentBookings();
    this.loadRecentUsers();
    this.loadRecentServices();
    this.store.loadBookingTrend(this.timeRange());
    this.store.loadUnreadCount();
    this.setupHealthAutoRefresh();
    this.socketService.joinAdminRoom();
    this.setupAppointmentAutoRefresh();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  onTimeRangeChange(selection: TimeRangeSelection): void {
    this.timeRange.set(selection.timeRange);
    this.store.loadDistributionByTimeRange(selection.timeRange, selection.startDate, selection.endDate);
  }

  onPeriodChange(period: 'weekly' | 'monthly' | 'yearly'): void {
    const rangeMap: Record<string, TimeRange> = { weekly: 'last7d', monthly: 'last30d', yearly: 'lastMonth' };
    this.store.loadBookingTrend(rangeMap[period]);
  }

  ngOnDestroy(): void {
    this.healthSubscription?.unsubscribe();
    this.appointmentSubscription?.unsubscribe();
    this.pollInterval?.unsubscribe();
  }

  async onExpandSystemStatus(): Promise<void> {
    try {
      const metrics = await lastValueFrom(this.adminService.getSystemMetrics());
      this.systemMetrics.set(metrics);
    } catch (err) {
      this.systemMetrics.set(null);
    }
  }

  private formatTrend(sc: StatCard | undefined, fallback: string, fallbackUp: boolean): { trend: string; trendUp: boolean } {
    if (!sc) return { trend: fallback, trendUp: fallbackUp };
    const sign = sc.isPositive ? '+' : '';
    return { trend: `${sign}${sc.changePercentage}%`, trendUp: sc.isPositive };
  }

  private loadRecentBookings(): void {
    this.adminService.getAdminAppointments({ limit: 5, page: 1 }).subscribe({
      next: response => this.store.setAppointments(response.items, response.meta.total, response.meta.page),
      error: () => {},
    });
  }

  private loadRecentUsers(): void {
    this.adminService.getUsers({ limit: 5, page: 1 }).subscribe({
      next: response => this.store.setRecentUsers(response.items),
      error: () => {},
    });
  }

  private loadRecentServices(): void {
    this.adminService.getAdminServices({ limit: 5, page: 1 }).subscribe({
      next: response => this.store.setRecentServices(response.items),
      error: () => {},
    });
  }

  private loadStats(timeRange?: TimeRange): void {
    this.store.setLoading(true);
    this.adminService.getStats(timeRange).subscribe({
      next: stats => { this.store.setStats(stats); this.store.setLoading(false); },
      error: err => { this.store.setError(err.message ?? 'Failed to load stats'); },
    });
  }

  private loadSystemStatus(): void {
    this.adminService.getSystemStatus().subscribe({
      next: health => { this.store.setSystemHealth(health); },
      error: () => {},
    });
  }

  private setupHealthAutoRefresh(): void {
    // WebSocket push (primary)
    this.healthSubscription = this.socketService.subscribeToSystemHealthUpdates().subscribe({
      next: (event: SystemHealthEvent) => {
        this.store.setSystemHealth(event);
      },
      error: () => {
        // Fallback to polling on WebSocket error
        this.startPolling();
      },
    });

    // Polling fallback (every 60s)
    this.startPolling();
  }

  private setupAppointmentAutoRefresh(): void {
    this.appointmentSubscription = this.socketService.subscribeToAppointmentStatusChanges().subscribe(() => {
      this.loadStats(this.timeRange());
      this.loadRecentBookings();
      this.loadRecentUsers();
      this.loadRecentServices();
    });
  }

  private startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = interval(60000).subscribe(() => {
      this.loadSystemStatus();
    });
  }
}
