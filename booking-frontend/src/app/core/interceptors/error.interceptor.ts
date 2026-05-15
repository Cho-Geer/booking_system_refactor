import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { TranslationService } from '../services/translation.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notification = inject(NotificationService);
  const translation = inject(TranslationService);

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401) {
        notification.error(
          translation.t('errors', 'sessionExpired'),
          translation.t('errors', 'sessionExpired.message'),
        );
        router.navigate(['/auth/login']);
      } else if (err.status === 403) {
        notification.error(
          translation.t('errors', 'forbidden'),
          translation.t('errors', 'forbidden.message'),
        );
      } else if (err.status === 429) {
        const retryAfter = err.headers?.get('Retry-After');
        notification.warning(
          translation.t('errors', 'rateLimited'),
          retryAfter
            ? translation.t('errors', 'rateLimited.message', { seconds: retryAfter })
            : translation.t('errors', 'tryAgain'),
        );
      } else if (err.status >= 500) {
        notification.error(
          translation.t('errors', 'serverError'),
          translation.t('errors', 'serverError.message'),
        );
      }
      return throwError(() => err);
    })
  );
};
