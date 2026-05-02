import { Component, input, computed } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import type { ChartData, ChartOptions } from 'chart.js';

export type AppChartType = 'line' | 'bar' | 'doughnut' | 'pie';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [ChartModule],
  templateUrl: './app-chart.component.html',
  styleUrl: './app-chart.component.scss',
})
export class AppChartComponent {
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

  /** Default theme colors matching the design system. */
  readonly defaultColors: string[] = [
    '#667eea',
    '#00B42A',
    '#FF7D00',
    '#F53F3F',
    '#1677FF',
    '#764ba2',
    '#86909C',
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
          backgroundColor: 'rgba(29, 33, 41, 0.9)',
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
                  color: '#86909C',
                },
              },
              y: {
                grid: {
                  color: 'rgba(0, 0, 0, 0.04)',
                },
                border: {
                  display: false,
                },
                ticks: {
                  font: {
                    size: 11,
                    family: "'Inter', 'Microsoft YaHei', sans-serif",
                  },
                  color: '#86909C',
                },
              },
            },
    };

    // Merge custom options with defaults
    return this.mergeOptions(defaults, custom);
  }

  /** Merge custom ChartOptions into defaults. */
  private mergeOptions(defaults: ChartOptions, custom: ChartOptions): ChartOptions {
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
