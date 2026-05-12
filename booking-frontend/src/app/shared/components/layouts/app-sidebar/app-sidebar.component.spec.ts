import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppSidebarComponent, SidebarItem, SidebarSection } from './app-sidebar.component';
import { provideRouter, RouterLink, RouterLinkActive } from '@angular/router';
import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

// Stub p-avatar
@Component({
  selector: 'p-avatar',
  standalone: true,
  template: '<div class="avatar-stub">{{ label()?.charAt(0) }}</div>',
})
class StubAvatarComponent {
  label = input<string>();
}

describe('AppSidebarComponent', () => {
  let fixture: ComponentFixture<AppSidebarComponent>;
  let component: AppSidebarComponent;

  const mockItems: SidebarItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'pi pi-chart-bar' },
    { label: 'Services', route: '/services', icon: 'pi pi-calendar' },
  ];

  const mockSections: SidebarSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', route: '/admin/dashboard', icon: 'pi pi-chart-bar' },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Services', route: '/services', icon: 'pi pi-calendar' },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarComponent, StubAvatarComponent],
      providers: [
        provideRouter([]),
      ],
    }).overrideComponent(AppSidebarComponent, {
      set: {
        imports: [NgClass, RouterLink, RouterLinkActive, StubAvatarComponent],
      },
    }).compileComponents();

    fixture = TestBed.createComponent(AppSidebarComponent);
    component = fixture.componentInstance;
  });

  it('should render desktop sidebar with correct base classes', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const desktopSidebar = fixture.nativeElement.querySelector('aside');
    expect(desktopSidebar).toBeTruthy();
    expect(desktopSidebar.classList.contains('hidden')).toBe(true);
    expect(desktopSidebar.classList.contains('lg:flex')).toBe(true);
    expect(desktopSidebar.classList.contains('flex-col')).toBe(true);
    expect(desktopSidebar.classList.contains('w-60')).toBe(true);
    expect(desktopSidebar.classList.contains('bg-card-bg')).toBe(true);
    expect(desktopSidebar.classList.contains('border-r')).toBe(true);
    expect(desktopSidebar.classList.contains('border-border-color')).toBe(true);
  });

  it('should render flat navigation items when no sections', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).toContain('Services');
  });

  it('should render sectioned navigation with titles', () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('sections', mockSections);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const sectionTitles = fixture.nativeElement.querySelectorAll('[data-testid="section-title"]');
    expect(sectionTitles.length).toBe(2);
    expect(sectionTitles[0].textContent.trim()).toBe('Main');
    expect(sectionTitles[1].textContent.trim()).toBe('Management');
  });

  it('should render user profile at bottom with border-top', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('userName', 'John Doe');
    fixture.componentRef.setInput('userRole', 'ADMIN');
    fixture.detectChanges();

    const profile = fixture.nativeElement.querySelector('[data-testid="sidebar-profile"]');
    expect(profile).toBeTruthy();
    expect(profile.classList.contains('border-t')).toBe(true);
    expect(profile.classList.contains('border-border-color')).toBe(true);
    expect(profile.classList.contains('p-4')).toBe(true);
  });

  it('should display user name and role in profile', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('userName', 'John Doe');
    fixture.componentRef.setInput('userRole', 'ADMIN');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('John Doe');
    expect(fixture.nativeElement.textContent).toContain('ADMIN');
  });

  it('should render mobile overlay when isOpen is true', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('[data-testid="mobile-overlay"]');
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('fixed')).toBe(true);
    expect(overlay.classList.contains('inset-0')).toBe(true);
    expect(overlay.classList.contains('bg-black/60')).toBe(true);
    expect(overlay.classList.contains('backdrop-blur-sm')).toBe(true);
    expect(overlay.classList.contains('z-40')).toBe(true);
    expect(overlay.classList.contains('lg:hidden')).toBe(true);
  });

  it('should render mobile drawer when isOpen is true', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('[data-testid="mobile-drawer"]');
    expect(drawer).toBeTruthy();
    expect(drawer.classList.contains('fixed')).toBe(true);
    expect(drawer.classList.contains('top-0')).toBe(true);
    expect(drawer.classList.contains('left-0')).toBe(true);
    expect(drawer.classList.contains('bottom-0')).toBe(true);
    expect(drawer.classList.contains('w-64')).toBe(true);
    expect(drawer.classList.contains('z-50')).toBe(true);
    expect(drawer.classList.contains('lg:hidden')).toBe(true);
    expect(drawer.classList.contains('translate-x-0')).toBe(true);
    expect(drawer.classList.contains('bg-card-bg')).toBe(true);
    expect(drawer.classList.contains('border-r')).toBe(true);
    expect(drawer.classList.contains('border-border-color')).toBe(true);
  });

  it('should have mobile drawer hidden when isOpen is false', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('[data-testid="mobile-drawer"]');
    expect(drawer.classList.contains('-translate-x-full')).toBe(true);
  });

  it('should emit close event when overlay is clicked', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const closeSpy = jest.spyOn(component.close, 'emit');
    const overlay = fixture.nativeElement.querySelector('[data-testid="mobile-overlay"]');
    overlay.click();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should not render profile section when no userName', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('userName', undefined);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="sidebar-profile"]')).toBeFalsy();
  });

  it('should have z-40 class on desktop sidebar', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside.classList.contains('z-40')).toBe(true);
  });

  it('should apply solid background class when solid input is true', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('solid', true);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside.classList.contains('bg-[#162032]')).toBe(true);
  });

  it('should apply non-solid background class when solid input is false', () => {
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('sections', []);
    fixture.componentRef.setInput('solid', false);
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside.classList.contains('bg-card-bg')).toBe(true);
  });
});
