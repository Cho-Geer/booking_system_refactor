import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth/auth.store';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
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

  it('should allow navigation when NOT authenticated (guest)', fakeAsync(() => {
    setup(false);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(createRouteSnapshot(), createRouterState('/auth/login'))
    );

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    flushMicrotasks();
  }));

  it('should redirect to /booking when already authenticated', fakeAsync(() => {
    setup(true);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(createRouteSnapshot(), createRouterState('/auth/login'))
    );

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/booking']);
    flushMicrotasks();
  }));

  it('should redirect to /booking when accessing /auth/register while authenticated', fakeAsync(() => {
    setup(true);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(createRouteSnapshot(), createRouterState('/auth/register'))
    );

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/booking']);
    flushMicrotasks();
  }));
});
