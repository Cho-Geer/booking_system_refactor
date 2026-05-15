import { TestBed } from '@angular/core/testing';
import { TranslationService } from '../../core/services/translation.service';

// ==========================================
// [RED] PHASE — TranslatePipe does NOT exist yet
// All tests MUST fail until the pipe is implemented
// ==========================================

// This import will FAIL: "Cannot find module './translate.pipe'"
// That is the INTENDED RED PHASE behavior — import fails because
// only the test file exists, the pipe implementation does not.
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  // ==========================================
  // Helper: Create a mock TranslationService
  // ==========================================
  function createMockTranslationService(
    translations: Record<string, Record<string, string>>,
  ): TranslationService {
    const mockT = jest.fn(
      (domain: string, key: string, params?: Record<string, string | number>) => {
        const value = translations?.[domain]?.[key];
        if (value === undefined) {
          return `{{${domain}.${key}}}`;
        }
        if (params && Object.keys(params).length > 0) {
          return value.replace(
            /\{(\w+)\}/g,
            (_match: string, paramName: string) =>
              params[paramName] !== undefined
                ? String(params[paramName])
                : _match,
          );
        }
        return value;
      },
    );
    return { t: mockT } as unknown as TranslationService;
  }

  // ==========================================
  // Test 1: Returns correct translation for known domain.key
  // ==========================================
  describe('transform() — basic lookup', () => {
    it('[RED] should fail: transform returns correct translation for known domain.key', () => {
      // Arrange
      const mockTranslations: Record<string, Record<string, string>> = {
        global: { save: 'Save', cancel: 'Cancel' },
        auth: { 'login.title': 'Sign In' },
      };
      const mockService = createMockTranslationService(mockTranslations);

      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [{ provide: TranslationService, useValue: mockService }],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Act & Assert
      expect(pipe.transform('global.save')).toBe('Save');
      expect(pipe.transform('global.cancel')).toBe('Cancel');
      expect(pipe.transform('auth.login.title')).toBe('Sign In');
      expect(mockService.t).toHaveBeenCalledTimes(3);
    });

    it('[RED] should fail: transform calls TranslationService.t with correct domain and key', () => {
      // Arrange
      const mockService = createMockTranslationService({});
      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [{ provide: TranslationService, useValue: mockService }],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Act
      pipe.transform('booking.status');

      // Assert
      expect(mockService.t).toHaveBeenCalledWith('booking', 'status', undefined);
    });
  });

  // ==========================================
  // Test 2: Supports params interpolation
  // ==========================================
  describe('transform() — param interpolation', () => {
    it('[RED] should fail: transform interpolates {param} placeholders with params object', () => {
      // Arrange
      const mockTranslations: Record<string, Record<string, string>> = {
        booking: {
          greeting: 'Hello {name}!',
          remaining: 'You have {count} appointments.',
        },
      };
      const mockService = createMockTranslationService(mockTranslations);

      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [{ provide: TranslationService, useValue: mockService }],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Act & Assert
      expect(pipe.transform('booking.greeting', { name: 'Alice' })).toBe(
        'Hello Alice!',
      );
      expect(pipe.transform('booking.remaining', { count: '3' })).toBe(
        'You have 3 appointments.',
      );
    });

    it('[RED] should fail: transform passes params object to TranslationService.t', () => {
      // Arrange
      const mockService = createMockTranslationService({});
      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [{ provide: TranslationService, useValue: mockService }],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
      const params = { name: 'Bob', service: 'Haircut' };

      // Act
      pipe.transform('booking.summary', params);

      // Assert
      expect(mockService.t).toHaveBeenCalledWith('booking', 'summary', params);
    });

    it('[RED] should fail: transform interpolates multiple params in one string', () => {
      // Arrange
      const mockTranslations: Record<string, Record<string, string>> = {
        booking: { summary: '{name} booked {service} on {date}' },
      };
      const mockService = createMockTranslationService(mockTranslations);

      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [{ provide: TranslationService, useValue: mockService }],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Act & Assert
      expect(
        pipe.transform('booking.summary', {
          name: 'Bob',
          service: 'Haircut',
          date: 'May 15',
        }),
      ).toBe('Bob booked Haircut on May 15');
    });
  });

  // ==========================================
  // Test 3: Returns {{domain.key}} fallback for missing keys
  // ==========================================
  describe('transform() — fallback for missing keys', () => {
    it('[RED] should fail: when translation missing, returns {{domain.key}} raw key format', () => {
      // Arrange
      const mockTranslations: Record<string, Record<string, string>> = {
        global: { save: 'Save' },
      };
      const mockService = createMockTranslationService(mockTranslations);

      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [{ provide: TranslationService, useValue: mockService }],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Act & Assert
      // Missing key within known domain
      expect(pipe.transform('global.nonexistent')).toBe('{{global.nonexistent}}');
      // Missing key in unknown domain
      expect(pipe.transform('unknown.key')).toBe('{{unknown.key}}');
    });
  });

  // ==========================================
  // Test 4: Pipe is standalone: true and registered in app config
  // ==========================================
  describe('pipe metadata and registration', () => {
    it('[RED] should fail: pipe is standalone: true and can be imported directly', () => {
      // Arrange: verify that TranslatePipe can be imported in TestBed
      // without an NgModule — this validates standalone: true
      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [
          { provide: TranslationService, useValue: createMockTranslationService({}) },
        ],
      });

      // Act: TestBed should be able to compile with the standalone pipe
      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Assert
      expect(pipe).toBeTruthy();
      expect(pipe.constructor).toBeDefined();
    });

    it('[RED] should fail: pipe name is "t" for template usage with | t syntax', () => {
      // This test validates the @Pipe({ name: 't' }) metadata
      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [
          { provide: TranslationService, useValue: createMockTranslationService({}) },
        ],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      // Access the pipe metadata via the ngPipeDef
      const pipeDef = (TranslatePipe as unknown as Record<string, unknown>)['ɵpipe'];
      expect(pipeDef).toBeDefined();
      expect((pipeDef as Record<string, unknown>)['name']).toBe('t');
    });

    it('[RED] should fail: pipe transform is a pure function (pure: true)', () => {
      TestBed.configureTestingModule({
        imports: [TranslatePipe],
        providers: [
          { provide: TranslationService, useValue: createMockTranslationService({}) },
        ],
      });

      const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());

      const pipeDef = (TranslatePipe as unknown as Record<string, unknown>)['ɵpipe'];
      expect(pipeDef).toBeDefined();
      expect((pipeDef as Record<string, unknown>)['pure']).toBe(true);
    });
  });
});
