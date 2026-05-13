import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecentBookingsTableComponent } from '../../molecules/recent-bookings-table/recent-bookings-table.component';
import { BookingTableRow } from '../../dto/admin.dto';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-recent-bookings-panel',
  standalone: true,
  imports: [RouterLink, RecentBookingsTableComponent, TranslatePipe],
  templateUrl: './recent-bookings-panel.component.html',
  styleUrl: './recent-bookings-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentBookingsPanelComponent {
  readonly rows = input.required<BookingTableRow[]>();
  readonly rowClick = output<BookingTableRow>();
}
