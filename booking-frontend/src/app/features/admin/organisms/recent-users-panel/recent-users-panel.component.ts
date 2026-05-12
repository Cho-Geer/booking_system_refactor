import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecentUsersTableComponent } from '../../molecules/recent-users-table/recent-users-table.component';
import { RecentUserRow } from '../../dto/admin.dto';

@Component({
  selector: 'app-recent-users-panel',
  standalone: true,
  imports: [RouterLink, RecentUsersTableComponent],
  templateUrl: './recent-users-panel.component.html',
  styleUrl: './recent-users-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentUsersPanelComponent {
  readonly rows = input.required<RecentUserRow[]>();
  readonly rowClick = output<RecentUserRow>();
}