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
    {
      id: '1',
      appointmentNumber: 'A001',
      userId: 'u1',
      userName: 'Alice Johnson',
      serviceId: 's1',
      serviceName: 'Haircut',
      timeSlotId: 't1',
      appointmentDate: '2026-05-01T10:00:00Z',
      status: 'CONFIRMED' as AppointmentStatus,
      createdAt: '2026-04-30T08:00:00Z',
    },
    {
      id: '2',
      appointmentNumber: 'A002',
      userId: 'u2',
      userName: 'Bob Smith',
      serviceId: 's2',
      serviceName: 'Massage',
      timeSlotId: 't2',
      appointmentDate: '2026-05-01T14:00:00Z',
      status: 'PENDING' as AppointmentStatus,
      createdAt: '2026-04-30T09:00:00Z',
    },
    {
      id: '3',
      appointmentNumber: 'A003',
      userId: 'u3',
      userName: 'Carol White',
      serviceId: 's3',
      serviceName: 'Facial',
      timeSlotId: 't3',
      appointmentDate: '2026-05-02T09:00:00Z',
      status: 'COMPLETED' as AppointmentStatus,
      createdAt: '2026-04-29T10:00:00Z',
    },
    {
      id: '4',
      appointmentNumber: 'A004',
      userId: 'u4',
      userName: 'David Brown',
      serviceId: 's1',
      serviceName: 'Haircut',
      timeSlotId: 't4',
      appointmentDate: '2026-05-02T11:00:00Z',
      status: 'CANCELLED' as AppointmentStatus,
      createdAt: '2026-04-28T11:00:00Z',
    },
    {
      id: '5',
      appointmentNumber: 'A005',
      userId: 'u5',
      userName: 'Emma Davis',
      serviceId: 's4',
      serviceName: 'Manicure',
      timeSlotId: 't5',
      appointmentDate: '2026-05-02T13:00:00Z',
      status: 'CONFIRMED' as AppointmentStatus,
      createdAt: '2026-04-27T12:00:00Z',
    },
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
      labels: trend.map((t) => {
        const date = new Date(t.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }),
      datasets: [
        {
          label: 'Bookings',
          data: trend.map((t) => t.count),
          borderColor: '#667eea',
          backgroundColor: (context: unknown) => {
            const ctx = (context as any).chart;
            const { ctx: canvasCtx, chartArea } = ctx;
            if (!chartArea) {
              return 'rgba(102, 126, 234, 0.1)';
            }
            const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(102, 126, 234, 0.05)');
            gradient.addColorStop(1, 'rgba(102, 126, 234, 0.35)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#667eea',
          pointBorderWidth: 2,
        },
      ],
    };
  });

  readonly bookingTrendChartOptions: ChartOptions = {
    plugins: {
      legend: { display: false },
    },
  };

  readonly servicePopularityChartData = computed<ChartData>(() => {
    const pop = this.vm().stats?.servicePopularity ?? [];
    return {
      labels: pop.map((p) => p.serviceName),
      datasets: [
        {
          data: pop.map((p) => p.count),
          backgroundColor: [
            '#667eea',
            '#00B42A',
            '#FF7D00',
            '#F53F3F',
            '#1677FF',
            '#764ba2',
          ],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  });

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
