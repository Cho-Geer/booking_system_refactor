/**
 * Dashboard Chart Factories
 *
 * Color conventions:
 *   rgba(R, G, B, A)   — runtime alpha, reserved for gradients / overlays
 *   #hex                — design-token aliased value; reference the token
 *                         by comment, e.g. #2ecc71 → // --color-accent-green
 *   var(--color-*)      — preferred; use CSS custom property for live theming
 *
 * Chart.js color values MUST carry a token-comment comment (#hex → // --color-*).
 * This convention enables search-and-replace token migrations.
 */

import type { ChartData, ChartOptions } from 'chart.js';
import Chart from 'chart.js/auto';
import { BookingTrendItem, ServicePopularityItem, TimeDistributionItem } from '../dto/admin.dto';

export function buildBookingTrendChartData(trend: BookingTrendItem[]): ChartData {
  if (trend.length === 0) {
    return { labels: [], datasets: [{ label: 'Bookings', data: [] }, { label: 'Revenue ($)', data: [] }] };
  }
  return {
    labels: trend.map(t => { const d = new Date(t.date); return d.toLocaleDateString('en-US', { weekday: 'short' }); }),
    datasets: [
      {
        label: 'Bookings',
        data: trend.map(t => t.count),
        borderColor: '#2ecc71',
        backgroundColor: (context: any) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(46, 204, 113, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(46, 204, 113, 0.05)');
          gradient.addColorStop(1, 'rgba(46, 204, 113, 0.35)');
          return gradient;
        },
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5,
        pointBackgroundColor: '#2ecc71',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Revenue ($)',
        data: trend.map(t => t.revenue ?? 0),
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5,
        pointBackgroundColor: '#2ecc71',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };
}

export const BOOKING_TREND_CHART_OPTIONS: ChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, color: '#94a3b8' } }, // --color-text-secondary
    tooltip: {
      mode: 'index', intersect: false,
      backgroundColor: 'rgba(22, 32, 50, 0.9)', // --color-bg-secondary @ 0.9
      titleColor: '#e2e8f0',                    // --color-text-primary
      bodyColor: '#94a3b8',                     // --color-text-secondary
      borderColor: 'rgba(42, 58, 80, 0.5)',    // --color-border @ 0.5
      borderWidth: 1, padding: 10, usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(42, 58, 80, 0.2)' },  // --color-border @ 0.2
      ticks: { color: '#94a3b8' },                 // --color-text-secondary
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(42, 58, 80, 0.2)' },  // --color-border @ 0.2
      ticks: { color: '#94a3b8' },                 // --color-text-secondary
    },
    y1: {
      beginAtZero: true, position: 'right',
      grid: { display: false },
      ticks: { color: '#94a3b8', callback: (val: any) => '$' + val }, // --color-text-secondary
    },
  },
  interaction: { mode: 'nearest', axis: 'x', intersect: false },
};

export function buildServicePopularityChartData(pop: ServicePopularityItem[]): ChartData {
  if (pop.length === 0) {
    return { labels: [], datasets: [{ data: [] }] };
  }
  return {
    labels: pop.map(p => p.serviceName),
    datasets: [{
      data: pop.map(p => p.count),
      backgroundColor: [
        '#2ecc71',  // --color-accent-green
        '#9b59b6',  // --color-accent-purple
        '#2ecc71',  // --color-accent-green / --color-success
        '#f39c12',  // --color-accent-yellow / --color-warning
        '#e74c3c',  // --color-accent-red / --color-danger
      ],
      borderWidth: 0, hoverOffset: 4,
    }],
  };
}

function isDarkMode(): boolean {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

export const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart: any) {
    const { ctx, chartArea } = chart;
    const dataset = chart.data.datasets[0];
    const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
    // Use chartArea to get the center of the actual doughnut (excludes legend area)
    const centerX = chartArea.left + (chartArea.right - chartArea.left) / 2;
    const centerY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;
    const dark = isDarkMode();

    ctx.save();

    // Label above: "Total"
    ctx.font = '500 10px sans-serif';
    ctx.fillStyle = dark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Total', centerX, centerY - 14);

    // Main number in center
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = dark ? 'rgba(226, 232, 240, 0.7)' : '#e2e8f0';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY);

    // Label below: "Bookings"
    ctx.font = '500 10px sans-serif';
    ctx.fillStyle = dark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8';
    ctx.textBaseline = 'top';
    ctx.fillText('Bookings', centerX, centerY + 14);

    ctx.restore();
  }
};

export const barDataLabelsPlugin = {
  id: 'barDataLabels',
  afterDatasetsDraw(chart: any) {
    // Only run on bar charts — skip doughnut/pie/line charts
    if (chart.config.type !== 'bar') return;

    const { ctx } = chart;
    const dark = isDarkMode();
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = dark ? 'rgba(226, 232, 240, 0.7)' : '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value !== null && value !== undefined && value !== 0) {
          // Position label 4px above the bar top
          ctx.fillText(value.toString(), bar.x, bar.y - 4);
        }
      });
    });

    ctx.restore();
  }
};

Chart.register(centerTextPlugin, barDataLabelsPlugin);

export const DOUGHNUT_CHART_OPTIONS: ChartOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, boxWidth: 6, color: '#94a3b8', padding: 15 }, // --color-text-secondary
    },
    tooltip: {
      backgroundColor: 'rgba(22, 32, 50, 0.9)', // --color-bg-secondary @ 0.9
      titleColor: '#e2e8f0',                    // --color-text-primary
      bodyColor: '#94a3b8',                     // --color-text-secondary
      borderColor: 'rgba(42, 58, 80, 0.5)',    // --color-border @ 0.5
      borderWidth: 1, padding: 10, usePointStyle: true,
    },
    centerText: true as any,
  },
} as ChartOptions;

export function buildTimeDistributionChartData(td: TimeDistributionItem[]): ChartData {
  if (td.length === 0) {
    return { labels: [], datasets: [{ label: 'Bookings', data: [] }] };
  }
  return {
    labels: td.map(t => t.hour),
    datasets: [{
      label: 'Bookings',
      data: td.map(t => t.count),
      backgroundColor: 'rgba(46, 204, 113, 0.7)', // --color-accent-green @ 0.7
      borderColor: '#2ecc71',                    // --color-accent-green
      borderWidth: 1, borderRadius: 0, barThickness: 12,
    }],
  };
}

export const BAR_CHART_OPTIONS: ChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(22, 32, 50, 0.9)', // --color-bg-secondary @ 0.9
      titleColor: '#e2e8f0',                    // --color-text-primary
      bodyColor: '#94a3b8',                     // --color-text-secondary
      borderColor: 'rgba(42, 58, 80, 0.5)',    // --color-border @ 0.5
      borderWidth: 1, padding: 10, usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10 } }, // --color-text-secondary
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(42, 58, 80, 0.2)' },  // --color-border @ 0.2
      ticks: { color: '#94a3b8', font: { size: 10 } }, // --color-text-secondary
    },
  },
};
