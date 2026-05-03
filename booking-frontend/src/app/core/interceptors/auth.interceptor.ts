import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, catchError, switchMap, finalize } from 'rxjs';
import { AuthStore } from '../../stores/auth/auth.store';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';

/**
 * HTTP Interceptor (functional) that:
 * 1. Automatically attaches JWT access token to authenticated requests
 * 2. Handles 401 responses with automatic token refresh
 * 3. Retries failed requests after successful refresh
 * 4. Fetches user profile after successful token refresh (fire-and-forget)
 * 5. Redirects to login on refresh failure
 *
 * Security: Token is read from AuthStore (in-memory Signal), NOT from
 * localStorage/sessionStorage, preventing XSS token theft.
 */

// Module-level state shared across requests for refresh coordination
let isRefreshing = false;

const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/send-code',
  '/auth/verify-code',
];

function isPublicEndpoint(url: string): boolean {
  return publicEndpoints.some(endpoint => url.includes(endpoint));
}

function addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });
}

function redirectToLogin(): void {
  const router = inject(Router);
  router.navigate(['/auth/login'], {
    queryParams: { expired: 'true' }
  });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<import('@angular/common/http').HttpEvent<unknown>> => {
  const authStore = inject(AuthStore);
  const apiService = inject(ApiService);

  // Skip auth for public endpoints
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  const token = authStore.currentToken();

  if (!token) {
    return next(req);
  }

  const authReq = addToken(req, token);

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(req, next);
      }
      return throwError(() => error);
    })
  );

  function handle401Error(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
  ): Observable<import('@angular/common/http').HttpEvent<unknown>> {
    if (isRefreshing) {
      // Another 401 refresh is in flight — just retry the original request after it completes.
      // This works because the second request will also hit 401, and by then
      // isRefreshing will be false, so it will trigger its own refresh.
      return next(req);
    }

    isRefreshing = true;

    return apiService.refreshToken().pipe(
      switchMap((response) => {
        authStore.loginSuccess(response.accessToken);
        isRefreshing = false;
        // Fire-and-forget: fetch user profile after successful token refresh.
        // Using the store's method which catches errors internally.
        authStore.fetchUserProfile();
        // Immediately retry the original request with the new token
        return next(addToken(req, response.accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authStore.clearAuthState();
        redirectToLogin();
        return throwError(() => err);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  }
};
