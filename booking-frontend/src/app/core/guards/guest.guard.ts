import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth/auth.store';
import { RouteResolver } from '../services/route-resolver.service';

/**
 * Functional route guard that restricts access to guest-only pages.
 *
 * - Returns `true` when the user is NOT authenticated (guest).
 * - Redirects to role-specific default route when already authenticated.
 */
export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return true;
  }

  router.navigate([RouteResolver.getPostLoginRoute(authStore.currentUser()?.userType)]);
  return false;
};
