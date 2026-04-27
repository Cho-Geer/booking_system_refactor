import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap, catchError } from 'rxjs/operators';
import { CsrfService } from '../services/csrf.service';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const csrfService = inject(CsrfService);
    const token = csrfService.getToken();
    if (token) {
      const cloned = req.clone({
        setHeaders: { 'X-CSRF-Token': token },
      });
      return next(cloned);
    }
    return csrfService.ensureToken().pipe(
      switchMap((newToken) => {
        const cloned = req.clone({
          setHeaders: { 'X-CSRF-Token': newToken },
        });
        return next(cloned);
      }),
      catchError(() => next(req)),
    );
  }
  return next(req);
};
