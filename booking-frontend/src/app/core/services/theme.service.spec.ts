import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clean up any data-theme attribute on html
    document.documentElement.removeAttribute('data-theme');
    // matchMedia is globally mocked in setup-jest.ts (defaults to matches: false = light)

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('[Red] should initialize isDarkMode signal with false by default (light mode)', () => {
    expect(service.isDarkMode()).toBe(false);
  });

  it('[Red] should initialize data-theme attribute as "light" by default', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('[Red] should toggle isDarkMode from false to true on toggle()', () => {
    service.toggle();
    expect(service.isDarkMode()).toBe(true);
  });

  it('[Red] should toggle isDarkMode from true to false on toggle()', () => {
    service.toggle(); // true
    service.toggle(); // false
    expect(service.isDarkMode()).toBe(false);
  });

  it('[Red] should update data-theme attribute to "dark" when toggling to dark mode', () => {
    service.toggle();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('[Red] should update data-theme attribute to "light" when toggling back to light mode', () => {
    service.toggle(); // dark
    service.toggle(); // light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('[Red] should persist dark mode preference in localStorage', () => {
    service.toggle();
    expect(localStorage.getItem('booking-theme')).toBe('dark');
  });

  it('[Red] should persist light mode preference in localStorage', () => {
    service.toggle(); // dark
    service.toggle(); // light
    expect(localStorage.getItem('booking-theme')).toBe('light');
  });

  it('[Red] should restore dark mode from localStorage on initialization', () => {
    // Set localStorage and reset html attribute
    localStorage.setItem('booking-theme', 'dark');
    document.documentElement.removeAttribute('data-theme');

    // Reset and create new service
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const newService = TestBed.inject(ThemeService);

    expect(newService.isDarkMode()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('[Red] should enable() set dark mode', () => {
    service.enable();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('[Red] should disable() set light mode', () => {
    service.toggle(); // first go to dark
    service.disable();
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('[Red] should not duplicate enable when already dark', () => {
    service.enable();
    service.enable();
    expect(service.isDarkMode()).toBe(true);
  });

  it('[Red] should not duplicate disable when already light', () => {
    service.disable();
    service.disable();
    expect(service.isDarkMode()).toBe(false);
  });

  it('[Red] should add transition style on html element during theme change', () => {
    service.toggle();
    const html = document.documentElement;
    expect(html.style.transition).toContain('background-color');
    expect(html.style.transition).toContain('color');
  });
});
