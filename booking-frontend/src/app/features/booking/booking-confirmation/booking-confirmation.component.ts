import { Component, inject } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';
import { Router } from '@angular/router';

/** Placeholder values for missing service data - TODO: Replace with real data */
const PLACEHOLDER_SERVICE_NAME = 'Standard Service';
const PLACEHOLDER_SERVICE_DURATION_MINUTES = 30;
const PLACEHOLDER_SERVICE_PRICE = 50;

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './booking-confirmation.component.html',
  styleUrl: './booking-confirmation.component.scss',
})
export class BookingConfirmationComponent {
  private bookingStore = inject(BookingStore);
  private authStore = inject(AuthStore);
  private router = inject(Router);

  hasSelection = this.bookingStore.hasSelection;
  selectedSlot = this.bookingStore.selectedSlot;
  error = this.bookingStore.error;
  isProcessing = this.bookingStore.isLoading;

  // TODO: Replace hardcoded placeholder values with real data from route state or booking store.
  // These should be populated from the selected service details passed through navigation state
  // or retrieved from the booking store based on the current selection.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedServiceName = () => PLACEHOLDER_SERVICE_NAME;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  serviceDuration = () => PLACEHOLDER_SERVICE_DURATION_MINUTES;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  servicePrice = () => PLACEHOLDER_SERVICE_PRICE;

  confirmBooking(): void {
    const slot = this.selectedSlot();
    const user = this.authStore.user();

    if (!slot || !user) {
      return;
    }

    // Book the slot
    this.bookingStore.bookSlot(slot.id, user.id);

    // Navigate to success page
    this.router.navigate(['/booking/success']);
  }

  cancelBooking(): void {
    this.bookingStore.selectSlot(null);
    this.router.navigate(['/booking']);
  }
}
