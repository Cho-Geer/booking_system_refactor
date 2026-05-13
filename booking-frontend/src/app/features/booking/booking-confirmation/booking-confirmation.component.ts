import { Component, inject, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../shared/components/atoms/app-button/app-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [
    DatePipe,
    CurrencyPipe,
    TranslatePipe,
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

  /** Tax computation */
  taxRate = computed(() => this.selectedService()?.taxRate ?? 0);
  estTaxAmount = computed(() => (this.servicePrice() * this.taxRate()) / 100);
  estTaxIncludedTotal = computed(() => this.servicePrice() + this.estTaxAmount());

  confirmBooking(): void {
    const slot = this.selectedSlot();
    const user = this.authStore.user();

    if (!slot || !user || !this.acceptTerms) {
      return;
    }

    this.bookingStore.setLoading(true);

    const serviceId = this.bookingStore.selectedServiceId();
    if (!serviceId) {
      this.bookingStore.setError('No service selected');
      return;
    }

    this.bookingStore.createAppointment({
      timeSlotId: slot.id,
      serviceId,
      appointmentDate: new Date().toISOString(),
      preferredSequence: Math.floor(Math.random() * 100),
      notes: undefined,
    }).then((response) => {
      if (response.status === 'SUCCESS') {
        this.bookingStore.bookSlot(slot.id, user.id);
        this.router.navigate(['/booking/success']);
      } else if (response.message?.includes('409') || response.message?.includes('Conflict')) {
        this.bookingStore.setError('This slot was just booked by someone else. Please choose another.');
        this.router.navigate(['/booking']);
      } else {
        this.bookingStore.setError(response.message || 'Booking failed. Please try again.');
      }
    });
  }

  cancelBooking(): void {
    this.bookingStore.selectSlot(null);
    this.router.navigate(['/booking']);
  }
}
