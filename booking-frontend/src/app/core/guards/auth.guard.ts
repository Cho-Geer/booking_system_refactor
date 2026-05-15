import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth/auth.store';

/**
 * Functional route guard that checks authentication status.
 *
 * - Returns `true` when the user is authenticated.
 * - Redirects to `/auth/login` with a `returnUrl` query param when not
 *   authenticated, so the login flow can send the user back to the page
 *   they originally requested.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });

  return false;
};
