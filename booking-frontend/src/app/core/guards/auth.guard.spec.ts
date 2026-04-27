import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth/auth.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let router: Router;

  function setup(authenticated: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            isAuthenticated: () => authenticated,
          },
        },
      ],
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  }

  function createRouteSnapshot() {
    return {} as any;
  }

  function createRouterState(url: string) {
    return { url } as any;
  }

  it('should allow navigation when authenticated', fakeAsync(() => {
    setup(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(createRouteSnapshot(), createRouterState('/some-route'))
    );

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    flushMicrotasks();
  }));

  it('should redirect to /auth/login when not authenticated', fakeAsync(() => {
    setup(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(createRouteSnapshot(), createRouterState('/dashboard'))
    );

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
    flushMicrotasks();
  }));

  it('should preserve attempted URL for post-login redirect', fakeAsync(() => {
    setup(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(createRouteSnapshot(), createRouterState('/booking/123?tab=details'))
    );

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/booking/123?tab=details' },
    });
    flushMicrotasks();
  }));
});
