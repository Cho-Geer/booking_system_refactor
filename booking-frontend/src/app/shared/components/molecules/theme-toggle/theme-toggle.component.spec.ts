import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '../../../../core/services/theme.service';
import { By } from '@angular/platform-browser';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    // matchMedia is globally mocked in setup-jest.ts (defaults to matches: false = light)

    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [ThemeService],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('[Red] should render a toggle button', () => {
    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn).toBeTruthy();
  });

  it('[Red] should show sun icon when in dark mode (isDarkMode=true)', () => {
    // Set to dark mode first
    themeService.enable();
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn).toBeTruthy();
    // In dark mode, should show sun icon (to switch to light)
    const sunIcon = fixture.debugElement.query(By.css('.pi-sun'));
    expect(sunIcon).toBeTruthy();
  });

  it('[Red] should show moon icon when in light mode (isDarkMode=false)', () => {
    // Ensure light mode
    themeService.disable();
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn).toBeTruthy();
    // In light mode, should show moon icon (to switch to dark)
    const moonIcon = fixture.debugElement.query(By.css('.pi-moon'));
    expect(moonIcon).toBeTruthy();
  });

  it('[Red] should toggle theme when clicked', () => {
    const initialMode = themeService.isDarkMode();
    const btn = fixture.debugElement.query(By.css('button'));
    btn.nativeElement.click();
    expect(themeService.isDarkMode()).toBe(!initialMode);
  });

  it('[Red] should have correct tooltip in light mode: "Switch to Dark Mode"', () => {
    themeService.disable();
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn.nativeElement.getAttribute('aria-label')).toBe('Switch to Dark Mode');
  });

  it('[Red] should have correct tooltip in dark mode: "Switch to Light Mode"', () => {
    themeService.enable();
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn.nativeElement.getAttribute('aria-label')).toBe('Switch to Light Mode');
  });

  it('[Red] should have min-touch-target class for accessibility', () => {
    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn.nativeElement.classList.contains('min-touch-target')).toBe(true);
  });

  it('[Red] should have rounded-xl styling', () => {
    const btn = fixture.debugElement.query(By.css('button'));
    const classes = btn.nativeElement.className;
    expect(classes).toContain('rounded-xl');
  });
});
