import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';
import { AppButtonComponent } from '../../../shared/components/atoms/app-button/app-button.component';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-booking-success',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, TranslatePipe, AppButtonComponent, AppCardComponent],
  templateUrl: './booking-success.component.html',
  styleUrl: './booking-success.component.scss',
})
export class BookingSuccessComponent {
  private router = inject(Router);
  private bookingStore = inject(BookingStore);
  private authStore = inject(AuthStore);

  selectedSlot = this.bookingStore.selectedSlot;
  currentUser = this.authStore.currentUser;

  lastAppointment = this.bookingStore.lastAppointment;

  bookingReference = computed(() => this.lastAppointment()?.appointmentNumber ?? '');
  bookingAmount = computed(() => this.lastAppointment()?.price ?? 0);
  bookingDuration = computed(() => this.lastAppointment()?.durationMinutes ?? 0);

  viewMyBookings(): void {
    this.router.navigate(['/my-bookings']);
  }

  goHome(): void {
    this.router.navigate(['/booking']);
  }
}
