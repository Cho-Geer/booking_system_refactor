import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import type { ChartData, ChartOptions } from 'chart.js';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AppointmentStatus } from '../../dto/admin.dto';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { AppBadgeComponent, BadgeStatus } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { AppChartComponent } from '../../../../shared/components/atoms/app-chart/app-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AppCardComponent,
    AppBadgeComponent,
    AppButtonComponent,
    AppChartComponent,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;
  readonly today = new Date();

  readonly recentBookings = computed(() => [
    { id: '1', userName: 'Alex Smith', serviceName: 'Haircut', appointmentDate: '2026-05-01T10:00:00Z', status: 'CONFIRMED' as AppointmentStatus },
    { id: '2', userName: 'Emma Johnson', serviceName: 'Manicure', appointmentDate: '2026-05-01T14:00:00Z', status: 'PENDING' as AppointmentStatus },
    { id: '3', userName: 'James Wilson', serviceName: 'Massage', appointmentDate: '2026-05-02T09:00:00Z', status: 'CONFIRMED' as AppointmentStatus },
    { id: '4', userName: 'Olivia Lee', serviceName: 'Facial', appointmentDate: '2026-05-02T11:00:00Z', status: 'CANCELLED' as AppointmentStatus },
    { id: '5', userName: 'Michael Kim', serviceName: 'Pedicure', appointmentDate: '2026-05-02T13:00:00Z', status: 'CONFIRMED' as AppointmentStatus },
  ]);

  readonly statsCards = computed(() => [
    {
      label: "Today's Bookings",
      value: vm().stats?.todayBookings ?? 24,
      icon: 'pi pi-calendar',
      iconBg: 'bg-accent-blue/10',
      iconColor: 'text-accent-blue',
      trend: '+12%',
      trendUp: true,
      progress: 75,
      target: 32,
      color: 'from-accent-blue to-accent-blue-dark',
    },
    {
      label: 'Pending Confirmation',
      value: vm().stats?.pendingBookings ?? 5,
      icon: 'pi pi-clock',
      iconBg: 'bg-accent-yellow/10',
      iconColor: 'text-accent-yellow',
      trend: '-3%',
      trendUp: false,
      progress: 30,
      target: 17,
      color: 'from-accent-yellow to-accent-orange',
    },
    {
      label: 'Total Customers',
      value: vm().stats?.activeUsers ?? 1254,
      icon: 'pi pi-users',
      iconBg: 'bg-accent-green/10',
      iconColor: 'text-accent-green',
      trend: '+8%',
      trendUp: true,
      progress: 85,
      target: 1500,
      color: 'from-accent-green to-green-700',
    },
    {
      label: 'Total Revenue',
      value: vm().stats?.totalRevenue ?? 3245,
      icon: 'pi pi-dollar',
      iconBg: 'bg-accent-purple/10',
      iconColor: 'text-accent-purple',
      trend: '+15%',
      trendUp: true,
      progress: 65,
      target: 5000,
      color: 'from-accent-purple to-purple-800',
    },
  ]);

  readonly servicePopularity = computed(() => [
    { name: 'Haircut', percentage: 35, color: 'from-accent-blue to-accent-blue-dark' },
    { name: 'Manicure', percentage: 25, color: 'from-accent-purple to-purple-800' },
    { name: 'Massage', percentage: 20, color: 'from-accent-green to-green-700' },
    { name: 'Facial', percentage: 15, color: 'from-accent-yellow to-accent-orange' },
    { name: 'Pedicure', percentage: 5, color: 'from-accent-red to-red-700' },
  ]);

  readonly staffWorkload = computed(() => [
    { name: 'Sarah Johnson', initials: 'SJ', percentage: 85, color: 'from-accent-blue to-accent-blue-dark' },
    { name: 'David Brown', initials: 'DB', percentage: 65, color: 'from-accent-purple to-purple-800' },
    { name: 'Maria Lee', initials: 'ML', percentage: 90, color: 'from-accent-green to-green-700' },
    { name: 'Robert Taylor', initials: 'RT', percentage: 45, color: 'from-accent-yellow to-accent-orange' },
  ]);

  readonly systemStatus = computed(() => [
    { label: 'Server', status: 'Online' as const, color: 'text-accent-green' },
    { label: 'Database', status: 'Online' as const, color: 'text-accent-green' },
    { label: 'API', status: 'Online' as const, color: 'text-accent-green' },
    { label: 'Last Backup', status: 'Today, 02:15 AM' as const, color: 'text-text-secondary' },
    { label: 'Uptime', status: '99.9%' as const, color: 'text-text-secondary' },
  ]);

  readonly hasBookingTrendData = computed(() => {
    const trend = this.vm().stats?.bookingTrend;
    return trend && trend.length > 0;
  });

  readonly hasServicePopularityData = computed(() => {
    const pop = this.vm().stats?.servicePopularity;
    return pop && pop.length > 0;
  });

  readonly bookingTrendChartData = computed<ChartData>(() => {
    const trend = this.vm().stats?.bookingTrend ?? [];
    return {
      labels: trend.length > 0
        ? trend.map((t) => {
            const date = new Date(t.date);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
          })
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Bookings',
          data: trend.length > 0 ? trend.map((t) => t.count) : [12, 19, 15, 17, 22, 24, 20],
          borderColor: '#00c6ff',
          backgroundColor: (context: unknown) => {
            const ctx = (context as any).chart;
            const { ctx: canvasCtx, chartArea } = ctx;
            if (!chartArea) return 'rgba(0, 198, 255, 0.1)';
            const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(0, 198, 255, 0.05)');
            gradient.addColorStop(1, 'rgba(0, 198, 255, 0.35)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#00c6ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
        {
          label: 'Revenue ($)',
          data: trend.length > 0 ? [] : [350, 420, 380, 400, 520, 580, 490],
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#2ecc71',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          yAxisID: 'y1',
        },
      ],
    };
  });

  readonly bookingTrendChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, color: '#94a3b8' } },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(22, 32, 50, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(42, 58, 80, 0.5)',
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(42, 58, 80, 0.2)' }, ticks: { color: '#94a3b8' } },
      y: { beginAtZero: true, grid: { color: 'rgba(42, 58, 80, 0.2)' }, ticks: { color: '#94a3b8' } },
      y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { color: '#94a3b8', callback: (val: any) => '$' + val } },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  };

  readonly servicePopularityChartData = computed<ChartData>(() => {
    const pop = this.vm().stats?.servicePopularity ?? [];
    return {
      labels: pop.length > 0 ? pop.map((p) => p.serviceName) : ['Haircut', 'Manicure', 'Massage', 'Facial', 'Pedicure'],
      datasets: [
        {
          data: pop.length > 0 ? pop.map((p) => p.count) : [35, 25, 20, 15, 5],
          backgroundColor: ['#00c6ff', '#9b59b6', '#2ecc71', '#f39c12', '#e74c3c'],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  });

  readonly servicePopularityChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, color: '#94a3b8', padding: 15 } },
      tooltip: {
        backgroundColor: 'rgba(22, 32, 50, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(42, 58, 80, 0.5)',
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
      },
    },
    cutout: '70%',
  };

  readonly timeDistributionChartData: ChartData = {
    labels: ['9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5'],
    datasets: [{
      label: 'Bookings',
      data: [8, 12, 15, 10, 7, 11, 9, 5],
      backgroundColor: 'rgba(0, 198, 255, 0.7)',
      borderColor: '#00c6ff',
      borderWidth: 1,
      borderRadius: 0,
      barThickness: 12,
    }],
  };

  readonly timeDistributionChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(22, 32, 50, 0.9)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: 'rgba(42, 58, 80, 0.5)', borderWidth: 1, padding: 10, usePointStyle: true } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(42, 58, 80, 0.2)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
    },
  };

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getInitialsBg(name: string): string {
    const colors = ['bg-accent-blue/20 text-accent-blue', 'bg-accent-purple/20 text-accent-purple', 'bg-accent-green/20 text-accent-green', 'bg-accent-yellow/20 text-accent-yellow', 'bg-accent-teal/20 text-accent-teal'];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  mapStatus(status: AppointmentStatus): BadgeStatus {
    return status.toLowerCase() as BadgeStatus;
  }

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.store.setLoading(true);
    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.store.setStats(stats);
        this.store.setLoading(false);
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to load stats');
      },
    });
  }
}
