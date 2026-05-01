import { RouteResolver } from './route-resolver.service';

describe('RouteResolver', () => {
  it('should return /admin/dashboard for ADMIN role', () => {
    const route = RouteResolver.getPostLoginRoute('ADMIN');
    expect(route).toBe('/admin/dashboard');
  });

  it('should return /admin/dashboard for SUPER_ADMIN role', () => {
    const route = RouteResolver.getPostLoginRoute('SUPER_ADMIN');
    expect(route).toBe('/admin/dashboard');
  });

  it('should return /booking for CUSTOMER role', () => {
    const route = RouteResolver.getPostLoginRoute('CUSTOMER');
    expect(route).toBe('/booking');
  });

  it('should return /booking for UNKNOWN role as default', () => {
    const route = RouteResolver.getPostLoginRoute('UNKNOWN');
    expect(route).toBe('/booking');
  });

  it('should return /booking when role is undefined', () => {
    const route = RouteResolver.getPostLoginRoute(undefined);
    expect(route).toBe('/booking');
  });

  it('should return /booking when role is null', () => {
    const route = RouteResolver.getPostLoginRoute(null as unknown as string);
    expect(route).toBe('/booking');
  });

  it('should return /booking when role is empty string', () => {
    const route = RouteResolver.getPostLoginRoute('');
    expect(route).toBe('/booking');
  });
});
