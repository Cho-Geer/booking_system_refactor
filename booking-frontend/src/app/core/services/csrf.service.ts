import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, finalize, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CsrfService {
  private http = inject(HttpClient);
  private csrfToken: string | null = null;
  private fetchInProgress$: Observable<string> | null = null;

  fetchToken(): Observable<string> {
    return this.http.get<{ token: string }>('/api/csrf/token').pipe(
      map((response) => {
        this.csrfToken = response.token;
        return response.token;
      }),
    );
  }

  ensureToken(): Observable<string> {
    if (this.csrfToken) {
      return of(this.csrfToken);
    }
    if (!this.fetchInProgress$) {
      this.fetchInProgress$ = this.fetchToken().pipe(
        finalize(() => {
          this.fetchInProgress$ = null;
        }),
        shareReplay(1),
      );
    }
    return this.fetchInProgress$;
  }

  getToken(): string | null {
    return this.csrfToken;
  }

  clearToken(): void {
    this.csrfToken = null;
  }
}
