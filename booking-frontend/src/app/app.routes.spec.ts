import { routes } from './app.routes';

describe('App Routes', () => {
  it('should define routes array', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have an auth lazy-loaded route', () => {
    const authRoute = routes.find((r) => r.path === 'auth');
    expect(authRoute).toBeDefined();
    expect(authRoute?.loadChildren).toBeDefined();
  });

  it('should have a booking lazy-loaded route', () => {
    const bookingRoute = routes.find((r) => r.path === 'booking');
    expect(bookingRoute).toBeDefined();
    expect(bookingRoute?.loadChildren).toBeDefined();
  });

  it('should have a my-bookings lazy-loaded route', () => {
    const myBookingsRoute = routes.find((r) => r.path === 'my-bookings');
    expect(myBookingsRoute).toBeDefined();
    expect(myBookingsRoute?.loadChildren).toBeDefined();
  });

  it('should have a profile lazy-loaded route', () => {
    const profileRoute = routes.find((r) => r.path === 'profile');
    expect(profileRoute).toBeDefined();
    expect(profileRoute?.loadChildren).toBeDefined();
  });

  it('should have an admin lazy-loaded route', () => {
    const adminRoute = routes.find((r) => r.path === 'admin');
    expect(adminRoute).toBeDefined();
    expect(adminRoute?.loadChildren).toBeDefined();
  });

  it('should have a legal lazy-loaded route', () => {
    const legalRoute = routes.find((r) => r.path === 'legal');
    expect(legalRoute).toBeDefined();
    expect(legalRoute?.loadChildren).toBeDefined();
  });

  it('should redirect empty path to booking', () => {
    const redirectRoute = routes.find((r) => r.path === '');
    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.redirectTo).toBe('booking');
    expect(redirectRoute?.pathMatch).toBe('full');
  });
});
