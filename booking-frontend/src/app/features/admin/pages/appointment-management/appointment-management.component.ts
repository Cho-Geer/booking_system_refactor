import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { Tooltip } from 'primeng/tooltip';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import {
  AdminAppointment,
  AppointmentStatus,
  UpdateAppointmentStatusRequest,
} from '../../dto/admin.dto';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { AppBadgeComponent, BadgeStatus } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppInputComponent } from '../../../../shared/components/atoms/app-input/app-input.component';
import { AppDropdownComponent } from '../../../../shared/components/atoms/app-dropdown/app-dropdown.component';
import { AppSpinnerComponent } from '../../../../shared/components/atoms/app-spinner/app-spinner.component';

export type ViewMode = 'list' | 'calendar';

export interface CalendarEvent {
  date: Date;
  title: string;
  status: AppointmentStatus;
  id: string;
}

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [
    TableModule, Dialog, ButtonModule, SelectModule, FormsModule,
    InputTextModule, DatePicker, DatePipe,
    AppCardComponent, AppButtonComponent, AppBadgeComponent,
    AppInputComponent, AppDropdownComponent, AppSpinnerComponent, Tooltip,
  ],
  templateUrl: './appointment-management.component.html',
  styleUrl: './appointment-management.component.scss',
})
export class AppointmentManagementComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;

  // View mode
  readonly viewMode = signal<ViewMode>('list');

  // Selection for batch operations
  readonly selectedAppointments = signal<AdminAppointment[]>([]);

  // Status update dialog
  readonly statusDialogVisible = signal(false);
  readonly selectedAppointment = signal<AdminAppointment | null>(null);
  readonly statusUpdateReason = signal('');
  readonly newStatus = signal<AppointmentStatus>('PENDING');

  // Filters
  readonly filterStatus = signal<AppointmentStatus | ''>('');
  readonly filterStartDate = signal<Date | undefined>(undefined);
  readonly filterEndDate = signal<Date | undefined>(undefined);
  readonly filterSearch = signal('');

  readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' as AppointmentStatus },
    { label: 'Confirmed', value: 'CONFIRMED' as AppointmentStatus },
    { label: 'Cancelled', value: 'CANCELLED' as AppointmentStatus },
    { label: 'Completed', value: 'COMPLETED' as AppointmentStatus },
    { label: 'Expired', value: 'EXPIRED' as AppointmentStatus },
  ];

  readonly updateStatusOptions = [
    { label: 'Pending', value: 'PENDING' as AppointmentStatus },
    { label: 'Confirmed', value: 'CONFIRMED' as AppointmentStatus },
    { label: 'Cancelled', value: 'CANCELLED' as AppointmentStatus },
    { label: 'Completed', value: 'COMPLETED' as AppointmentStatus },
    { label: 'Expired', value: 'EXPIRED' as AppointmentStatus },
  ];

  // Stats computed from appointments list
  readonly todayCount = computed(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return this.vm().appointments.filter(a => a.appointmentDate.startsWith(todayStr)).length;
  });

  readonly pendingCount = computed(() =>
    this.vm().appointments.filter(a => a.status === 'PENDING').length
  );

  readonly confirmedCount = computed(() =>
    this.vm().appointments.filter(a => a.status === 'CONFIRMED').length
  );

  readonly cancelledCount = computed(() =>
    this.vm().appointments.filter(a => a.status === 'CANCELLED').length
  );

  // Calendar events computed from appointments
  readonly calendarEvents = computed<CalendarEvent[]>(() =>
    this.vm().appointments.map(a => ({
      date: new Date(a.appointmentDate),
      title: `${a.serviceName} - ${a.userName}`,
      status: a.status,
      id: a.id,
    }))
  );

  // Calendar weeks structure for rendering
  readonly calendarWeeks = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const events = this.calendarEvents();
    const weeks: Array<Array<{ day: number; currentMonth: boolean; isToday: boolean; hasEvents: boolean; events: CalendarEvent[] }>> = [];
    let week: Array<{ day: number; currentMonth: boolean; isToday: boolean; hasEvents: boolean; events: CalendarEvent[] }> = [];

    // Previous month padding
    for (let i = 0; i < startPad; i++) {
      week.push({ day: 0, currentMonth: false, isToday: false, hasEvents: false, events: [] });
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const isToday = date.toDateString() === now.toDateString();
      const dayEvents = events.filter(e => e.date.toDateString() === date.toDateString());
      week.push({ day: d, currentMonth: true, isToday, hasEvents: dayEvents.length > 0, events: dayEvents });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // Remaining padding
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ day: 0, currentMonth: false, isToday: false, hasEvents: false, events: [] });
      }
      weeks.push(week);
    }

    return weeks;
  });

  readonly filterServiceOptions = [
    { label: 'All Services', value: '' },
  ];

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.store.setLoading(true);
    this.adminService.getAdminAppointments({
      page: 1,
      limit: 10,
      status: this.filterStatus() || undefined,
      startDate: this.filterStartDate()?.toISOString().split('T')[0],
      endDate: this.filterEndDate()?.toISOString().split('T')[0],
    }).subscribe({
      next: (response) => {
        this.store.setAppointments(response.items, response.total, response.page);
        this.store.setLoading(false);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to load appointments'),
    });
  }

  toggleView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  openStatusDialog(appointment: AdminAppointment): void {
    this.selectedAppointment.set(appointment);
    this.newStatus.set(appointment.status);
    this.statusUpdateReason.set('');
    this.statusDialogVisible.set(true);
  }

  updateStatus(): void {
    if (!this.selectedAppointment()) return;
    const dto: UpdateAppointmentStatusRequest = {
      status: this.newStatus(),
      reason: this.statusUpdateReason() || undefined,
    };
    this.adminService.updateAppointmentStatus(this.selectedAppointment()!.id, dto).subscribe({
      next: () => {
        this.store.updateAppointmentStatusInList(this.selectedAppointment()!.id, dto.status);
        this.statusDialogVisible.set(false);
        this.selectedAppointment.set(null);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to update status'),
    });
  }

  batchCancel(): void {
    const ids = this.selectedAppointments().map(a => a.id);
    if (ids.length === 0) return;

    this.store.setLoading(true);
    this.adminService.batchCancelAppointments({ ids, reason: 'Admin batch cancel' }).subscribe({
      next: () => {
        this.store.removeAppointmentsFromList(ids);
        this.selectedAppointments.set([]);
        this.store.setLoading(false);
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to batch cancel');
        this.store.setLoading(false);
      },
    });
  }

  applyFilter(): void {
    this.loadAppointments();
  }

  clearFilters(): void {
    this.filterStatus.set('');
    this.filterStartDate.set(undefined);
    this.filterEndDate.set(undefined);
    this.filterSearch.set('');
    this.loadAppointments();
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | undefined {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'PENDING': return 'warn';
      case 'CANCELLED': return 'danger';
      case 'COMPLETED': return 'info';
      case 'EXPIRED': return undefined;
      default: return undefined;
    }
  }

  onStatusFilterChange(value: unknown): void {
    this.filterStatus.set(value as AppointmentStatus | '');
    this.applyFilter();
  }

  getStatusBadge(status: AppointmentStatus): BadgeStatus {
    switch (status) {
      case 'CONFIRMED': return 'confirmed';
      case 'PENDING': return 'pending';
      case 'CANCELLED': return 'cancelled';
      case 'COMPLETED': return 'completed';
      case 'EXPIRED': return 'expired';
      default: return 'pending';
    }
  }

  getCalendarEventColor(status: AppointmentStatus): string {
    switch (status) {
      case 'CONFIRMED': return '#00B42A';
      case 'PENDING': return '#FF7D00';
      case 'CANCELLED': return '#F53F3F';
      case 'COMPLETED': return '#1677FF';
      case 'EXPIRED': return '#C9CDD4';
      default: return '#667eea';
    }
  }
}
