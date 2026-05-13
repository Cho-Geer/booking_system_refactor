import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * API response envelope for translation endpoints.
 */
export interface TranslationApiResponse {
  statusCode: number;
  message: string;
  data: TranslationResponseData;
}

/**
 * Translation response data payload.
 */
export interface TranslationResponseData {
  locale: string;
  updatedAt: string;
  translations?: Record<string, Record<string, string>>;
  changes?: Record<string, string>;
  deleted?: string[];
}

/**
 * Translation API service handling HTTP calls for translations.
 * Used internally by TranslationService for fetching and incremental updates.
 */
@Injectable({ providedIn: 'root' })
export class TranslationApiService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  getTranslations(locale: string, since?: string): Observable<TranslationApiResponse> {
    let params = new HttpParams().set('locale', locale);
    if (since) {
      params = params.set('since', since);
    }
    return this.http.get<TranslationApiResponse>(`${this.apiUrl}/translations`, { params });
  }
}
