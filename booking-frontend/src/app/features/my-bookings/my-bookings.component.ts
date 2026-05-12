import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../stores/auth/auth.store';
import { AppBadgeComponent, BadgeStatus } from '../../shared/components/atoms/app-badge/app-badge.component';
import { AppEmptyStateComponent } from '../../shared/components/atoms/app-empty-state/app-empty-state.component';
import { AppCardComponent } from '../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../shared/components/atoms/app-button/app-button.component';
import { AppModalComponent } from '../../shared/components/atoms/app-modal/app-modal.component';

export type PullToRefreshState = 'idle' | 'pulling' | 'refreshing';

export interface AppointmentListItem {
  id: string;
  timeSlotId: string;
  appointmentDate: string;
  status: string;
  serviceName: string;
  timeSlotStart: string;
  timeSlotEnd: string;
}

type FilterValue = 'all' | string;

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [
    CommonModule,
    AppBadgeComponent,
    AppEmptyStateComponent,
    AppCardComponent,
    AppButtonComponent,
    AppModalComponent,
  ],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss',
})
export class MyBookingsComponent implements OnInit {
  private api = inject(ApiService);
  private authStore = inject(AuthStore);

  appointments = signal<AppointmentListItem[]>([]);
  activeFilter = signal<FilterValue>('all');
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  // Pull-to-refresh state
  pullToRefreshState = signal<PullToRefreshState>('idle');
  pullProgress = signal(0);
  private touchStartY = 0;
  private touchCurrentY = 0;
  private readonly PULL_THRESHOLD = 80; // px

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (window.scrollY === 0) {
      this.touchStartY = event.touches[0].clientY;
      this.touchCurrentY = this.touchStartY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (this.pullToRefreshState() === 'refreshing') return;
    if (window.scrollY > 0) {
      this.pullToRefreshState.set('idle');
      this.pullProgress.set(0);
      return;
    }

    this.touchCurrentY = event.touches[0].clientY;
    const diff = this.touchCurrentY - this.touchStartY;

    if (diff > 0) {
      this.pullToRefreshState.set('pulling');
      // Exponential decay for realistic pulling feel
      const progress = Math.min(diff * 0.5, this.PULL_THRESHOLD);
      this.pullProgress.set(progress);
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(_event: TouchEvent): void {
    if (this.pullToRefreshState() === 'refreshing') return;

    const diff = this.touchCurrentY - this.touchStartY;
    if (diff >= this.PULL_THRESHOLD) {
      this.triggerRefresh();
    } else {
      this.pullToRefreshState.set('idle');
      this.pullProgress.set(0);
    }
  }

  triggerRefresh(): void {
    this.pullToRefreshState.set('refreshing');
    this.pullProgress.set(0);
    this.loadAppointments();
  }

  // Cancel dialog state
  showCancelDialog = signal(false);
  cancellingId = signal<string | null>(null);
  isCancelling = signal(false);

  // Expose store signals
  storeLoading = this.authStore.isLoading;

  readonly FILTER_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'PENDING', label: '待确认' },
    { value: 'CONFIRMED', label: '已确认' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'EXPIRED', label: '已过期' },
    { value: 'CANCELLED', label: '已取消' },
  ] as const;

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.api.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.isLoading.set(false);
        this.pullToRefreshState.set('idle');
        this.pullProgress.set(0);
      },
      error: (err) => {
        this.loadError.set(err.message || 'Failed to load appointments');
        this.isLoading.set(false);
        this.pullToRefreshState.set('idle');
        this.pullProgress.set(0);
      },
    });
  }

  filteredAppointments = computed(() => {
    const all = this.appointments();
    if (this.activeFilter() === 'all') return all;
    return all.filter((a) => a.status === this.activeFilter());
  });

  // Keyboard handler for filter tabs
  onFilterKeydown(event: KeyboardEvent, filter: FilterValue): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setFilter(filter);
    }
  }

  setFilter(filter: FilterValue): void {
    this.activeFilter.set(filter);
  }

  getFilterCount(filter: FilterValue): number {
    if (filter === 'all') return this.appointments().length;
    return this.appointments().filter((a) => a.status === filter).length;
  }

  // Cancel flow
  requestCancel(bookingId: string): void {
    this.showCancelDialog.set(true);
    this.cancellingId.set(bookingId);
  }

  onCancelDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.dismissCancel();
    }
  }

  dismissCancel(): void {
    this.showCancelDialog.set(false);
    this.cancellingId.set(null);
  }

  confirmCancel(): void {
    const id = this.cancellingId();
    if (!id) return;

    this.isCancelling.set(true);
    this.api.cancelBooking(id).subscribe({
      next: () => {
        this.appointments.update((list) => list.filter((a) => a.id !== id));
        this.showCancelDialog.set(false);
        this.cancellingId.set(null);
        this.isCancelling.set(false);
      },
      error: () => {
        this.loadError.set('Failed to cancel booking. Please try again.');
        this.showCancelDialog.set(false);
        this.cancellingId.set(null);
        this.isCancelling.set(false);
      },
    });
  }

  toBadgeStatus(status: string): BadgeStatus {
    switch (status) {
      case 'PENDING': return 'pending';
      case 'CONFIRMED': return 'confirmed';
      case 'COMPLETED': return 'completed';
      case 'CANCELLED': return 'cancelled';
      case 'EXPIRED': return 'expired';
      default: return 'pending';
    }
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  }

  formatTimeRange(start: string, end: string): string {
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  }

  formatPrice(_serviceName: string): string {
    return '';
  }
}
