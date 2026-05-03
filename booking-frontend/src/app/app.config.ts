import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { requestIdInterceptor } from './core/interceptors/request-id.interceptor';
import { apiTransformInterceptor } from './core/interceptors/api-transform.interceptor';
import { AuthStore } from './stores/auth/auth.store';

/**
 * App initializer that attempts to restore the user session on bootstrap.
 * Calls authStore.restoreSession() which tries to refresh the access token
 * from the HttpOnly cookie. If no cookie exists (guest user), fails silently.
 */
function initializeAuth(): () => Promise<boolean> {
  const authStore = inject(AuthStore);
  return () => authStore.restoreSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, apiTransformInterceptor, requestIdInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '[data-theme="dark"]',
        },
      },
    }),
  ],
};
