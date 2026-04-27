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

  it('should redirect empty path to booking', () => {
    const redirectRoute = routes.find((r) => r.path === '');
    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.redirectTo).toBe('booking');
    expect(redirectRoute?.pathMatch).toBe('full');
  });
});
