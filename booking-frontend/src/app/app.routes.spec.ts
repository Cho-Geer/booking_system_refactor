import { routes } from './app.routes';
import { AppLayoutComponent } from './shared/components/layouts/app-layout/app-layout.component';

describe('App Routes', () => {
  it('should define routes array', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  // ── Public routes (outside layout, no header/sidebar) ──

  describe('public routes (no layout)', () => {
    it('should have auth route at root level', () => {
      const authRoute = routes.find((r) => r.path === 'auth');
      expect(authRoute).toBeDefined();
      expect(authRoute?.loadChildren).toBeDefined();
      expect(authRoute?.component).toBeUndefined();
    });

    it('should have legal route at root level', () => {
      const legalRoute = routes.find((r) => r.path === 'legal');
      expect(legalRoute).toBeDefined();
      expect(legalRoute?.loadChildren).toBeDefined();
      expect(legalRoute?.component).toBeUndefined();
    });
  });

  // ── Authenticated routes (wrapped in AppLayoutComponent) ──

  describe('authenticated layout wrapper', () => {
    let layoutRoute: (typeof routes)[number] | undefined;

    beforeEach(() => {
      layoutRoute = routes.find((r) => r.path === '' && r.component === AppLayoutComponent);
    });

    it('should have an empty-path route with AppLayoutComponent', () => {
      expect(layoutRoute).toBeDefined();
      expect(layoutRoute!.component).toBe(AppLayoutComponent);
    });

    it('should have children defined inside the layout route', () => {
      expect(layoutRoute?.children).toBeDefined();
      expect(layoutRoute!.children!.length).toBeGreaterThan(0);
    });

    it('should have booking as child route under layout', () => {
      const bookingChild = layoutRoute?.children?.find((c) => c.path === 'booking');
      expect(bookingChild).toBeDefined();
      expect(bookingChild!.loadChildren).toBeDefined();
    });

    it('should have my-bookings as child route under layout', () => {
      const child = layoutRoute?.children?.find((c) => c.path === 'my-bookings');
      expect(child).toBeDefined();
      expect(child!.loadChildren).toBeDefined();
    });

    it('should have profile as child route under layout', () => {
      const child = layoutRoute?.children?.find((c) => c.path === 'profile');
      expect(child).toBeDefined();
      expect(child!.loadChildren).toBeDefined();
    });

    it('should have admin as child route under layout', () => {
      const child = layoutRoute?.children?.find((c) => c.path === 'admin');
      expect(child).toBeDefined();
      expect(child!.loadChildren).toBeDefined();
    });

    it('should redirect empty child path to booking inside layout', () => {
      const redirectChild = layoutRoute?.children?.find((c) => c.path === '');
      expect(redirectChild).toBeDefined();
      expect(redirectChild!.redirectTo).toBe('booking');
      expect(redirectChild!.pathMatch).toBe('full');
    });
  });

  // ── Wildcard (404) must stay outside layout ──

  describe('404 wildcard route', () => {
    it('should have wildcard route at root level (outside layout)', () => {
      const wildcardRoute = routes.find((r) => r.path === '**');
      expect(wildcardRoute).toBeDefined();
      expect(wildcardRoute!.component).toBeDefined();
    });

    it('should NOT have wildcard inside the layout children', () => {
      const layoutRoute = routes.find((r) => r.path === '' && r.component === AppLayoutComponent);
      const wildcardChild = layoutRoute?.children?.find((c) => c.path === '**');
      expect(wildcardChild).toBeUndefined();
    });
  });

  // ── Ensure specific routes do NOT appear at root level (they're inside layout) ──

  describe('route isolation', () => {
    it('should NOT have booking at root level (it is inside layout)', () => {
      const rootBooking = routes.find((r) => r.path === 'booking');
      expect(rootBooking).toBeUndefined();
    });

    it('should NOT have my-bookings at root level (it is inside layout)', () => {
      const rootMyBookings = routes.find((r) => r.path === 'my-bookings');
      expect(rootMyBookings).toBeUndefined();
    });

    it('should NOT have profile at root level (it is inside layout)', () => {
      const rootProfile = routes.find((r) => r.path === 'profile');
      expect(rootProfile).toBeUndefined();
    });

    it('should NOT have admin at root level (it is inside layout)', () => {
      const rootAdmin = routes.find((r) => r.path === 'admin');
      expect(rootAdmin).toBeUndefined();
    });
  });
});
