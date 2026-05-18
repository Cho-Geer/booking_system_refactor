import { Injectable, inject, OnDestroy, signal } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  TranslationApiService,
  TranslationResponseData,
} from './translation-api.service';
import { SocketService } from './socket.service';

/**
 * Central translation service for the booking frontend.
 *
 * Provides:
 * - Fetching translations from the API (full load or incremental via `since`)
 * - Caching translations in localStorage under `app_translations_{locale}`
 * - Signal-based reactive state for `translations` and `locale`
 * - `t()` lookup with `{param}` interpolation and `{{domain.key}}` fallback
 * - 5-minute polling to keep translations fresh
 */
@Injectable({ providedIn: 'root' })
export class TranslationService implements OnDestroy {
  /** Reactive translations store: domain → key → translated string. */
  readonly translations = signal<Record<string, Record<string, string>>>({});

  /** Reactive locale string, defaults to 'en'. */
  readonly locale = signal<string>('en');

  /** Timestamp of the last full translation load. Used as polling `since` value. */
  private lastUpdated: string | null = null;

  /** Interval handle for the 5-minute polling timer. */
  private pollingTimer?: ReturnType<typeof setInterval>;

  /** API service for HTTP calls. */
  private api = inject(TranslationApiService);

  /** WebSocket service for real-time events. */
  private socketService = inject(SocketService);

  /** Subscription to WebSocket translation update events. */
  private wsSubscription?: Subscription;

  /** Hardcoded English fallbacks for critical keys when translations are not loaded. */
  private static readonly FALLBACK_MAP: Record<string, Record<string, string>> = {
    errors: {
      sessionExpired: 'Session expired. Please log in again.',
      unauthorized: 'You do not have permission.',
      serverError: 'Server error. Please try again later.',
      networkError: 'Network error. Please check your connection.',
    },
    admin: {
      'appointments.noTimeSlots': 'No time slots available. Please reselect a new date.',
      'appointments.batchCancelTitle': 'Batch Cancel Appointments',
      'appointments.batchCancelConfirm': 'Are you sure you want to cancel {count} appointment(s)? This action cannot be undone.',
      'appointments.batchCancelReasonPlaceholder': 'Enter cancellation reason (optional)',
      'appointments.confirmBatchCancel': 'Confirm Batch Cancel',
      'services.confirmDisable': 'Disable Service',
      'services.disableWarningMessage': 'This will cancel {pending} pending appointment(s). {confirmed} confirmed appointment(s) remain unchanged.',
      'services.disablePending': '{count} pending appointment(s) will be cancelled',
      'services.disableConfirmed': '{count} confirmed appointment(s) remain unchanged',
      'services.disableConfirm': 'Disable Service',
    },
  };

  constructor() {
    this.loadFromLocalStorage();
    this.startPolling();
    this.setupWsSubscription();
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Load translations from the API.
   *
   * When `since` is omitted, performs a full replace of the translations Signal.
   * When `since` is provided, merges incremental `changes` into the existing store,
   * preserving keys that are not in the changeset.
   *
   * On network failure, logs a warning via `console.warn` and keeps existing state.
   */
  async loadTranslations(since?: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.getTranslations(this.locale(), since),
      );
      const data = response.data;

      this.locale.set(data.locale);
      this.lastUpdated = data.updatedAt;

      if (since) {
        // --- Incremental merge ---
        this.translations.update((current) => {
          const merged = { ...current };

          if (data.changes) {
            for (const [dottedKey, value] of Object.entries(data.changes)) {
              const dotIndex = dottedKey.indexOf('.');
              const domain = dottedKey.substring(0, dotIndex);
              const subKey = dottedKey.substring(dotIndex + 1);
              if (!merged[domain]) {
                merged[domain] = {};
              }
              merged[domain][subKey] = value;
            }
          }

          return merged;
        });
      } else {
        // --- Full replacement ---
        this.translations.set(data.translations ?? {});
      }

      this.saveToLocalStorage(data);
    } catch (error) {
      console.warn('translation loading failed:', error);
    }
  }

  /**
   * Look up a translated string for the given (domain, key) pair.
   *
   * If the translation contains `{param}` placeholders and a `params` object
   * is provided, those placeholders are replaced with the corresponding values.
   *
   * When no translation is found, returns `{{domain.key}}` as a visual fallback.
   *
   * @param domain   Translation domain (e.g. 'global', 'auth', 'booking')
   * @param key      Translation key within the domain (e.g. 'save', 'login.title')
   * @param params   Optional map of interpolation parameters
   * @returns The translated string or a fallback.
   */
  t(
    domain: string,
    key: string,
    params?: Record<string, string | number>,
  ): string {
    let value = this.translations()?.[domain]?.[key];
    if (value === undefined) {
      value = TranslationService.FALLBACK_MAP[domain]?.[key];
      if (value === undefined) {
        return `{{${domain}.${key}}}`;
      }
    }
    if (params && Object.keys(params).length > 0) {
      return value.replace(
        /\{(\w+)\}/g,
        (match, paramName: string) =>
          params[paramName] !== undefined
            ? String(params[paramName])
            : match,
      );
    }
    return value;
  }

  // ==========================================
  // Private helpers
  // ==========================================

  /**
   * Attempt to hydrate state from localStorage on construction.
   * Looks for key `app_translations_{locale}`.
   */
  private loadFromLocalStorage(): void {
    const key = `app_translations_${this.locale()}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const data = JSON.parse(cached) as TranslationResponseData;
        if (data.translations) {
          this.translations.set(data.translations);
        }
        if (data.locale) {
          this.locale.set(data.locale);
        }
        this.lastUpdated = data.updatedAt ?? null;
      } catch {
        // Malformed cache — ignore silently
      }
    }
  }

  /**
   * Persist the current translation data to localStorage.
   */
  private saveToLocalStorage(data: TranslationResponseData): void {
    const key = `app_translations_${this.locale()}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Start the 5-minute polling interval that triggers `loadTranslations`
   * with the `lastUpdated` timestamp to perform incremental refreshes.
   */
  private startPolling(): void {
    this.pollingTimer = setInterval(() => {
      this.loadTranslations(this.lastUpdated ?? undefined);
    }, 300_000);
  }

  /**
   * Subscribe to WebSocket `translations.updated` events.
   * On each event, trigger an incremental load using `lastUpdated` as the
   * `since` parameter, merging live changes into the existing store.
   *
   * Socket.io-client maintains event listeners across reconnections, so
   * no explicit re-subscription on connect is required.
   */
  private setupWsSubscription(): void {
    this.wsSubscription = this.socketService
      .subscribeToTranslationUpdates()
      .subscribe(() => {
        this.loadTranslations(this.lastUpdated ?? undefined);
      });
  }
}

/**
 * Factory function for `APP_INITIALIZER` provider.
 *
 * When Angular executes the initializer, `inject()` has an active injection
 * context, so it retrieves the `TranslationService` singleton and returns
 * a Promise-returning function that calls `loadTranslations()`.
 *
 * Usage in `app.config.ts`:
 * ```
 * {
 *   provide: APP_INITIALIZER,
 *   useFactory: initializeTranslationFactory,
 *   multi: true,
 * }
 * ```
 */
export function initializeTranslationFactory(): () => Promise<void> {
  const service = inject(TranslationService);
  return () => service.loadTranslations();
}
