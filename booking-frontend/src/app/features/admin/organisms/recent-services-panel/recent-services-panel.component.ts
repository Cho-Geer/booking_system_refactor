import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecentServicesTableComponent } from '../../molecules/recent-services-table/recent-services-table.component';
import { RecentServiceRow } from '../../dto/admin.dto';

@Component({
  selector: 'app-recent-services-panel',
  standalone: true,
  imports: [RouterLink, RecentServicesTableComponent],
  templateUrl: './recent-services-panel.component.html',
  styleUrl: './recent-services-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentServicesPanelComponent {
  readonly rows = input.required<RecentServiceRow[]>();
  readonly rowClick = output<RecentServiceRow>();
}