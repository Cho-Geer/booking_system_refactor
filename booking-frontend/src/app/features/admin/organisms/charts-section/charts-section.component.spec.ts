import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartsSectionComponent } from './charts-section.component';
import type { ChartData, ChartOptions } from 'chart.js';

jest.mock('chart.js/auto', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(), update: jest.fn(), resize: jest.fn(),
  })),
}));

describe('ChartsSectionComponent', () => {
  let component: ChartsSectionComponent;
  let fixture: ComponentFixture<ChartsSectionComponent>;

  const mockData: ChartData = {
    labels: ['Mon', 'Tue'],
    datasets: [{ label: 'Bookings', data: [10, 20] }],
  };
  const mockOptions: ChartOptions = { responsive: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartsSectionComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ChartsSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('bookingTrendData', mockData);
    fixture.componentRef.setInput('bookingTrendOptions', mockOptions);
    fixture.componentRef.setInput('doughnutData', mockData);
    fixture.componentRef.setInput('barData', mockData);
    fixture.componentRef.setInput('doughnutOptions', mockOptions);
    fixture.componentRef.setInput('barOptions', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should render deferred skeleton placeholder initially', () => {
    const skeleton = fixture.nativeElement.querySelector('.skeleton');
    expect(skeleton).toBeTruthy();
  });
  it('[Red] should render 2-column chart grid layout placeholder', () => {
    // The @defer placeholder contains grid skeleton cards
    const placeholders = fixture.nativeElement.querySelectorAll('.skeleton');
    expect(placeholders.length).toBe(2);
  });
});
