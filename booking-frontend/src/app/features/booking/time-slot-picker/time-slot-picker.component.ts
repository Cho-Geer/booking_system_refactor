import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { BookingStore } from '../../../stores/booking/booking.store';
import { TimeSlot } from '../../../shared/dto/time-slot.dto';
import { BookingService } from '../booking.service';
import { SocketService, SlotUpdateEvent } from '../../../core/services/socket.service';

@Component({
  selector: 'app-time-slot-picker',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './time-slot-picker.component.html',
  styleUrl: './time-slot-picker.component.scss',
})
export class TimeSlotPickerComponent implements OnInit, OnDestroy {
  private store = inject(BookingStore);
  private bookingService = inject(BookingService);
  private socketService = inject(SocketService);

  private subscription = new Subscription();

  availableSlots = this.store.availableSlots;
  isLoading = this.store.isLoading;
  error = this.store.error;

  ngOnInit(): void {
    // Subscribe to real-time slot updates
    this.subscription.add(
      this.socketService.subscribeToSlotUpdates().subscribe((update) => {
        this.handleSlotUpdate(update);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
}
