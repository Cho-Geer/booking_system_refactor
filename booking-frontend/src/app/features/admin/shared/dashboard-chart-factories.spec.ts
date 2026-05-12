jest.mock('chart.js/auto', () => {
  const mockChart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(), update: jest.fn(), resize: jest.fn(),
  }));
  mockChart.register = jest.fn();
  return { __esModule: true, default: mockChart };
});

import {
  buildBookingTrendChartData,
  buildServicePopularityChartData,
  buildTimeDistributionChartData,
} from './dashboard-chart-factories';
import { BookingTrendItem, ServicePopularityItem, TimeDistributionItem } from '../dto/admin.dto';

describe('dashboard-chart-factories', () => {

  describe('[RED] buildBookingTrendChartData', () => {
    it('should return empty labels and datasets when trend array is empty', () => {
      const result = buildBookingTrendChartData([]);
      expect(result.labels).toEqual([]);
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].data).toEqual([]);
      expect(result.datasets[1].data).toEqual([]);
    });

    it('should map data correctly when trend has items', () => {
      const trend: BookingTrendItem[] = [
        { date: '2026-05-01', count: 10, revenue: 500 },
        { date: '2026-05-02', count: 15, revenue: 750 },
      ];
      const result = buildBookingTrendChartData(trend);
      expect(result.datasets[0].data).toEqual([10, 15]);
      expect(result.datasets[1].data).toEqual([500, 750]);
      expect(result.labels).toHaveLength(2);
    });
  });

  describe('[RED] buildServicePopularityChartData', () => {
    it('should return empty labels and empty datasets data when pop array is empty', () => {
      const result = buildServicePopularityChartData([]);
      expect(result.labels).toEqual([]);
      expect(result.datasets[0].data).toEqual([]);
    });

    it('should map data correctly when pop has items', () => {
      const pop: ServicePopularityItem[] = [
        { serviceName: 'Haircut', count: 35, percentage: 40 },
        { serviceName: 'Massage', count: 25, percentage: 30 },
      ];
      const result = buildServicePopularityChartData(pop);
      expect(result.labels).toEqual(['Haircut', 'Massage']);
      expect(result.datasets[0].data).toEqual([35, 25]);
    });
  });

  describe('[RED] buildTimeDistributionChartData', () => {
    it('should return empty labels and empty datasets data when td array is empty', () => {
      const result = buildTimeDistributionChartData([]);
      expect(result.labels).toEqual([]);
      expect(result.datasets[0].data).toEqual([]);
    });

    it('should format hour strings from HH:00 to display labels', () => {
      const td: TimeDistributionItem[] = [
        { hour: '09:00', count: 8 },
        { hour: '10:00', count: 12 },
        { hour: '14:00', count: 10 },
      ];
      const result = buildTimeDistributionChartData(td);
      expect(result.labels).toEqual(['09:00', '10:00', '14:00']);
      expect(result.datasets[0].data).toEqual([8, 12, 10]);
    });
  });
});
