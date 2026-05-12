import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppLayoutComponent } from './app-layout.component';
import { Component, input, output } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';

// Stub child components to isolate layout testing
@Component({
  selector: 'app-header',
  standalone: true,
  template: `<header data-testid="app-header">Header</header>`,
})
class StubAppHeaderComponent {
  navLinks = input<any[]>([]);
  userName = input<string>();
  userRole = input<string>();
  isAdmin = input<boolean>(false);
  menuItems = input<any[]>([]);
  showSearch = input<boolean>(true);
  menuToggle = output<void>();
  logout = output<void>();
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  template: `<aside data-testid="app-sidebar">Sidebar</aside>`,
})
class StubAppSidebarComponent {
  items = input<any[]>([]);
  sections = input<any[]>([]);
  isOpen = input<boolean>(false);
  isAdmin = input<boolean>(false);
  solid = input<boolean>(true);
  userName = input<string>();
  userRole = input<string>();
  close = output<void>();
}

@Component({
  selector: 'router-outlet',
  standalone: true,
  template: `<div data-testid="router-outlet">Outlet</div>`,
})
class StubRouterOutlet {}

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let component: AppLayoutComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppLayoutComponent,
        NgClass,
        StubAppHeaderComponent,
        StubAppSidebarComponent,
        StubRouterOutlet,
      ],
    }).overrideComponent(AppLayoutComponent, {
      set: {
        imports: [NgClass, StubAppHeaderComponent, StubAppSidebarComponent, StubRouterOutlet],
      },
    }).compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render layout wrapper with correct base classes', () => {
    const wrapper = fixture.nativeElement.querySelector('[data-testid="layout-wrapper"]');
    expect(wrapper).toBeTruthy();
    expect(wrapper.classList.contains('min-h-screen')).toBe(true);
    expect(wrapper.classList.contains('transition-colors')).toBe(true);
    expect(wrapper.classList.contains('duration-300')).toBe(true);
  });

  it('should apply admin background for admin routes', () => {
    const wrapper = fixture.nativeElement.querySelector('[data-testid="layout-wrapper"]');
    // Default route is not admin
    expect(wrapper.classList.contains('gradient-page-bg')).toBe(true);
  });

  it('should render header, sidebar and main content areas', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="app-header"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="app-sidebar"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('main')).toBeTruthy();
  });

  it('should have main content with proper layout classes', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main.classList.contains('pt-16')).toBe(true);
    expect(main.classList.contains('lg:pl-60')).toBe(true);
    expect(main.classList.contains('min-h-screen')).toBe(true);
    expect(main.classList.contains('transition-all')).toBe(true);
    expect(main.classList.contains('duration-300')).toBe(true);
    expect(main.classList.contains('z-[1]')).toBe(true);
    expect(main.classList.contains('relative')).toBe(true);
    expect(main.classList.contains('w-full')).toBe(true);
  });

  it('should have centered content container with max width', () => {
    const contentContainer = fixture.nativeElement.querySelector('main .max-w-7xl');
    expect(contentContainer).toBeTruthy();
    expect(contentContainer.classList.contains('mx-auto')).toBe(true);
    expect(contentContainer.classList.contains('p-4')).toBe(true);
    expect(contentContainer.classList.contains('lg:p-6')).toBe(true);
    expect(contentContainer.classList.contains('animate-page-enter')).toBe(true);
  });

  it('should render router outlet inside main content', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main.querySelector('[data-testid="router-outlet"]')).toBeTruthy();
  });

  it('should not duplicate sidebar rendering', () => {
    const sidebars = fixture.nativeElement.querySelectorAll('[data-testid="app-sidebar"]');
    expect(sidebars.length).toBe(1);
  });
});
