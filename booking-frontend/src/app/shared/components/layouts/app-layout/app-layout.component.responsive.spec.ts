import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppLayoutComponent } from './app-layout.component';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { AppHeaderComponent } from '../app-header/app-header.component';

@Component({ template: '', standalone: true })
class DummyComponent {}

/**
 * Responsive Design Tests for App Layout
 */
describe('AppLayoutComponent - Responsive Design', () => {
  let component: AppLayoutComponent;
  let fixture: ComponentFixture<AppLayoutComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent, DummyComponent],
      providers: [
        provideRouter([
          { path: 'admin', component: DummyComponent, children: [{ path: 'dashboard', component: DummyComponent }] },
          { path: 'booking', component: DummyComponent, children: [{ path: 'services', component: DummyComponent }] },
        ]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('sidebar drawer toggle', () => {
    it('[Red] should start with sidebar closed', () => {
      expect(component.sidebarOpen).toBe(false);
    });

    it('[Red] should toggle sidebar when onMenuToggle is called', () => {
      component.onMenuToggle();
      expect(component.sidebarOpen).toBe(true);
      component.onMenuToggle();
      expect(component.sidebarOpen).toBe(false);
    });
  });

  describe('admin route detection', () => {
    it('[Red] should detect admin routes', async () => {
      await router.navigateByUrl('/admin/dashboard');
      fixture.detectChanges();

      expect(component.isAdminRoute()).toBe(true);
    });

    it('[Red] should not detect user routes as admin', async () => {
      await router.navigateByUrl('/booking/services');
      fixture.detectChanges();

      expect(component.isAdminRoute()).toBe(false);
    });
  });

  describe('background modes', () => {
    it('[Red] should apply solid gray background in admin mode', async () => {
      await router.navigateByUrl('/admin/dashboard');
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('[data-testid="layout-wrapper"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper.classList.contains('bg-[#F2F3F5]')).toBe(true);
      expect(wrapper.classList.contains('gradient-page-bg')).toBe(false);
    });

    it('[Red] should apply gradient background in user mode', async () => {
      await router.navigateByUrl('/booking/services');
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('[data-testid="layout-wrapper"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper.classList.contains('gradient-page-bg')).toBe(true);
      expect(wrapper.classList.contains('bg-[#F2F3F5]')).toBe(false);
    });
  });

  describe('sidebar mode', () => {
    it('[Red] should pass solid=true to sidebar in admin mode', async () => {
      await router.navigateByUrl('/admin/dashboard');
      fixture.detectChanges();

      const sidebar = fixture.debugElement.query(By.directive(AppSidebarComponent));
      expect(sidebar).toBeTruthy();
      expect(sidebar.componentInstance.solid()).toBe(true);
    });

    it('[Red] should pass solid=false to sidebar in user mode', async () => {
      await router.navigateByUrl('/booking/services');
      fixture.detectChanges();

      const sidebar = fixture.debugElement.query(By.directive(AppSidebarComponent));
      expect(sidebar).toBeTruthy();
      expect(sidebar.componentInstance.solid()).toBe(false);
    });
  });

  describe('z-index hierarchy', () => {
    it('[Red] should have header with z-50', () => {
      const header = fixture.debugElement.query(By.directive(AppHeaderComponent));
      expect(header).toBeTruthy();
      expect(header.nativeElement.classList.contains('z-50')).toBe(true);
    });

    it('[Red] should have sidebar with z-40', () => {
      const sidebar = fixture.debugElement.query(By.directive(AppSidebarComponent));
      expect(sidebar).toBeTruthy();
      const aside = sidebar.query(By.css('aside'));
      expect(aside.nativeElement.classList.contains('z-40')).toBe(true);
    });
  });

  describe('main content', () => {
    it('[Red] should render main element with responsive padding classes', () => {
      const mainEl = fixture.nativeElement.querySelector('main');
      expect(mainEl).toBeTruthy();
      expect(mainEl.classList.contains('pt-16')).toBeTruthy();
      expect(mainEl.classList.contains('lg:pl-60')).toBeTruthy();
    });

    it('[Red] should have transition-all class for smooth layout animations', () => {
      const mainEl = fixture.nativeElement.querySelector('main');
      expect(mainEl).toBeTruthy();
      expect(mainEl.classList.contains('transition-all')).toBeTruthy();
      expect(mainEl.classList.contains('duration-300')).toBeTruthy();
    });

    it('[Red] should have max-w-7xl container for content width constraint', () => {
      const container = fixture.nativeElement.querySelector('.max-w-7xl');
      expect(container).toBeTruthy();
    });
  });
});

/**
 * AuthStore Integration Tests
 */
describe('AppLayoutComponent - AuthStore Integration', () => {
  let component: AppLayoutComponent;
  let fixture: ComponentFixture<AppLayoutComponent>;
  let authStore: unknown;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent, DummyComponent],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const { AuthStore } = await import('../../../../stores/auth/auth.store');
    authStore = TestBed.inject(AuthStore);

    fixture = TestBed.createComponent(AppLayoutComponent);
    component = fixture.componentInstance;
  });

  describe('user display signals', () => {
    it('[Red] should derive userName from AuthStore.currentUser', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '1',
        name: 'John Doe',
        userType: 'CUSTOMER',
      });
      fixture.detectChanges();
      expect(component.userName()).toBe('John Doe');
    });

    it('[Red] should derive userRole from AuthStore.currentUser', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '2',
        name: 'Admin User',
        userType: 'ADMIN',
      });
      fixture.detectChanges();
      expect(component.userRole()).toBe('ADMIN');
    });

    it('[Red] should be falsy when no user is logged in', () => {
      (authStore as { clearAuthState: () => void }).clearAuthState();
      fixture.detectChanges();
      expect(component.userName()).toBeUndefined();
      expect(component.userRole()).toBeUndefined();
    });
  });

  describe('isAdmin computed signal', () => {
    it('[Red] should be true for ADMIN userType', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '3',
        name: 'Admin',
        userType: 'ADMIN',
      });
      fixture.detectChanges();
      expect(component.isAdmin()).toBe(true);
    });

    it('[Red] should be true for SUPER_ADMIN userType', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '4',
        name: 'Super Admin',
        userType: 'SUPER_ADMIN',
      });
      fixture.detectChanges();
      expect(component.isAdmin()).toBe(true);
    });

    it('[Red] should be false for CUSTOMER userType', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '5',
        name: 'Customer',
        userType: 'CUSTOMER',
      });
      fixture.detectChanges();
      expect(component.isAdmin()).toBe(false);
    });
  });

  describe('navLinks computed signal', () => {
    it('[Red] should return customer nav links for CUSTOMER role', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '6',
        name: 'Customer',
        userType: 'CUSTOMER',
      });
      fixture.detectChanges();

      const links = component.navLinks();
      expect(links.length).toBeGreaterThanOrEqual(3);
      expect(links.some((l) => l.route.includes('booking'))).toBe(true);
      expect(links.some((l) => l.route.includes('my-bookings'))).toBe(true);
      expect(links.some((l) => l.route.includes('profile'))).toBe(true);
      expect(links.some((l) => l.route.includes('admin'))).toBe(false);
    });

    it('[Red] should return admin nav links for ADMIN role', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '7',
        name: 'Admin',
        userType: 'ADMIN',
      });
      fixture.detectChanges();

      const links = component.navLinks();
      expect(links.length).toBeGreaterThanOrEqual(4);
      expect(links.some((l) => l.route.includes('admin'))).toBe(true);
      expect(links.some((l) => l.route.includes('booking'))).toBe(true);
      expect(links.some((l) => l.route.includes('my-bookings'))).toBe(true);
      expect(links.some((l) => l.route.includes('profile'))).toBe(true);
    });
  });

  describe('sidebarItems computed signal', () => {
    it('[Red] should return customer sidebar items for CUSTOMER role', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '8',
        name: 'Customer',
        userType: 'CUSTOMER',
      });
      fixture.detectChanges();

      const items = component.sidebarItems();
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.some((i) => i.route.includes('booking'))).toBe(true);
      expect(items.some((i) => i.route.includes('my-bookings'))).toBe(true);
      expect(items.some((i) => i.route.includes('profile'))).toBe(true);
      expect(items.some((i) => i.route.includes('admin'))).toBe(false);
    });

    it('[Red] should return admin sidebar items for ADMIN role', () => {
      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '9',
        name: 'Admin',
        userType: 'ADMIN',
      });
      fixture.detectChanges();

      const items = component.sidebarItems();
      expect(items.length).toBeGreaterThanOrEqual(4);
      expect(items.some((i) => i.route.includes('admin'))).toBe(true);
    });
  });

  describe('onLogout', () => {
    it('[Red] should call authStore.logout, clear user, and navigate to /auth/login', async () => {
      const router = TestBed.inject(await import('@angular/router').then((m) => m.Router));
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      (authStore as { setUserProfile: (u: { id: string; name: string; userType: string }) => void }).setUserProfile({
        id: '10',
        name: 'Logout User',
        userType: 'CUSTOMER',
      });
      fixture.detectChanges();

      await component.onLogout();

      expect(component.userName()).toBeUndefined();
      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
