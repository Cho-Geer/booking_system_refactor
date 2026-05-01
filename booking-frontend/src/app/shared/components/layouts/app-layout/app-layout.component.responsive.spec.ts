import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppLayoutComponent } from './app-layout.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

/**
 * Responsive Design Tests for App Layout
 * Tests: hamburger menu, sidebar drawer, responsive main content spacing
 */
describe('AppLayoutComponent - Responsive Design', () => {
  let component: AppLayoutComponent;
  let fixture: ComponentFixture<AppLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('sidebar drawer toggle', () => {
    it('[RED] should start with sidebar closed', () => {
      expect(component.sidebarOpen).toBe(false);
    });

    it('[RED] should toggle sidebar when onMenuToggle is called', () => {
      component.onMenuToggle();
      expect(component.sidebarOpen).toBe(true);
      component.onMenuToggle();
      expect(component.sidebarOpen).toBe(false);
    });
  });

  describe('responsive main content', () => {
    it('[RED] should render main element with responsive padding classes', () => {
      const mainEl = fixture.nativeElement.querySelector('main');
      expect(mainEl).toBeTruthy();
      // Should have padding that adjusts on mobile/desktop
      expect(mainEl.classList.contains('pt-16')).toBeTruthy();
    });

    it('[RED] should have transition-all class for smooth layout animations', () => {
      const mainEl = fixture.nativeElement.querySelector('main');
      expect(mainEl).toBeTruthy();
      expect(mainEl.classList.contains('transition-all')).toBeTruthy();
      expect(mainEl.classList.contains('duration-300')).toBeTruthy();
    });

    it('[RED] should have max-w-7xl container for content width constraint', () => {
      const container = fixture.nativeElement.querySelector('.max-w-7xl');
      expect(container).toBeTruthy();
    });
  });

  describe('page background', () => {
    it('[RED] should have gradient background', () => {
      const wrapper = fixture.nativeElement.querySelector('.gradient-page-bg');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('page transition animation', () => {
    it('[RED] should have animate-page-enter class on main content wrapper', () => {
      // Use main > div selector to target the content wrapper, not the header's max-w-7xl
      const main = fixture.nativeElement.querySelector('main');
      expect(main).toBeTruthy();
      const container = main.querySelector('.max-w-7xl');
      expect(container).toBeTruthy();
      expect(container.classList.contains('animate-page-enter')).toBe(true);
    });

    it('[RED] should have animation class for pageEnter keyframe', () => {
      const main = fixture.nativeElement.querySelector('main');
      expect(main).toBeTruthy();
      const container = main.querySelector('.max-w-7xl');
      expect(container).toBeTruthy();
      // The container should have animation class applied
      const hasAnimationClass = container.classList.contains('animate-page-enter');
      expect(hasAnimationClass).toBe(true);
    });
  });
});
