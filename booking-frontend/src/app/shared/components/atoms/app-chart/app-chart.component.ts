import {
  Component,
  input,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  DoCheck,
} from '@angular/core';
import Chart from 'chart.js/auto';
import type { ChartData, ChartOptions } from 'chart.js';

export type AppChartType = 'line' | 'bar' | 'doughnut' | 'pie';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [],
  templateUrl: './app-chart.component.html',
  styleUrl: './app-chart.component.scss',
})
export class AppChartComponent implements AfterViewInit, OnDestroy, DoCheck {
  @ViewChild('chartCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private themeObserver: MutationObserver | null = null;
  private _isViewInit = false;

  /** Previous input values for DoCheck change detection. */
  private _prevType: AppChartType = 'line';
  private _prevData: ChartData = { labels: [], datasets: [] };
  private _prevOptions: ChartOptions = {};
  private _prevResponsive = true;
  private _prevShowLegend = true;

  /** Type of the chart. */
  readonly type = input<AppChartType>('line');

  /** Data for the chart. */
  readonly data = input<ChartData>({
    labels: [],
    datasets: [],
  });

  /** Custom Chart.js options to merge with defaults. */
  readonly options = input<ChartOptions>({});

  /** Whether the chart should be responsive. */
  readonly responsive = input<boolean>(true);

  /** Whether to display the legend. */
  readonly showLegend = input<boolean>(true);

  /** Height of the chart container. */
  readonly height = input<string>('300px');

  /**
   * Default theme colors matching the design system.
   * NOTE: These are fallback defaults. Chart factories (dashboard-chart-factories.ts)
   * override these with proper design tokens. When adding new Chart instances,
   * prefer referencing --color-accent-* design tokens via hex values with
    * token-comment comments (e.g. /* --color-accent-green *​/).
   */
  readonly defaultColors: string[] = [
    '#2ecc71',  // legacy – kept for backward compatibility
    '#00B42A',  // legacy
    '#FF7D00',  // legacy
    '#F53F3F',  // legacy
    '#27ae60',  // legacy
    '#764ba2',  // legacy
    '#86909C',  // legacy – ~ --color-text-secondary
  ];

  /** Data with default colors applied to datasets without colors. */
  readonly chartData = computed(() => {
    const data = this.data();
    if (!data.datasets || data.datasets.length === 0) {
      return data;
    }

    const datasets = data.datasets.map((dataset, index) => {
      if (dataset.backgroundColor || dataset.borderColor) {
        return dataset;
      }
      const color = this.defaultColors[index % this.defaultColors.length];
      return {
        ...dataset,
        backgroundColor:
          this.type() === 'line'
            ? `${color}20`
            : color,
        borderColor: color,
        borderWidth: this.type() === 'line' ? 2 : 0,
        tension: this.type() === 'line' ? 0.4 : undefined,
        fill: this.type() === 'line',
      };
    });

    return { ...data, datasets };
  });

  /** Merged Chart.js options with defaults. */
  get chartOptions(): ChartOptions {
    const custom = this.options() || {};

    const defaults: ChartOptions = {
      responsive: this.responsive(),
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: this.showLegend(),
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              family: "'Inter', 'Microsoft YaHei', sans-serif",
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(29, 33, 41, 0.9)', // ~ --color-bg-primary @ 0.9
          titleFont: {
            size: 13,
            family: "'Inter', 'Microsoft YaHei', sans-serif",
          },
          bodyFont: {
            size: 12,
            family: "'Inter', 'Microsoft YaHei', sans-serif",
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
        },
      },
      scales:
        this.type() === 'doughnut' || this.type() === 'pie'
          ? undefined
          : {
              x: {
                grid: {
                  display: false,
                },
                border: {
                  display: false,
                },
                ticks: {
                  font: {
                    size: 11,
                    family: "'Inter', 'Microsoft YaHei', sans-serif",
                  },
                  color: '#86909C', // --color-text-secondary (legacy fallback)
                },
              },
              y: {
                grid: {
                  color: 'rgba(0, 0, 0, 0.04)', // subtle grid line
                },
                border: {
                  display: false,
                },
                ticks: {
                  font: {
                    size: 11,
                    family: "'Inter', 'Microsoft YaHei', sans-serif",
                  },
                  color: '#86909C', // --color-text-secondary (legacy fallback)
                },
              },
            },
    };

    // Merge custom options with defaults
    return this.mergeOptions(defaults, custom);
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.initThemeObserver();

    // Store initial input values so ngDoCheck can detect changes
    this._prevType = this.type();
    this._prevData = this.data();
    this._prevOptions = this.options();
    this._prevResponsive = this.responsive();
    this._prevShowLegend = this.showLegend();

    this._isViewInit = true;
  }

  ngDoCheck(): void {
    if (!this._isViewInit || !this.chart) {
      return;
    }

    // Detect input signal changes by reference comparison
    if (
      this.type() !== this._prevType ||
      this.data() !== this._prevData ||
      this.options() !== this._prevOptions ||
      this.responsive() !== this._prevResponsive ||
      this.showLegend() !== this._prevShowLegend
    ) {
      this._prevType = this.type();
      this._prevData = this.data();
      this._prevOptions = this.options();
      this._prevResponsive = this.responsive();
      this._prevShowLegend = this.showLegend();
      this.recreateChart();
    }
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.chart?.destroy();
    this.chart = null;
  }

  /** Create the Chart instance from the canvas element. */
  private initChart(): void {
    const canvas = this.canvasRef.nativeElement;

    this.chart = new Chart(canvas, {
      type: this.type(),
      data: this.chartData(),
      options: this.chartOptions,
    });
  }

  /** Destroy the existing chart and re-create it with current inputs. */
  private recreateChart(): void {
    this.chart?.destroy();
    this.initChart();
  }

  /** Set up MutationObserver to watch for theme attribute changes. */
  private initThemeObserver(): void {
    this.themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          this.chart?.update('none');
        }
      }
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  /** Merge custom ChartOptions into defaults. */
  private mergeOptions(
    defaults: ChartOptions,
    custom: ChartOptions,
  ): ChartOptions {
    const result: ChartOptions = { ...defaults };

    if (custom.responsive !== undefined) {
      result.responsive = custom.responsive;
    }
    if (custom.maintainAspectRatio !== undefined) {
      result.maintainAspectRatio = custom.maintainAspectRatio;
    }

    // Merge plugins
    result.plugins = {
      ...defaults.plugins,
      ...custom.plugins,
    };

    if (custom.plugins?.legend !== undefined) {
      result.plugins.legend = {
        ...defaults.plugins?.legend,
        ...custom.plugins.legend,
      } as typeof result.plugins.legend;
    }

    if (custom.plugins?.title !== undefined) {
      result.plugins.title = {
        ...defaults.plugins?.title,
        ...custom.plugins.title,
      } as typeof result.plugins.title;
    }

    if (custom.plugins?.tooltip !== undefined) {
      result.plugins.tooltip = {
        ...defaults.plugins?.tooltip,
        ...custom.plugins.tooltip,
      } as typeof result.plugins.tooltip;
    }

    // Merge scales
    if (custom.scales !== undefined) {
      result.scales = custom.scales;
    }

    return result;
  }
}
