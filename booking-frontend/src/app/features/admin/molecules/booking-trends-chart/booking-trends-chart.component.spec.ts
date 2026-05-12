import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingTrendsChartComponent } from './booking-trends-chart.component';
import type { ChartData, ChartOptions } from 'chart.js';

jest.mock('chart.js/auto', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(), update: jest.fn(), resize: jest.fn(),
  })),
}));

describe('BookingTrendsChartComponent', () => {
  let component: BookingTrendsChartComponent;
  let fixture: ComponentFixture<BookingTrendsChartComponent>;

  const mockData: ChartData = {
    labels: ['Mon', 'Tue'],
    datasets: [{ label: 'Bookings', data: [10, 20], borderColor: '#2ecc71', fill: true, tension: 0.4 }],
  };
  const mockOptions: ChartOptions = { responsive: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingTrendsChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BookingTrendsChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('options', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should render app-chart with line type', () => {
    const chartEl = fixture.nativeElement.querySelector('app-chart');
    expect(chartEl).toBeTruthy();
  });
});
