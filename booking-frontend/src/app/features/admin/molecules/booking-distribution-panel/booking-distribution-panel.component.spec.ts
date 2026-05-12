import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingDistributionPanelComponent } from './booking-distribution-panel.component';
import type { ChartData, ChartOptions } from 'chart.js';

jest.mock('chart.js/auto', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(), update: jest.fn(), resize: jest.fn(),
  })),
}));

describe('BookingDistributionPanelComponent', () => {
  let component: BookingDistributionPanelComponent;
  let fixture: ComponentFixture<BookingDistributionPanelComponent>;

  const mockDoughnutData: ChartData = {
    labels: ['Haircut', 'Massage'],
    datasets: [{ data: [35, 25], backgroundColor: ['#2ecc71', '#2ecc71'] }],
  };
  const mockBarData: ChartData = {
    labels: ['9-10', '10-11'],
    datasets: [{ label: 'Bookings', data: [8, 12] }],
  };
  const mockOptions: ChartOptions = { responsive: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDistributionPanelComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BookingDistributionPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doughnutData', mockDoughnutData);
    fixture.componentRef.setInput('barData', mockBarData);
    fixture.componentRef.setInput('doughnutOptions', mockOptions);
    fixture.componentRef.setInput('barOptions', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should render 2 app-chart elements', () => {
    const charts = fixture.nativeElement.querySelectorAll('app-chart');
    expect(charts.length).toBe(2);
  });
  it('[Red] should display "Booking Distribution" heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Booking Distribution');
  });
});
