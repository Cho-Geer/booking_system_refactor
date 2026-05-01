import { HttpInterceptorFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

const snakeCaseRe = /_([a-z])/g;
const camelCaseRe = /([a-z])_([a-z])/g;

function toCamelCase(str: string): string {
  return str.replace(snakeCaseRe, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function isPiiField(key: string): boolean {
  return ['emailHash', 'phoneHash', 'emailEncrypted', 'phoneEncrypted', 'passwordHash'].includes(key);
}

function transformKeys(obj: unknown, transform: (key: string) => string, skipKeys?: Set<string>): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => transformKeys(item, transform, skipKeys));
  if (typeof obj !== 'object') return obj;

  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
      if (skipKeys?.has(key)) return [key, value];
      const newKey = transform(key);
      return [newKey, transformKeys(value, transform, skipKeys)];
    })
  );
}

const PII_SKIP = new Set(['emailHash', 'phoneHash', 'emailEncrypted', 'phoneEncrypted', 'passwordHash']);

export const apiTransformInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  // Auth endpoints use camelCase on the wire (per contract.yaml §10 naming_convention).
  // Only convert non-auth requests: camelCase → snake_case
  const isAuthUrl = req.url.includes('/auth/');
  const transformedReq = req.clone({
    body: !isAuthUrl && req.body && typeof req.body === 'object' && !(req.body instanceof FormData)
      ? transformKeys(req.body, toSnakeCase, PII_SKIP) as typeof req.body
      : req.body,
  });

  // Response: snake_case → camelCase
  return next(transformedReq).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        const body = event.body;
        if (body && typeof body === 'object') {
          return event.clone({ body: transformKeys(body, toCamelCase) });
        }
      }
      return event;
    })
  );
};
