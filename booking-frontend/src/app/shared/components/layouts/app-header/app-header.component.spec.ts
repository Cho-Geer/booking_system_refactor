import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppHeaderComponent } from './app-header.component';
import { Component, input } from '@angular/core';
import { MenuItem } from 'primeng/api';

// Stub ThemeToggleComponent
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: '<div>Theme Toggle</div>',
})
class StubThemeToggleComponent {}

describe('AppHeaderComponent', () => {
  let fixture: ComponentFixture<AppHeaderComponent>;
  let component: AppHeaderComponent;

  const defaultNavLinks = [
    { label: 'Home', route: '/', icon: 'pi pi-home' },
    { label: 'Booking', route: '/booking', icon: 'pi pi-calendar' },
  ];

  const defaultMenuItems: MenuItem[] = [
    {
      label: 'User',
      items: [
        { label: 'Profile', icon: 'pi pi-user' },
        { separator: true },
        { label: 'Logout', icon: 'pi pi-sign-out' },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeaderComponent, StubThemeToggleComponent],
    }).overrideComponent(AppHeaderComponent, {
      set: {
        imports: [StubThemeToggleComponent],
      },
    }).compileComponents();

    fixture = TestBed.createComponent(AppHeaderComponent);
    component = fixture.componentInstance;
  });

  function setupDefaultInputs() {
    fixture.componentRef.setInput('navLinks', defaultNavLinks);
    fixture.componentRef.setInput('userName', 'Test User');
    fixture.componentRef.setInput('userRole', 'ADMIN');
    fixture.componentRef.setInput('isAdmin', true);
    fixture.componentRef.setInput('menuItems', defaultMenuItems);
    fixture.componentRef.setInput('notificationCount', 3);
    fixture.detectChanges();
  }

  it('should render header with base classes', () => {
    setupDefaultInputs();
    const header = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
    expect(header.classList.contains('fixed')).toBe(true);
    expect(header.classList.contains('top-0')).toBe(true);
    expect(header.classList.contains('left-0')).toBe(true);
    expect(header.classList.contains('right-0')).toBe(true);
    expect(header.classList.contains('h-16')).toBe(true);
    expect(header.classList.contains('z-50')).toBe(true);
    expect(header.classList.contains('transition-all')).toBe(true);
    expect(header.classList.contains('duration-300')).toBe(true);
    expect(header.classList.contains('shadow-sm')).toBe(true);
  });

  it('should have border-bottom classes', () => {
    setupDefaultInputs();
    const header = fixture.nativeElement.querySelector('header');
    expect(header.classList.contains('border-b')).toBe(true);
    expect(header.classList.contains('border-gray-200')).toBe(true);
  });

  it('should render logo link', () => {
    setupDefaultInputs();
    const logo = fixture.nativeElement.querySelector('a[routerlink="/"]');
    expect(logo).toBeTruthy();
    expect(logo.textContent.trim()).toBe('Booking');
  });

  it('should render navigation links', () => {
    setupDefaultInputs();
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    expect(navLinks.length).toBeGreaterThanOrEqual(2);
    expect(navLinks[0].textContent.trim()).toBe('Home');
    expect(navLinks[1].textContent.trim()).toBe('Booking');
  });

  it('should render notification badge with count', () => {
    setupDefaultInputs();
    const badge = fixture.nativeElement.querySelector('[data-testid="notification-badge"]');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('3');
  });

  it('should render user avatar and name', () => {
    setupDefaultInputs();
    expect(fixture.nativeElement.textContent).toContain('Test User');
  });

  it('should render admin badge when user is admin', () => {
    setupDefaultInputs();
    const adminBadge = fixture.nativeElement.querySelector('[data-testid="admin-badge"]');
    expect(adminBadge).toBeTruthy();
    expect(adminBadge.textContent.trim()).toBe('Admin');
  });

  it('should emit menuToggle when hamburger button is clicked', () => {
    setupDefaultInputs();
    const menuToggleSpy = jest.spyOn(component.menuToggle, 'emit');
    const hamburgerBtn = fixture.nativeElement.querySelector('button[aria-label="Toggle menu"]');
    hamburgerBtn.click();
    expect(menuToggleSpy).toHaveBeenCalledTimes(1);
  });

  it('should render login button when no user', () => {
    fixture.componentRef.setInput('navLinks', defaultNavLinks);
    fixture.componentRef.setInput('userName', undefined);
    fixture.componentRef.setInput('menuItems', defaultMenuItems);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('登录');
  });

  it('should have proper spacing with gap-3 in right section', () => {
    setupDefaultInputs();
    const rightSection = fixture.nativeElement.querySelector('header .flex.items-center.gap-3');
    expect(rightSection).toBeTruthy();
  });

  it('should apply shadow-md class when scrolled', () => {
    setupDefaultInputs();
    const header = fixture.nativeElement.querySelector('header');
    // Initially should only have shadow-sm
    expect(header.classList.contains('shadow-md')).toBe(false);

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 20, writable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    // After scroll, should have shadow-md
    expect(header.classList.contains('shadow-md')).toBe(true);
  });

  it('should have responsive container with max-width', () => {
    setupDefaultInputs();
    const container = fixture.nativeElement.querySelector('header .max-w-7xl');
    expect(container).toBeTruthy();
    expect(container.classList.contains('mx-auto')).toBe(true);
  });
});
