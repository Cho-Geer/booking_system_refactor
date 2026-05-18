import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ApiService } from '../../../../core/services/api.service';
import { AdminUser, AdminServiceItem } from '../../dto/admin.dto';
import { TimeSlot } from '../../../../shared/dto/time-slot.dto';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-quick-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AppButtonComponent, TranslatePipe],
  templateUrl: './quick-booking-form.component.html',
  styles: [':host { display: block; }'],
})
export class QuickBookingFormComponent implements OnInit {
  private adminService = inject(AdminService);
  private apiService = inject(ApiService);

  readonly users = signal<AdminUser[]>([]);
  readonly services = signal<AdminServiceItem[]>([]);
  readonly timeSlots = signal<TimeSlot[]>([]);

  readonly selectedUser = signal<string | null>(null);
  readonly selectedService = signal<string | null>(null);
  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly selectedSlot = signal<string | null>(null);
  readonly notes = signal('');
  readonly overtimeMinutes = signal(0);

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUsers();
    this.loadServices();
  }

  onSubmit(): void {
    const userId = this.selectedUser();
    const serviceId = this.selectedService();
    const slotId = this.selectedSlot();
    const date = this.selectedDate();

    if (!userId || !serviceId || !slotId) return;

    this.isSubmitting.set(true);
    this.error.set(null);
    this.success.set(null);

    this.adminService
      .createAdminAppointment({
        userId,
        serviceId,
        appointmentDate: date,
        timeSlotId: slotId,
        notes: this.notes() || undefined,
        overtimeMinutes: this.overtimeMinutes() > 0 ? this.overtimeMinutes() : undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.success.set('Booking created successfully!');
          this.resetForm();
          this.loadServices(); // Refresh service list so newly created services appear
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.set(err.message ?? 'Failed to create booking');
        },
      });
  }

  loadSlots(): void {
    const serviceId = this.selectedService();
    const date = this.selectedDate();
    if (!serviceId || !date) return;
    this.apiService
      .getAvailableSlots(serviceId, date, date, this.overtimeMinutes() || undefined)
      .subscribe({
        next: (slots) => this.timeSlots.set(slots),
        error: () => this.timeSlots.set([]),
      });
  }

  private resetForm(): void {
    this.selectedUser.set(null);
    this.selectedSlot.set(null);
    this.notes.set('');
    this.overtimeMinutes.set(0);
  }

  private loadUsers(): void {
    this.adminService.getUsers({ limit: 100, page: 1 }).subscribe({
      next: (result) => this.users.set(result.items),
    });
  }

  private loadServices(): void {
    this.adminService.getAdminServices({ limit: 100, page: 1, active: true }).subscribe({
      next: (result) => this.services.set(result.items),
    });
  }
}
