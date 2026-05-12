import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeDistributionChartComponent } from './time-distribution-chart.component';
import type { ChartData, ChartOptions } from 'chart.js';

jest.mock('chart.js/auto', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(), update: jest.fn(), resize: jest.fn(),
  })),
}));

describe('TimeDistributionChartComponent', () => {
  let component: TimeDistributionChartComponent;
  let fixture: ComponentFixture<TimeDistributionChartComponent>;

  const mockData: ChartData = {
    labels: ['9-10', '10-11'],
    datasets: [{ label: 'Bookings', data: [8, 12], backgroundColor: 'rgba(46, 204, 113, 0.7)' }],
  };
  const mockOptions = { responsive: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeDistributionChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TimeDistributionChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('options', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should render app-chart', () => {
    expect(fixture.nativeElement.querySelector('app-chart')).toBeTruthy();
  });
});
