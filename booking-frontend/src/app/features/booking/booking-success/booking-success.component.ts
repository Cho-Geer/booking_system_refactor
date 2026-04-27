import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { AuthStore } from '../../../stores/auth/auth.store';

@Component({
  selector: 'app-booking-success',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './booking-success.component.html',
  styleUrl: './booking-success.component.scss',
})
export class BookingSuccessComponent {
  private router = inject(Router);
  private bookingStore = inject(BookingStore);
  private authStore = inject(AuthStore);

  selectedSlot = this.bookingStore.selectedSlot;
  currentUser = this.authStore.currentUser;

  viewMyBookings(): void {
    this.router.navigate(['/booking']);
  }

  goHome(): void {
    this.router.navigate(['/booking']);
  }
}
