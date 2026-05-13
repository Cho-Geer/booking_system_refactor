import { Component, ChangeDetectionStrategy, input, output, signal, computed, HostListener, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { AppChartComponent } from '../../../../shared/components/atoms/app-chart/app-chart.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartData, ChartOptions } from 'chart.js';
import { TimeRange, TIME_RANGE_OPTIONS, TimeRangeSelection } from '../../dto/admin.dto';

@Component({
  selector: 'app-booking-distribution-panel',
  standalone: true,
  imports: [AppChartComponent, AppButtonComponent, DatePicker, FormsModule, TranslatePipe],
  templateUrl: './booking-distribution-panel.component.html',
  styleUrl: './booking-distribution-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDistributionPanelComponent {
  private readonly el = inject(ElementRef);

  readonly doughnutData = input.required<ChartData>();
  readonly barData = input.required<ChartData>();
  readonly doughnutOptions = input<ChartOptions>({});
  readonly barOptions = input<ChartOptions>({});
  readonly selectedTimeRange = input<TimeRange>('last30d');
  readonly timeRangeChange = output<TimeRangeSelection>();

  readonly timeDropdownOpen = signal(false);
  readonly dropdownAnimating = signal(false);
  readonly customRangeOpen = signal(false);
  readonly customPanelAnimating = signal(false);
  readonly customStartDateObj = signal<Date | null>(null);
  readonly customEndDateObj = signal<Date | null>(null);

  readonly displayTimeRangeLabel = computed(() => {
    const range = this.selectedTimeRange();
    if (range === 'custom') {
      const start = this.customStartDateObj();
      const end = this.customEndDateObj();
      if (start && end) {
        const fmt = (d: Date) =>
          d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${fmt(start)} – ${fmt(end)}`;
      }
    }
    const option = TIME_RANGE_OPTIONS.find(o => o.value === range);
    return option?.label ?? 'Time';
  });

  readonly timeRangeOptions = TIME_RANGE_OPTIONS;
  readonly selectedView = signal<'services'>('services');

  toggleTimeDropdown(event: Event): void {
    event.stopPropagation();
    if (this.timeDropdownOpen()) {
      this.closeDropdown();
    } else {
      this.timeDropdownOpen.set(true);
      setTimeout(() => this.dropdownAnimating.set(true), 10);
    }
  }

  selectTimeRange(range: TimeRange): void {
    if (range === 'custom') {
      this.dropdownAnimating.set(false);
      this.timeDropdownOpen.set(false);
      setTimeout(() => {
        this.customRangeOpen.set(true);
        setTimeout(() => this.customPanelAnimating.set(true), 10);
      }, 200);
    } else {
      this.customStartDateObj.set(null);
      this.customEndDateObj.set(null);
      this.timeRangeChange.emit({ timeRange: range });
      this.closeDropdown();
    }
  }

  applyCustomRange(): void {
    const start = this.customStartDateObj();
    const end = this.customEndDateObj();
    if (start && end) {
      const toIso = (d: Date) => d.toISOString().split('T')[0];
      this.timeRangeChange.emit({
        timeRange: 'custom',
        startDate: toIso(start),
        endDate: toIso(end),
      });
      this.closeCustomPanel();
    }
  }

  closeDropdown(): void {
    this.dropdownAnimating.set(false);
    setTimeout(() => this.timeDropdownOpen.set(false), 200);
  }

  closeCustomPanel(): void {
    this.customPanelAnimating.set(false);
    setTimeout(() => this.customRangeOpen.set(false), 200);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      if (this.timeDropdownOpen()) {
        this.closeDropdown();
      }
      if (this.customRangeOpen()) {
        this.closeCustomPanel();
      }
    }
  }
}
