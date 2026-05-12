import { Component, inject, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../shared/components/atoms/app-button/app-button.component';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [
    DatePipe,
    CurrencyPipe,
    FormsModule,
    RouterLink,
    AppCardComponent,
    AppButtonComponent,
  ],
  templateUrl: './booking-confirmation.component.html',
  styleUrl: './booking-confirmation.component.scss',
})
export class BookingConfirmationComponent {
  private bookingStore = inject(BookingStore);
  authStore = inject(AuthStore);
  private router = inject(Router);

  hasSelection = this.bookingStore.hasSelection;
  selectedSlot = this.bookingStore.selectedSlot;
  error = this.bookingStore.error;
  isProcessing = this.bookingStore.isLoading;

  // Terms acceptance
  acceptTerms = false;

  /** Derive selected service details from BookingStore state */
  private selectedService = computed(() => {
    const serviceId = this.bookingStore.selectedServiceId();
    if (!serviceId) return null;
    return this.bookingStore.services().find(s => s.id === serviceId) ?? null;
  });

  /** Computed display values derived from the selected service */
  selectedServiceName = computed(() => this.selectedService()?.name ?? 'Unknown Service');
  serviceDuration = computed(() => this.selectedService()?.durationMinutes ?? 30);
  servicePrice = computed(() => this.selectedService()?.price ?? 0);

  confirmBooking(): void {
    const slot = this.selectedSlot();
    const user = this.authStore.user();

    if (!slot || !user || !this.acceptTerms) {
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
