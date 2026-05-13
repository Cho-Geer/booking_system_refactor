import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { AppChartComponent } from '../../../../shared/components/atoms/app-chart/app-chart.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-booking-trends-chart',
  standalone: true,
  imports: [AppChartComponent, AppButtonComponent, TranslatePipe],
  templateUrl: './booking-trends-chart.component.html',
  styleUrl: './booking-trends-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingTrendsChartComponent {
  readonly data = input.required<ChartData>();
  readonly options = input<ChartOptions>({});
  readonly selectedPeriod = signal<'weekly' | 'monthly' | 'yearly'>('weekly');
  readonly periodChange = output<'weekly' | 'monthly' | 'yearly'>();
}
