import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppChartComponent } from './app-chart.component';

// Mock HTMLCanvasElement for Chart.js in JSDOM
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
});

describe('AppChartComponent', () => {
  let component: AppChartComponent;
  let fixture: ComponentFixture<AppChartComponent>;

  const mockData = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: 'Bookings',
        data: [10, 20, 30],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('[RED] should render p-chart element', () => {
    const chartEl = fixture.debugElement.query(By.css('p-chart'));
    expect(chartEl).toBeTruthy();
  });

  it('[RED] should pass type to p-chart', () => {
    fixture.componentRef.setInput('type', 'bar');
    fixture.detectChanges();

    expect(component.type()).toBe('bar');
  });

  it('[RED] should pass data to p-chart', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();

    expect(component.data()).toEqual(mockData);
  });

  it('[RED] should default type to line', () => {
    expect(component.type()).toBe('line');
  });

  it('[RED] should default responsive to true', () => {
    expect(component.responsive()).toBe(true);
  });

  it('[RED] should default showLegend to true', () => {
    expect(component.showLegend()).toBe(true);
  });

  it('[RED] should hide legend in default options when showLegend is false', () => {
    fixture.componentRef.setInput('showLegend', false);
    fixture.detectChanges();

    const opts = component.chartOptions;
    expect(opts.plugins?.legend?.display).toBe(false);
  });

  it('[RED] should apply custom height when provided', () => {
    fixture.componentRef.setInput('height', '400px');
    fixture.detectChanges();

    expect(component.height()).toBe('400px');
  });

  it('[RED] should merge custom options with defaults', () => {
    const customOptions = {
      plugins: {
        title: {
          display: true,
          text: 'Custom Title',
        },
      },
    };
    fixture.componentRef.setInput('options', customOptions);
    fixture.detectChanges();

    const opts = component.chartOptions;
    expect(opts.plugins?.title?.display).toBe(true);
    expect(opts.plugins?.title?.text).toBe('Custom Title');
    expect(opts.responsive).toBe(true);
  });

  it('[RED] should have default theme colors defined', () => {
    const colors = component.defaultColors;
    expect(colors.length).toBeGreaterThan(0);
    expect(colors).toContain('#667eea');
    expect(colors).toContain('#00B42A');
  });
});
