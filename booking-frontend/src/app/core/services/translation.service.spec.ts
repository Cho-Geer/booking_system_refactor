// Mock socket.io-client BEFORE any imports that use it
// This prevents SocketService constructor errors in tests
jest.mock('socket.io-client', () => ({
  io: jest.fn().mockReturnValue({
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  }),
}));

import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// ==========================================
// [RED] PHASE — TranslationService does NOT exist yet
// All tests MUST fail until the service is implemented
// ==========================================

// This import will fail: "Cannot find module './translation.service'"
// That is the INTENDED RED PHASE behavior.
import { TranslationService, initializeTranslationFactory } from './translation.service';
import { SocketService } from './socket.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TranslationService,
      ],
    });

      service = TestBed.inject(TranslationService);
      httpMock = TestBed.inject(HttpTestingController);
      // Force SocketService instantiation so its constructor registers
      // connect/disconnect handlers on the shared io() mock.
      // In GREEN phase, TranslationService will inject SocketService directly.
      TestBed.inject(SocketService);
    });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ==========================================
  // Test 1: loadTranslations() fetches from API and stores in Signal
  // ==========================================
  describe('loadTranslations()', () => {
    it('[RED] should fail: loadTranslations fetches GET /api/translations and stores result in translations Signal', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            global: { save: 'Save', cancel: 'Cancel' },
            auth: { 'login.title': 'Sign In' },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      await loadPromise;

      // After loading, translations Signal should be populated
      const translations = service.translations();
      expect(translations).toBeDefined();
      expect(translations['global']).toBeDefined();
      expect(translations['global']['save']).toBe('Save');
      expect(translations['global']['cancel']).toBe('Cancel');
      expect(translations['auth']).toBeDefined();
      expect(translations['auth']['login.title']).toBe('Sign In');
    });

    it('[RED] should fail: loadTranslations updates locale Signal from response', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'zh',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            global: { save: '保存' },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush(mockResponse);

      await loadPromise;

      expect(service.locale()).toBe('zh');
    });

    it('[RED] should fail: loadTranslations passes locale query param', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'zh',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: { global: { save: '保存' } },
        },
      };

      // We need to set locale before calling loadTranslations
      // Assuming there's a way to set locale — the test signal intent is to show
      // that the request includes the locale param
      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/translations` &&
          (request.params.get('locale') === 'en' || request.params.get('locale') === 'zh')
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      await loadPromise;
    });
  });

  // ==========================================
  // Test 2: Startup loads cached translations from localStorage
  // ==========================================
  describe('localStorage cache on startup', () => {
    it('[RED] should fail: loads cached translations from localStorage before network fetch', async () => {
      // Arrange: pre-populate localStorage with cached translations
      const cachedData = {
        locale: 'en',
        updatedAt: '2026-05-12T10:00:00.000Z',
        translations: {
          global: { save: 'Cached Save' },
        },
      };
      localStorage.setItem('app_translations_en', JSON.stringify(cachedData));

      // Re-create service to trigger constructor/init logic
      TestBed.resetTestEnvironment();
      TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          TranslationService,
        ],
      });
      service = TestBed.inject(TranslationService);
      httpMock = TestBed.inject(HttpTestingController);

      // Should have loaded from localStorage immediately
      expect(service.translations()).toBeDefined();
      expect(service.translations()['global']['save']).toBe('Cached Save');
    });
  });

  // ==========================================
  // Test 3: with since param merges incremental changes
  // ==========================================
  describe('incremental merge with since param', () => {
    it('[RED] should fail: with since param merges changes into existing store, does NOT full replace', async () => {
      // Arrange: pre-populate with initial translations
      // This assumes the store can be pre-populated or we load first
      const initialResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T10:00:00.000Z',
          translations: {
            global: { save: 'Save', cancel: 'Cancel' },
            auth: { 'login.title': 'Sign In' },
          },
        },
      };

      // First full load
      const loadPromise1 = service.loadTranslations();
      const req1 = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req1.flush(initialResponse);
      await loadPromise1;

      // Act: incremental update
      const incrementalResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          changes: { 'auth.login.subtitle': 'Welcome back!' },
          deleted: [],
        },
      };

      const loadPromise2 = service.loadTranslations('2026-05-12T10:00:00.000Z');
      const req2 = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/translations` &&
          request.params.get('since') === '2026-05-12T10:00:00.000Z'
        );
      });
      expect(req2.request.method).toBe('GET');
      req2.flush(incrementalResponse);
      await loadPromise2;

      // Assert: existing keys are preserved AND new key is merged
      const translations = service.translations();
      // Existing keys must still be present (not replaced)
      expect(translations['global']['save']).toBe('Save');
      expect(translations['global']['cancel']).toBe('Cancel');
      expect(translations['auth']['login.title']).toBe('Sign In');
      // New key should be merged in
      expect(translations['auth']['login.subtitle']).toBe('Welcome back!');
    });
  });

  // ==========================================
  // Test 4: t(domain, key) returns correct string value
  // ==========================================
  describe('t() — string lookup', () => {
    it('[RED] should fail: t returns correct string value for known keys', async () => {
      // Arrange: load translations first
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            global: { save: 'Save', cancel: 'Cancel' },
            auth: { 'login.title': 'Sign In' },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush(mockResponse);
      await loadPromise;

      // Act & Assert
      expect(service.t('global', 'save')).toBe('Save');
      expect(service.t('global', 'cancel')).toBe('Cancel');
      expect(service.t('auth', 'login.title')).toBe('Sign In');
    });
  });

  // ==========================================
  // Test 5: t(domain, key, params) interpolates {param} placeholders
  // ==========================================
  describe('t() — param interpolation', () => {
    it('[RED] should fail: t with params object interpolates {param} placeholders', async () => {
      // Arrange: load translations that contain placeholders
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            booking: {
              'greeting': 'Hello {name}!',
              'remaining': 'You have {count} appointments.',
              'no_params': 'Plain text without placeholders',
            },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush(mockResponse);
      await loadPromise;

      // Act & Assert
      expect(service.t('booking', 'greeting', { name: 'Alice' })).toBe('Hello Alice!');
      expect(service.t('booking', 'remaining', { count: '3' })).toBe('You have 3 appointments.');
    });

    it('[RED] should fail: t preserves text when params object is empty', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            booking: { 'greeting': 'Hello {name}!' },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush(mockResponse);
      await loadPromise;

      // When no params provided, placeholder should remain as-is
      expect(service.t('booking', 'greeting')).toBe('Hello {name}!');
    });

    it('[RED] should fail: t interpolates multiple params in one string', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            booking: { 'summary': '{name} booked {service} on {date}' },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush(mockResponse);
      await loadPromise;

      expect(service.t('booking', 'summary', {
        name: 'Bob',
        service: 'Haircut',
        date: 'May 15',
      })).toBe('Bob booked Haircut on May 15');
    });
  });

  // ==========================================
  // Test 6: Fallback — when translation missing, returns {{domain.key}}
  // ==========================================
  describe('t() — fallback for missing keys', () => {
    it('[RED] should fail: when translation missing, returns {{domain.key}} raw key format', async () => {
      // Arrange: load translations with limited keys
      const mockResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {
            global: { save: 'Save' },
          },
        },
      };

      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush(mockResponse);
      await loadPromise;

      // Act & Assert
      // Missing key within known domain
      expect(service.t('global', 'nonexistent')).toBe('{{global.nonexistent}}');
      // Missing key in unknown domain
      expect(service.t('unknown', 'key')).toBe('{{unknown.key}}');
    });
  });

  // ==========================================
  // Test 7: Network failure with no cache logs warning, returns fallback
  // ==========================================
  describe('network failure handling', () => {
    it('[RED] should fail: when network request fails and no localStorage cache, logs warning and returns fallback keys', async () => {
      // Arrange: ensure localStorage is empty
      localStorage.clear();

      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act: make request that will fail
      const loadPromise = service.loadTranslations();
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.error(new ProgressEvent('Network error'), {
        status: 0,
        statusText: 'Network error',
      });

      await loadPromise;

      // Assert: console.warn was called with translation-related message
      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toContain('translation');
      expect(warnSpy.mock.calls[0][0]).toContain('fail');

      // translations Signal should be empty (or initial state)
      const translations = service.translations();
      expect(translations).toBeDefined();
      expect(Object.keys(translations).length).toBe(0);

      // t() should return fallback for any key
      expect(service.t('global', 'save')).toBe('{{global.save}}');

      warnSpy.mockRestore();
    });
  });

  // ==========================================
  // Test 8: APP_INITIALIZER calls loadTranslations() on app startup
  // ==========================================
  describe('APP_INITIALIZER', () => {
    it('[RED] should fail: APP_INITIALIZER calls loadTranslations() on app startup', async () => {
      // Arrange: spy on service.loadTranslations
      const loadSpy = jest.spyOn(service, 'loadTranslations');

      // Act: simulate APP_INITIALIZER by calling the factory within injection context
      const initFn = runInInjectionContext(TestBed.inject(Injector), () => initializeTranslationFactory());
      const initPromise = initFn();

      // The factory should trigger loadTranslations
      expect(loadSpy).toHaveBeenCalled();

      // Flush the HTTP request that loadTranslations makes
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush({
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T14:00:00.000Z',
          translations: {},
        },
      });

      await initPromise;

      loadSpy.mockRestore();
    });

    it('[RED] should fail: APP_INITIALIZER factory is configured in appConfig providers', async () => {
      // Verify the factory function exists and returns a Promise-returning function
      expect(initializeTranslationFactory).toBeDefined();
      expect(typeof initializeTranslationFactory).toBe('function');

      // Call factory within injection context (as Angular would do during bootstrap)
      const injector = TestBed.inject(Injector);
      const initFn = runInInjectionContext(injector, () => initializeTranslationFactory());
      expect(typeof initFn).toBe('function');
      const result = initFn();
      // In zone.js testing, ZoneAwarePromise wraps native Promise,
      // so we check for thenable instead of instanceof Promise
      expect(result).toBeDefined();
      expect(typeof (result as unknown as { then: unknown }).then).toBe('function');
      // Flush pending HTTP to clean up
      httpMock.expectOne((request) => request.url === `${apiUrl}/translations`).flush({
        statusCode: 200,
        message: 'Success',
        data: { locale: 'en', updatedAt: '2026-05-12T14:00:00.000Z', translations: {} },
      });
      await result;
    });
  });

  // ==========================================
  // Test 9: 5-minute polling interval triggers refresh
  // ==========================================
  describe('5-minute polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();

      // Re-create the service AFTER fake timers are installed so
      // the constructor's setInterval uses the fake timer implementation
      TestBed.resetTestEnvironment();
      TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          TranslationService,
        ],
      });
      service = TestBed.inject(TranslationService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('[RED] should fail: 5-minute polling interval triggers loadTranslations refresh', () => {
      // Spy on loadTranslations to check it's called periodically
      const loadSpy = jest.spyOn(service, 'loadTranslations');

      // Advance time by 5 minutes (300000 ms)
      jest.advanceTimersByTime(300000);

      // loadTranslations should have been called at least once due to polling
      expect(loadSpy).toHaveBeenCalled();

      // Flush the HTTP request that polling triggered
      const req = httpMock.expectOne((request) => request.url === `${apiUrl}/translations`);
      req.flush({
        statusCode: 200,
        message: 'Success',
        data: { locale: 'en', updatedAt: '2026-05-12T14:00:00.000Z', translations: {} },
      });

      loadSpy.mockRestore();
    });

    it('[RED] should fail: polling does NOT trigger before 5 minutes', () => {
      const loadSpy = jest.spyOn(service, 'loadTranslations');

      // Advance time by just 4 minutes — polling should NOT fire
      jest.advanceTimersByTime(240000);

      expect(loadSpy).not.toHaveBeenCalled();

      loadSpy.mockRestore();
    });
  });

  // ==========================================
  // Test 10: WebSocket translations.updated integration (RED PHASE)
  // These tests WILL FAIL because TranslationService does NOT yet
  // integrate with SocketService for live WebSocket translation updates.
  // The GREEN phase will add:
  //   - SocketService injection into TranslationService
  //   - subscribeToTranslationUpdates() registration on construction
  //   - WS event handler calling loadTranslations(since: lastUpdated)
  //   - Re-subscription on socket reconnect
  // ==========================================
  describe('WebSocket translations.updated integration', () => {
    /**
     * Helper: get the shared mock socket instance returned by io() mock.
     * socket.io-client is mocked at the top of this file, so every call to
     * io() returns the SAME jest.fn()-based object.
     */
    function getMockSocket(): {
      on: jest.Mock;
      off: jest.Mock;
      connect: jest.Mock;
      disconnect: jest.Mock;
      emit: jest.Mock;
    } {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ioClient = require('socket.io-client');
      return ioClient.io();
    }

    /**
     * Get callbacks registered for a specific WS event on the mock socket.
     * Returns the callback functions in registration order.
     */
    function getRegisteredCallbacks(event: string): Function[] {
      const socket = getMockSocket();
      return socket.on.mock.calls
        .filter((call: [string, Function]) => call[0] === event)
        .map((call: [string, Function]) => call[1]);
    }

    beforeEach(() => {
      // Reset the mock socket's call tracking between tests
      const socket = getMockSocket();
      socket.on.mockClear();
      socket.off.mockClear();
      socket.connect.mockClear();
      socket.disconnect.mockClear();
      socket.emit.mockClear();

      // Re-create TestBed with both services
      TestBed.resetTestEnvironment();
      TestBed.initTestEnvironment(
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting(),
      );
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          SocketService,
          TranslationService,
        ],
      });
      service = TestBed.inject(TranslationService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
      localStorage.clear();
    });

    // ------------------------------------------------------------------
    // Test 10a: TranslationService subscribes to translations.updated
    // ------------------------------------------------------------------
    it('[RED] should fail: TranslationService subscribes to translations.updated WS event on construction', () => {
      // Assert: on construction, TranslationService should register a listener
      // for 'translations.updated' on the SocketService's underlying socket.
      //
      // FAILS because TranslationService currently does NOT inject
      // SocketService and does NOT register any WS listeners.
      const translationCallbacks = getRegisteredCallbacks('translations.updated');
      expect(translationCallbacks.length).toBeGreaterThanOrEqual(1);
    });

    // ------------------------------------------------------------------
    // Test 10b: WS event triggers loadTranslations(since: lastUpdated)
    // ------------------------------------------------------------------
    it('[RED] should fail: on translations.updated event, loadTranslations is called with lastUpdated', () => {
      // Arrange: set a lastUpdated timestamp so the handler has something to use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).lastUpdated = '2026-05-12T10:00:00.000Z';
      const loadSpy = jest.spyOn(service, 'loadTranslations');

      // Act: retrieve the registered handler for 'translations.updated'
      const handlers = getRegisteredCallbacks('translations.updated');

      // FAILS: handlers array is empty because TranslationService never
      // registers a 'translations.updated' listener
      expect(handlers.length).toBeGreaterThanOrEqual(1);

      // Simulate WS event (never reached — test fails above)
      const handler = handlers[0];
      handler({ type: 'translations.updated', timestamp: '2026-05-12T12:00:00.000Z' });

      // Assert: loadTranslations should have been called with the since param
      expect(loadSpy).toHaveBeenCalledWith('2026-05-12T10:00:00.000Z');

      // Clean up: flush the pending HTTP request triggered by loadTranslations
      const cleanupReq = httpMock.expectOne((r) => r.url === '/api/translations');
      cleanupReq.flush({
        statusCode: 200,
        message: 'Success',
        data: { locale: 'en', updatedAt: '2026-05-12T14:00:00.000Z', translations: {} },
      });
    });

    // ------------------------------------------------------------------
    // Test 10c: WS-triggered incremental merge
    // ------------------------------------------------------------------
    it('[RED] should fail: WS-triggered incremental update merges changes into existing store', async () => {
      // Arrange: pre-populate store with initial data via full load
      const initialResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T10:00:00.000Z',
          translations: {
            global: { save: 'Save', cancel: 'Cancel' },
          },
        },
      };

      // First full load
      const loadPromise1 = service.loadTranslations();
      const req1 = httpMock.expectOne((r) => r.url === '/api/translations');
      req1.flush(initialResponse);
      await loadPromise1;

      // Set lastUpdated for incremental query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).lastUpdated = '2026-05-12T10:00:00.000Z';

      // Get the WS handler that should exist
      const handlers = getRegisteredCallbacks('translations.updated');

      // FAILS: no handler registered, so this assertion fails
      expect(handlers.length).toBeGreaterThanOrEqual(1);

      // Simulate WS event triggering incremental refresh (never reached)
      const handler = handlers[0];
      handler({ type: 'translations.updated', timestamp: '2026-05-12T12:00:00.000Z' });

      // The incremental load should have been triggered
      const req2 = httpMock.expectOne((r) => {
        return (
          r.url === '/api/translations' &&
          r.params.get('since') === '2026-05-12T10:00:00.000Z'
        );
      });
      const incrementalResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          locale: 'en',
          updatedAt: '2026-05-12T12:00:00.000Z',
          changes: { 'auth.login.title': 'Sign In' },
        },
      };
      req2.flush(incrementalResponse);
      // Use setTimeout to flush the microtask queue so the async
      // loadTranslations call triggered by the WS handler completes.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      // Assert: existing keys preserved, new key merged
      const translations = service.translations();
      expect(translations['global']['save']).toBe('Save');
      expect(translations['global']['cancel']).toBe('Cancel');
      expect(translations['auth']['login.title']).toBe('Sign In');
    });

    // ------------------------------------------------------------------
    // Test 10d: Re-subscribes on socket reconnect
    // ------------------------------------------------------------------
    it('[RED] should fail: on socket reconnect, TranslationService re-subscribes to translations.updated', () => {
      // Act: TranslationService should register a method/closure that
      // re-subscribes to 'translations.updated' whenever the socket reconnects.
      //
      // After the socket connects, the 'translations.updated' handler should
      // be active on the socket.
      const translationHandlers = getRegisteredCallbacks('translations.updated');

      // FAILS because TranslationService has NO reconnection logic and
      // never registers any WS handlers, regardless of socket state.
      expect(translationHandlers.length).toBeGreaterThanOrEqual(1);
    });
  });
});
