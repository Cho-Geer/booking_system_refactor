import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import {
  AdminAppointment,
  AppointmentStatus,
  UpdateAppointmentStatusRequest,
} from '../../dto/admin.dto';

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [
    TableModule, Dialog, ButtonModule, SelectModule, FormsModule,
    Tag, InputTextModule, DatePicker, DatePipe,
  ],
  templateUrl: './appointment-management.component.html',
  styleUrl: './appointment-management.component.scss',
})
export class AppointmentManagementComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;

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
    { label: 'Pending', value: 'PENDING' as AppointmentStatus },
    { label: 'Confirmed', value: 'CONFIRMED' as AppointmentStatus },
    { label: 'Cancelled', value: 'CANCELLED' as AppointmentStatus },
    { label: 'Completed', value: 'COMPLETED' as AppointmentStatus },
    { label: 'Expired', value: 'EXPIRED' as AppointmentStatus },
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
}
