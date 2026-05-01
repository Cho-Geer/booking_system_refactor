import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../stores/auth/auth.store';

export function roleGuard(config: {
  allow?: string[];
  deny?: string[];
  redirectTo?: string;
}): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    const user = authStore.currentUser();

    if (!user) {
      router.navigate(['/auth/login']);
      return false;
    }

    if (config.deny && config.deny.includes(user.userType)) {
      router.navigate([config.redirectTo || '/']);
      return false;
    }

    if (config.allow && !config.allow.includes(user.userType)) {
      router.navigate([config.redirectTo || '/']);
      return false;
    }

    return true;
  };
}
