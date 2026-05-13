import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppBadgeComponent, BadgeStatus } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { RecentUserRow } from '../../dto/admin.dto';

@Component({
  selector: 'app-recent-users-table',
  standalone: true,
  imports: [DatePipe, AppBadgeComponent, AppButtonComponent, TranslatePipe],
  templateUrl: './recent-users-table.component.html',
  styleUrl: './recent-users-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentUsersTableComponent {
  readonly rows = input.required<RecentUserRow[]>();
  readonly rowClick = output<RecentUserRow>();
}