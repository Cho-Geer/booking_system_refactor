import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppSpinnerComponent } from './app-spinner.component';
import { ProgressSpinner } from 'primeng/progressspinner';

describe('AppSpinnerComponent', () => {
  let component: AppSpinnerComponent;
  let fixture: ComponentFixture<AppSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSpinnerComponent, ProgressSpinner],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSpinnerComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render SVG element for spinner', () => {
    fixture.detectChanges();
    const svgEl = fixture.nativeElement.querySelector('svg');
    expect(svgEl).toBeTruthy();
  });

  it('should render circle element inside spinner', () => {
    fixture.detectChanges();
    const svgEl = fixture.nativeElement.querySelector('svg');
    expect(svgEl).toBeTruthy();
    const circleEl = svgEl.querySelector('circle');
    expect(circleEl).toBeTruthy();
  });

  it('should set default strokeWidth', () => {
    expect(component.strokeWidth()).toBe('4');
  });

  it('should set default fill', () => {
    expect(component.fill()).toBe('transparent');
  });

  it('should set default animationDuration', () => {
    expect(component.animationDuration()).toBe('2s');
  });

  it('should set default ariaLabel', () => {
    expect(component.ariaLabel()).toBe('loading');
  });

  it('should forward custom strokeWidth input', () => {
    fixture.componentRef.setInput('strokeWidth', '5');
    fixture.detectChanges();
    expect(component.strokeWidth()).toBe('5');
  });

  it('should forward custom fill input', () => {
    fixture.componentRef.setInput('fill', '#1976d2');
    fixture.detectChanges();
    expect(component.fill()).toBe('#1976d2');
  });

  it('should forward custom animationDuration input', () => {
    fixture.componentRef.setInput('animationDuration', '2s');
    fixture.detectChanges();
    expect(component.animationDuration()).toBe('2s');
  });

  it('should forward custom ariaLabel input', () => {
    fixture.componentRef.setInput('ariaLabel', 'Loading');
    fixture.detectChanges();
    expect(component.ariaLabel()).toBe('Loading');
  });

  it('should forward custom styleClass input', () => {
    fixture.componentRef.setInput('styleClass', 'w-8 h-8');
    fixture.detectChanges();
    expect(component.styleClass()).toBe('w-8 h-8');
  });
});
