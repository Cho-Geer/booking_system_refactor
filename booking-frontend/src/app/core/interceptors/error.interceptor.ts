import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401) {
        notification.error('登录已过期', '请重新登录');
        router.navigate(['/auth/login']);
      } else if (err.status === 403) {
        notification.error('权限不足', '您无权执行此操作');
      } else if (err.status === 429) {
        const retryAfter = err.headers?.get('Retry-After');
        notification.warning('操作过于频繁', retryAfter ? `请在 ${retryAfter} 秒后重试` : '请稍后重试');
      } else if (err.status >= 500) {
        notification.error('服务器错误', '请稍后重试或联系客服');
      }
      return throwError(() => err);
    })
  );
};
