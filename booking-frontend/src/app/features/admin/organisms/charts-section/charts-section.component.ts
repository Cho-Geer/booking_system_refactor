import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { BookingTrendsChartComponent } from '../../molecules/booking-trends-chart/booking-trends-chart.component';
import { BookingDistributionPanelComponent } from '../../molecules/booking-distribution-panel/booking-distribution-panel.component';
import type { ChartData, ChartOptions } from 'chart.js';
import { TimeRange, TimeRangeSelection } from '../../dto/admin.dto';

@Component({
  selector: 'app-charts-section',
  standalone: true,
  imports: [BookingTrendsChartComponent, BookingDistributionPanelComponent],
  templateUrl: './charts-section.component.html',
  styleUrl: './charts-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsSectionComponent {
  readonly bookingTrendData = input.required<ChartData>();
  readonly bookingTrendOptions = input<ChartOptions>({});
  readonly doughnutData = input.required<ChartData>();
  readonly barData = input.required<ChartData>();
  readonly doughnutOptions = input<ChartOptions>({});
  readonly barOptions = input<ChartOptions>({});
  readonly timeRange = input<TimeRange>('last30d');
  readonly timeRangeChange = output<TimeRangeSelection>();
  readonly periodChange = output<'weekly' | 'monthly' | 'yearly'>();
}
