import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';
import * as crypto from 'crypto';
import { formatTimestampWithTimezone } from '../utils/timezone.util';

export interface StandardResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

/**
 * 统一响应拦截器：将所有成功响应包装为标准格式。
 * requestId 从 CLS（Continuation Local Storage）中获取，
 * 确保与 RequestIdInterceptor 设置的值一致。
 *
 * 注册顺序说明：
 * APP_INTERCEPTOR 以"后注册先执行"顺序运行（栈式），
 * ResponseInterceptor 应最先注册（最后执行），从而包装最终响应。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<StandardResponse<T>> {
    const requestId = this.cls.get<string>('requestId') ?? `req-${crypto.randomUUID()}`;
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();
    const statusCode = response.statusCode;
    const timezone = request.headers?.['x-timezone'] as string | undefined;

    return next.handle().pipe(
      map((data) => {
        let message = 'OK';
        let cleanData = data;

        if (data && typeof data === 'object' && '_message' in (data as Record<string, unknown>)) {
          const d = data as Record<string, unknown>;
          message = (d._message as string) ?? 'OK';
          const { _message, ...rest } = d;
          cleanData = rest as T;
        }

        return {
          statusCode,
          message,
          data: cleanData,
          timestamp: formatTimestampWithTimezone(timezone),
          requestId,
        };
      }),
    );
  }
}
