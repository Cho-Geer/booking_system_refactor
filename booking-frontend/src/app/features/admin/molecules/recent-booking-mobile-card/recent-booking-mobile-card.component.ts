import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppBadgeComponent, BadgeStatus } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';

export interface BookingDisplayItem {
  id: string;
  userName: string;
  serviceName: string;
  appointmentDate: string;
  status: string;
}

@Component({
  selector: 'app-recent-booking-mobile-card',
  standalone: true,
  imports: [DatePipe, AppBadgeComponent, AppButtonComponent],
  templateUrl: './recent-booking-mobile-card.component.html',
  styleUrl: './recent-booking-mobile-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentBookingMobileCardComponent {
  readonly booking = input.required<BookingDisplayItem>();
  readonly initials = input<string>('');
  readonly initialsBg = input<string>('');
  readonly statusBadge = input<BadgeStatus>('pending');
}
