import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { AppChartComponent } from '../../../../shared/components/atoms/app-chart/app-chart.component';
import type { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-time-distribution-chart',
  standalone: true,
  imports: [AppChartComponent],
  templateUrl: './time-distribution-chart.component.html',
  styleUrl: './time-distribution-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeDistributionChartComponent {
  readonly data = input.required<ChartData>();
  readonly options = input<ChartOptions>({});
}
