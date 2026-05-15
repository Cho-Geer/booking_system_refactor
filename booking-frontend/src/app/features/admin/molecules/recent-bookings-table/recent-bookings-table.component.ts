import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppBadgeComponent } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { BookingTableRow } from '../../dto/admin.dto';

@Component({
  selector: 'app-recent-bookings-table',
  standalone: true,
  imports: [DatePipe, AppBadgeComponent, AppButtonComponent, TranslatePipe],
  templateUrl: './recent-bookings-table.component.html',
  styleUrl: './recent-bookings-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentBookingsTableComponent {
  readonly rows = input.required<BookingTableRow[]>();
  readonly rowClick = output<BookingTableRow>();
}
