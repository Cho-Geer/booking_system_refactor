import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { Tooltip } from 'primeng/tooltip';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { ApiService } from '../../../../core/services/api.service';
import {
  AdminAppointment,
  AdminServiceItem,
  AppointmentStatus,
  BusinessHoursDto,
  UpdateAppointmentStatusRequest,
  CreateAdminAppointmentRequest,
} from '../../dto/admin.dto';
import { TimeSlot } from '../../../../shared/dto/time-slot.dto';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import {
  AppBadgeComponent,
  BadgeStatus,
} from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppSearchInputComponent } from '../../../../shared/components/atoms/app-search-input/app-search-input.component';
import { AppDropdownComponent } from '../../../../shared/components/atoms/app-dropdown/app-dropdown.component';
import { AppSpinnerComponent } from '../../../../shared/components/atoms/app-spinner/app-spinner.component';
import { AppFilterBarComponent } from '../../../../shared/components/molecules/app-filter-bar/app-filter-bar.component';
import { AppTableWrapperComponent } from '../../../../shared/components/molecules/app-table-wrapper/app-table-wrapper.component';
import { AppModalComponent } from '../../../../shared/components/atoms/app-modal/app-modal.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Converts a Date to a local timezone-aware 'YYYY-MM-DD' string.
 * Unlike `.toISOString().split('T')[0]`, this does NOT shift to UTC,
 * preventing date mismatches when the browser is in a positive UTC offset.
 */
export function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
    TableModule,
    ButtonModule,
    SelectModule,
    FormsModule,
    InputTextModule,
    InputNumberModule,
    MultiSelectModule,
    Textarea,
    DatePicker,
    DatePipe,
    AppCardComponent,
    AppButtonComponent,
    AppBadgeComponent,
    AppSearchInputComponent,
    AppDropdownComponent,
    AppSpinnerComponent,
    AppFilterBarComponent,
    AppTableWrapperComponent,
    AppModalComponent,
    Tooltip,
    TranslatePipe,
  ],
  templateUrl: './appointment-management.component.html',
  styleUrl: './appointment-management.component.scss',
})
export class AppointmentManagementComponent implements OnInit, OnDestroy {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);
  private readonly apiService = inject(ApiService);

  readonly vm = this.store.vm;

  // View mode
  readonly viewMode = signal<ViewMode>('list');

  // Selection for batch operations
  readonly selectedAppointments = signal<AdminAppointment[]>([]);

  // View dialog
  readonly viewDialogVisible = signal(false);
  readonly appointmentForView = signal<AdminAppointment | null>(null);

  /** Earliest selectable date: 14 days from now */
  readonly minAppointmentDate = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  });

  /** Latest selectable date: ~60 days from now (2 months) */
  readonly maxAppointmentDate = computed(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d;
  });

  // Status update dialog
  readonly statusDialogVisible = signal(false);
  readonly selectedAppointment = signal<AdminAppointment | null>(null);
  readonly statusUpdateReason = signal('');
  readonly newStatus = signal<AppointmentStatus>('PENDING');

  // Batch cancel dialog
  readonly batchCancelDialogVisible = signal(false);
  readonly batchCancelReason = signal('');

  // Filters
  readonly isFiltering = signal(false);
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

  // Stats computed from full dataset (not paginated page)
  readonly todayCount = computed(() => {
    const today = new Date();
    const todayStr = toLocalDateString(today);
    return this.vm().allAppointmentsForStats.filter((a) => a.appointmentDate.startsWith(todayStr))
      .length;
  });

  readonly pendingCount = computed(
    () => this.vm().allAppointmentsForStats.filter((a) => a.status === 'PENDING').length,
  );

  readonly confirmedCount = computed(
    () => this.vm().allAppointmentsForStats.filter((a) => a.status === 'CONFIRMED').length,
  );

  readonly cancelledCount = computed(
    () => this.vm().allAppointmentsForStats.filter((a) => a.status === 'CANCELLED').length,
  );

  readonly searchSuggestions = computed(() =>
    this.vm().allAppointmentsForStats.map((a) => ({ label: a.userName, value: a.id })),
  );

  // Calendar day headers
  readonly dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar events computed from full dataset
  readonly calendarEvents = computed<CalendarEvent[]>(() =>
    this.vm().allAppointmentsForStats.map((a) => ({
      date: new Date(a.appointmentDate),
      title: `${a.serviceName} - ${a.userName}`,
      status: a.status,
      id: a.id,
    })),
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
    const weeks: Array<
      Array<{
        day: number;
        currentMonth: boolean;
        isToday: boolean;
        hasEvents: boolean;
        events: CalendarEvent[];
      }>
    > = [];
    let week: Array<{
      day: number;
      currentMonth: boolean;
      isToday: boolean;
      hasEvents: boolean;
      events: CalendarEvent[];
    }> = [];

    // Previous month padding
    for (let i = 0; i < startPad; i++) {
      week.push({ day: 0, currentMonth: false, isToday: false, hasEvents: false, events: [] });
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const isToday = date.toDateString() === now.toDateString();
      const dayEvents = events.filter((e) => e.date.toDateString() === date.toDateString());
      week.push({
        day: d,
        currentMonth: true,
        isToday,
        hasEvents: dayEvents.length > 0,
        events: dayEvents,
      });

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

  readonly filterServiceOptions = [{ label: 'All Services', value: '' }];

  // Quick Booking dialog
  readonly bookingDialogVisible = signal(false);
  readonly formUserId = signal('');
  readonly formServiceId = signal('');
  readonly formAppointmentDate = signal<Date | undefined>(undefined);
  readonly formTimeSlotId = signal('');
  readonly formNotes = signal('');
  readonly formErrors = signal<{
    userId?: string;
    serviceId?: string;
    appointmentDate?: string;
    timeSlotId?: string;
  }>({});
  readonly customerOptions = signal<{ label: string; value: string }[]>([]);
  readonly serviceOptions = signal<{ label: string; value: string }[]>([]);
  readonly availableTimeSlots = signal<{ label: string; value: string; disabled: boolean }[]>([]);
  readonly timeSlotUnavailable = signal(false);
  readonly timeSlotLoading = signal(false);
  readonly formSubmitted = signal(false);

  // Business hours for disabled-day computation
  readonly businessHours = signal<BusinessHoursDto | null>(null);

  /** Days of the week that should be disabled (not selectable) in the date picker.
   *  0=Sunday, 1=Monday, ..., 6=Saturday
   *  Derived from business hours: any day with an empty array is a closed day. */
  readonly disabledDays = computed<number[]>(() => {
    const bh = this.businessHours();
    if (!bh) return [];
    const dayMap: Array<keyof BusinessHoursDto> = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return dayMap
      .map((key, index) => ((bh[key] as Array<unknown>).length === 0 ? index : -1))
      .filter((i): i is number => i !== -1);
  });

  /** Whether the currently selected appointment date falls on a closed day. */
  readonly businessClosedOnDate = computed<boolean>(() => {
    const date = this.formAppointmentDate();
    if (!date) return false;
    return this.disabledDays().includes(date.getDay());
  });

  /** Browser timezone label displayed above time slot dropdown */
  readonly timezoneLabel = computed(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    const formattedOffset = `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return `(${timeZone} ${formattedOffset})`;
  });

  // Raw service items with pricing for cost estimation
  readonly rawServiceItems = signal<AdminServiceItem[]>([]);
  readonly formOvertimeMinutes = signal<number>(0);
  readonly formSelectedServiceData = signal<AdminServiceItem | null>(null);

  /** Estimate total cost: pricePerMinute × (duration + overtime) × (1 + taxRate) */
  readonly estTotalCost = computed<{
    baseCost: number;
    tax: number;
    total: number;
    pricePerMinute: number;
    taxRate: number;
    totalMinutes: number;
  } | null>(() => {
    const service = this.formSelectedServiceData();
    if (!service) return null;

    const pricePerMinute = service.pricePerMinute ?? service.price / service.duration;
    const duration = service.duration;
    const overtime = this.formOvertimeMinutes();
    const totalMinutes = duration + overtime;
    const baseCost = pricePerMinute * totalMinutes;
    const taxRate = service.taxRate ?? 0;
    const tax = baseCost * (taxRate / 100);
    const total = baseCost + tax;

    return { baseCost, tax, total, pricePerMinute, taxRate, totalMinutes };
  });

  ngOnInit(): void {
    this.store.clearError();
    this.loadAppointments();
    this.loadAllAppointmentsForStats();
    this.loadCustomerOptions();
    this.loadServiceOptions();
    // Periodically refresh service options so newly created services appear without
    // reloading on dialog open (which would cause PrimeNG p-select timing issues)
    this.serviceOptionsPollInterval = interval(30000).subscribe(() => {
      this.loadServiceOptions();
    });
  }

  private serviceOptionsPollInterval?: Subscription;

  loadAppointments(isFilterOperation = false): void {
    if (isFilterOperation) {
      this.isFiltering.set(true);
    } else {
      this.store.setLoading(true);
    }
    this.adminService
      .getAdminAppointments({
        page: 1,
        limit: 10,
        status: this.filterStatus() || undefined,
        startDate: this.filterStartDate() ? toLocalDateString(this.filterStartDate()!) : undefined,
        endDate: this.filterEndDate() ? toLocalDateString(this.filterEndDate()!) : undefined,
        search: this.filterSearch() || undefined,
      })
      .subscribe({
        next: (response) => {
          this.store.setAppointments(response.items, response.meta.total, response.meta.page);
          if (isFilterOperation) {
            this.isFiltering.set(false);
          } else {
            this.store.setLoading(false);
          }
        },
        error: (err) => this.store.setError(err.message ?? 'Failed to load appointments'),
      });
  }

  private loadAllAppointmentsForStats(): void {
    this.adminService.getAdminAppointments({ limit: 999, page: 1 }).subscribe({
      next: (response) => this.store.setAllAppointmentsForStats(response.items),
      error: () => {},
    });
  }

  toggleView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  openBooking(): void {
    this.formUserId.set('');
    this.formServiceId.set('');
    this.formAppointmentDate.set(undefined);
    this.formTimeSlotId.set('');
    this.formNotes.set('');
    this.availableTimeSlots.set([]);
    this.timeSlotUnavailable.set(false);
    this.timeSlotLoading.set(false);
    this.formSubmitted.set(false);
    this.formOvertimeMinutes.set(0);
    this.formSelectedServiceData.set(null);
    this.bookingDialogVisible.set(true);

    // Fetch business hours to compute disabled days and closed-day detection
    this.adminService.getBusinessHours().subscribe({
      next: (bh) => this.businessHours.set(bh),
      error: () => {
        // If business hours fail to load, silently degrade — all days remain enabled
        this.businessHours.set(null);
      },
    });
  }

  closeBooking(): void {
    this.bookingDialogVisible.set(false);
  }

  saveBooking(): void {
    this.formSubmitted.set(true);
    const errors: {
      userId?: string;
      serviceId?: string;
      appointmentDate?: string;
      timeSlotId?: string;
    } = {};

    const userId = this.formUserId();
    const serviceId = this.formServiceId();
    const appointmentDate = this.formAppointmentDate();
    const timeSlotId = this.formTimeSlotId();

    if (!userId) errors.userId = 'Please select a customer.';
    if (!serviceId) errors.serviceId = 'Please select a service.';
    if (!appointmentDate) errors.appointmentDate = 'Please select a date.';
    if (!timeSlotId && !this.timeSlotUnavailable())
      errors.appointmentDate = 'Please select a time slot.';

    this.formErrors.set(errors);

    if (!userId || !serviceId || !appointmentDate || (!timeSlotId && !this.timeSlotUnavailable()))
      return;

    const dto: CreateAdminAppointmentRequest = {
      userId,
      serviceId,
      timeSlotId,
      appointmentDate: toLocalDateString(appointmentDate) + 'T00:00:00.000Z',
      notes: this.formNotes() || undefined,
      overtimeMinutes: this.formOvertimeMinutes() > 0 ? this.formOvertimeMinutes() : undefined,
    };

    this.store.setLoading(true);
    this.adminService.createAdminAppointment(dto).subscribe({
      next: () => {
        this.loadAppointments();
        this.loadAllAppointmentsForStats();
        this.closeBooking();
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to create appointment');
        this.store.setLoading(false);
      },
    });
  }

  private loadCustomerOptions(): void {
    this.adminService.getUsers({ limit: 999, page: 1 }).subscribe({
      next: (response) => {
        this.customerOptions.set(
          response.items.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id })),
        );
      },
      error: () => {},
    });
  }

  private loadServiceOptions(): void {
    this.adminService.getAdminServices({ limit: 999, page: 1, active: true }).subscribe({
      next: (response) => {
        this.rawServiceItems.set(response.items);
        this.serviceOptions.set(
          response.items.map((s) => ({ label: `${s.name} - $${s.price}`, value: s.id })),
        );
      },
      error: () => {},
    });
  }

  onServiceChange(serviceId: string): void {
    this.formServiceId.set(serviceId);
    this.availableTimeSlots.set([]);
    this.formTimeSlotId.set('');
    this.timeSlotUnavailable.set(false);
    this.formOvertimeMinutes.set(0);
    // Look up full service data for cost estimation
    const service = this.rawServiceItems().find((s) => s.id === serviceId) ?? null;
    this.formSelectedServiceData.set(service);
    if (serviceId) {
      this.loadAvailableTimeSlots(serviceId);
    }
  }

  onDateChange(): void {
    const serviceId = this.formServiceId();
    if (serviceId) {
      this.availableTimeSlots.set([]);
      this.formTimeSlotId.set('');
      this.loadAvailableTimeSlots(serviceId);
    }
  }

  private loadAvailableTimeSlots(serviceId: string): void {
    const selectedDate = this.formAppointmentDate();
    if (!selectedDate) {
      // No date selected yet — clear slots and wait for date pick
      this.availableTimeSlots.set([]);
      this.timeSlotUnavailable.set(false);
      this.timeSlotLoading.set(false);
      return;
    }

    const now = new Date();
    const startDate = toLocalDateString(selectedDate);
    this.timeSlotLoading.set(true);

    this.apiService.getAvailableSlots(serviceId, startDate, startDate).subscribe({
      next: (slots: TimeSlot[]) => {
        // Filter out past time slots where endTime <= now
        const futureSlots = slots.filter((s) => new Date(s.endTime) > now);
        if (futureSlots.length === 0) {
          this.timeSlotUnavailable.set(true);
          this.availableTimeSlots.set([]);
        } else {
          this.timeSlotUnavailable.set(false);
          this.availableTimeSlots.set(
            futureSlots.map((s) => ({
              label: `${this.formatTime(s.startTime)} - ${this.formatTime(s.endTime)}`,
              value: s.id,
              disabled: !s.available,
            })),
          );
        }
        this.timeSlotLoading.set(false);
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to load time slots');
        this.timeSlotLoading.set(false);
      },
    });
  }

  /** Format an ISO timestamp to 'HH:mm' string */
  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  viewAppointment(appointment: AdminAppointment): void {
    this.appointmentForView.set(appointment);
    this.viewDialogVisible.set(true);
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
        this.loadAllAppointmentsForStats();
        this.statusDialogVisible.set(false);
        this.selectedAppointment.set(null);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to update status'),
    });
  }

  openBatchCancelDialog(): void {
    this.batchCancelDialogVisible.set(true);
    this.batchCancelReason.set('');
  }

  confirmBatchCancel(): void {
    const ids = this.selectedAppointments().map((a) => a.id);
    if (ids.length === 0) return;

    const reason = this.batchCancelReason();
    this.store.setLoading(true);
    this.adminService.batchCancelAppointments({ ids, reason: reason || undefined }).subscribe({
      next: (response) => {
        // Compute successfully cancelled IDs by excluding failed ones
        const failedIdSet = new Set(response.failedIds);
        const successIds = ids.filter((id) => !failedIdSet.has(id));

        // Only remove successfully cancelled appointments from the list
        if (successIds.length > 0) {
          this.store.removeAppointmentsFromList(successIds);
        }

        this.loadAllAppointmentsForStats();
        this.selectedAppointments.set([]);
        this.batchCancelDialogVisible.set(false);
        this.store.setLoading(false);

        // Show failure summary if any failures occurred
        if (response.failedCount > 0) {
          const failedSample = response.failedIds.slice(0, 3).join(', ');
          this.store.setError(
            `${response.failedCount} appointment(s) failed to cancel (IDs: ${failedSample}${response.failedIds.length > 3 ? ', ...' : ''}). ${response.successCount} cancelled successfully.`,
          );
        }
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to batch cancel');
        this.store.setLoading(false);
      },
    });
  }

  applyFilter(): void {
    this.loadAppointments(true);
  }

  onSearchChange(value: string): void {
    this.filterSearch.set(value);
    this.applyFilter();
  }

  clearFilters(): void {
    this.filterStatus.set('');
    this.filterStartDate.set(undefined);
    this.filterEndDate.set(undefined);
    this.filterSearch.set('');
    this.loadAppointments(true);
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | undefined {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warn';
      case 'CANCELLED':
        return 'danger';
      case 'COMPLETED':
        return 'info';
      case 'EXPIRED':
        return undefined;
      default:
        return undefined;
    }
  }

  onStatusFilterChange(value: unknown): void {
    this.filterStatus.set(value as AppointmentStatus | '');
    this.applyFilter();
  }

  getStatusBadge(status: AppointmentStatus): BadgeStatus {
    switch (status) {
      case 'CONFIRMED':
        return 'confirmed';
      case 'PENDING':
        return 'pending';
      case 'CANCELLED':
        return 'cancelled';
      case 'COMPLETED':
        return 'completed';
      case 'EXPIRED':
        return 'expired';
      default:
        return 'pending';
    }
  }

  getCalendarEventColor(status: AppointmentStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return '#00B42A';
      case 'PENDING':
        return '#FF7D00';
      case 'CANCELLED':
        return '#F53F3F';
      case 'COMPLETED':
        return '#27ae60';
      case 'EXPIRED':
        return '#C9CDD4';
      default:
        return '#2ecc71';
    }
  }

  ngOnDestroy(): void {
    this.serviceOptionsPollInterval?.unsubscribe();
  }
}
