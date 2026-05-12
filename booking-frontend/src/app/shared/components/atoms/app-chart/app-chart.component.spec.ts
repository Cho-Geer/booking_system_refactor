import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppChartComponent } from './app-chart.component';
import Chart from 'chart.js/auto';

jest.mock('chart.js/auto', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
      update: jest.fn(),
      resize: jest.fn(),
    })),
  };
});

const mockedChart = jest.mocked(Chart);

// Mock MutationObserver to capture callbacks in tests
let capturedMutationCallback: ((mutations: MutationRecord[]) => void) | null = null;
class MockMutationObserver {
  constructor(callback: (mutations: MutationRecord[]) => void) {
    capturedMutationCallback = callback;
  }
  observe = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'MutationObserver', {
  writable: true,
  configurable: true,
  value: MockMutationObserver,
});

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
    mockedChart.mockClear();
    capturedMutationCallback = null;

    await TestBed.configureTestingModule({
      imports: [AppChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('[RED] should render canvas element', () => {
    const canvasEl = fixture.debugElement.query(By.css('canvas'));
    expect(canvasEl).toBeTruthy();
    expect(canvasEl.nativeElement.getAttribute('id')).toBeNull();
  });

  it('[RED] should initialize Chart in ngAfterViewInit', () => {
    expect(mockedChart).toHaveBeenCalledTimes(1);
    const [canvasEl, config] = mockedChart.mock.calls[0];
    expect(canvasEl).toBeInstanceOf(HTMLCanvasElement);
    expect(config).toMatchObject({
      type: 'line',
      data: expect.any(Object),
      options: expect.any(Object),
    });
  });

  it('[RED] should destroy chart on ngOnDestroy', () => {
    const chartInstance = mockedChart.mock.results[0].value as ReturnType<typeof Chart>;
    component.ngOnDestroy();
    expect(chartInstance.destroy).toHaveBeenCalledTimes(1);
  });

  it('[RED] should update chart on theme change', () => {
    const chartInstance = mockedChart.mock.results[0].value as ReturnType<typeof Chart>;
    expect(capturedMutationCallback).not.toBeNull();

    // Simulate a mutation on data-theme attribute
    capturedMutationCallback!([
      {
        type: 'attributes',
        attributeName: 'data-theme',
      } as MutationRecord,
    ]);

    expect(chartInstance.update).toHaveBeenCalledWith('none');
  });

  it('[RED] should reinitialize chart when type changes', () => {
    const initialCalls = mockedChart.mock.calls.length;
    fixture.componentRef.setInput('type', 'bar');
    fixture.detectChanges();

    expect(mockedChart.mock.calls.length).toBeGreaterThan(initialCalls);
    const lastCall = mockedChart.mock.calls[mockedChart.mock.calls.length - 1];
    expect(lastCall[1]).toMatchObject({ type: 'bar' });
  });

  it('[RED] should reinitialize chart when data changes', () => {
    const initialCalls = mockedChart.mock.calls.length;
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();

    expect(mockedChart.mock.calls.length).toBeGreaterThan(initialCalls);
    const lastCall = mockedChart.mock.calls[mockedChart.mock.calls.length - 1];
    expect(lastCall[1].data.datasets).toHaveLength(1);
    expect(lastCall[1].data.datasets[0].label).toBe('Bookings');
  });

  it('[RED] should pass correct type to Chart config', () => {
    fixture.componentRef.setInput('type', 'bar');
    fixture.detectChanges();

    const lastCall = mockedChart.mock.calls[mockedChart.mock.calls.length - 1];
    expect(lastCall[1].type).toBe('bar');
  });

  it('[RED] should pass processed data with default colors to Chart config', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('type', 'bar');
    fixture.detectChanges();

    const lastCall = mockedChart.mock.calls[mockedChart.mock.calls.length - 1];
    const dataset = lastCall[1].data.datasets[0];
    expect(dataset.backgroundColor).toBe('#2ecc71');
    expect(dataset.borderColor).toBe('#2ecc71');
  });

  it('[RED] should default type to line', () => {
    const firstCall = mockedChart.mock.calls[0];
    expect(firstCall[1].type).toBe('line');
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

    const lastCall = mockedChart.mock.calls[mockedChart.mock.calls.length - 1];
    expect(lastCall[1].options.plugins.legend.display).toBe(false);
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

    const lastCall = mockedChart.mock.calls[mockedChart.mock.calls.length - 1];
    expect(lastCall[1].options.plugins.title.display).toBe(true);
    expect(lastCall[1].options.plugins.title.text).toBe('Custom Title');
    expect(lastCall[1].options.responsive).toBe(true);
  });

  it('[RED] should have default theme colors defined', () => {
    const colors = component.defaultColors;
    expect(colors.length).toBeGreaterThan(0);
    expect(colors).toContain('#2ecc71');
    expect(colors).toContain('#00B42A');
  });

  it('[RED] should render canvas when data is present', () => {
    fixture.componentRef.setInput('data', {
      labels: ['Jan', 'Feb'],
      datasets: [{ label: 'Test', data: [10, 20] }],
    });
    fixture.detectChanges();
    const canvasEl = fixture.nativeElement.querySelector('canvas');
    expect(canvasEl).toBeTruthy();
  });
});
