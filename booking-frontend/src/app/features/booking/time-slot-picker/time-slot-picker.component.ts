import { Component, inject, OnInit, DestroyRef, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingStore } from '../../../stores/booking/booking.store';
import { TimeSlot } from '../../../shared/dto/time-slot.dto';
import { BookingService } from '../booking.service';
import { ApiService } from '../../../core/services/api.service';
import { SocketService, SlotUpdateEvent } from '../../../core/services/socket.service';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { AppEmptyStateComponent } from '../../../shared/components/atoms/app-empty-state/app-empty-state.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DatePicker } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';

export type SlotAvailability = 'available' | 'few' | 'full' | 'unavailable';

@Component({
  selector: 'app-time-slot-picker',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    AppCardComponent,
    AppEmptyStateComponent,
    DatePicker,
    FormsModule,
  ],
  templateUrl: './time-slot-picker.component.html',
  styleUrl: './time-slot-picker.component.scss',
})
export class TimeSlotPickerComponent implements OnInit {
  private store = inject(BookingStore);
  private bookingService = inject(BookingService);
  private socketService = inject(SocketService);
  private destroyRef = inject(DestroyRef);

  availableSlots = this.store.availableSlots;
  isLoading = this.store.isLoading;
  error = this.store.error;

  readonly apiService = inject(ApiService);

  // Date selection
  selectedDate = signal<Date>(new Date());
  minDate = new Date();

  ngOnInit(): void {
    // Subscribe to real-time slot updates
    this.socketService.subscribeToSlotUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {
        this.handleSlotUpdate(update);
      });

    // Load slots for initial date
    this.loadSlots();
  }

  private loadSlots(): void {
    const serviceId = this.store.selectedServiceId();
    if (!serviceId) return;

    const dateStr = this.selectedDate().toISOString().split('T')[0];
    this.store.setLoading(true);
    this.apiService.getAvailableSlots(serviceId, dateStr, dateStr).subscribe({
      next: (slots) => {
        this.store.loadSlots(slots);
      },
      error: (err) => {
        this.store.setError(err.message || 'Failed to load time slots');
      },
    });
  }

  onSlotClick(slot: TimeSlot): void {
    if (!slot.available) {
      return;
    }

    // Select the slot first
    this.store.selectSlot(slot);

    // Reserve the slot with preferSeq (frontend generates random sequence)
    this.bookingService.reserveSlot(slot.id);
  }

  isSelected(slot: TimeSlot): boolean {
    return this.store.selectedSlot()?.id === slot.id;
  }

  /** Determine slot availability level */
  getSlotAvailability(slot: TimeSlot): SlotAvailability {
    if (!slot.available) return 'unavailable';
    if (slot.capacity === 0) return 'full';
    const ratio = slot.bookedCount / slot.capacity;
    if (ratio >= 1) return 'full';
    if (ratio >= 0.7) return 'few';
    return 'available';
  }

  handleSlotUpdate(update: SlotUpdateEvent): void {
    // Update slot availability in real-time
    const currentSlots = this.store.slots();
    const updatedSlots = currentSlots.map((slot) =>
      slot.id === update.slotId
        ? { ...slot, available: update.isActive, bookedBy: update.bookedBy }
        : slot
    );
    this.store.loadSlots(updatedSlots);
  }

  retryLoad(): void {
    // Retry loading slots
    this.store.loadSlots([]);
  }

  onDateSelect(date: Date): void {
    this.selectedDate.set(date);
    this.loadSlots();
  }
}
