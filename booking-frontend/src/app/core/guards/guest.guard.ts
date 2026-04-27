import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth/auth.store';

/**
 * Functional route guard that restricts access to guest-only pages.
 *
 * - Returns `true` when the user is NOT authenticated (guest).
 * - Redirects to `/booking` and returns `false` when already authenticated,
 *   preventing logged-in users from accessing login/register pages.
 */
export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return true;
  }

  router.navigate(['/booking']);

  return false;
};
