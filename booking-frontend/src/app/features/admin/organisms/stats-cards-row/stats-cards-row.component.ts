import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { StatCardComponent, StatCardData } from '../../molecules/stat-card/stat-card.component';

@Component({
  selector: 'app-stats-cards-row',
  standalone: true,
  imports: [StatCardComponent],
  templateUrl: './stats-cards-row.component.html',
  styleUrl: './stats-cards-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardsRowComponent {
  readonly cards = input.required<StatCardData[]>();
}
