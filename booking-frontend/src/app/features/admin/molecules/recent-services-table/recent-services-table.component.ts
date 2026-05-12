import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AppBadgeComponent, BadgeStatus } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { RecentServiceRow } from '../../dto/admin.dto';

@Component({
  selector: 'app-recent-services-table',
  standalone: true,
  imports: [CurrencyPipe, AppBadgeComponent, AppButtonComponent],
  templateUrl: './recent-services-table.component.html',
  styleUrl: './recent-services-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentServicesTableComponent {
  readonly rows = input.required<RecentServiceRow[]>();
  readonly rowClick = output<RecentServiceRow>();
}