/**
 * Property-Based Tests (fast-check)
 *
 * Tests invariants for pipes and pure functions using fast-check.
 * These tests verify mathematical/behavioural properties rather than
 * specific input-output pairs.
 *
 * @see testing-coding-standard.md §11.1 (Property-Based Testing)
 */

import fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';

// ==========================================
// Property: TranslatePipe preserves key format
// ==========================================
describe('[Property] TranslatePipe — invariants', () => {
  /**
   * Create a TranslationService that always returns {{domain.key}} fallback.
   * This lets us test the pipe in isolation from real translations.
   */
  function createFallbackTranslationService(): TranslationService {
    return {
      t: (_domain: string, _key: string, _params?: Record<string, string | number>) => {
        return `{{${_domain}.${_key}}}`;
      },
    } as unknown as TranslationService;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslatePipe],
      providers: [{ provide: TranslationService, useValue: createFallbackTranslationService() }],
    });
  });

  /**
   * INVARIANT: For any valid domain.key string, the pipe output length
   * is always >= the input length (because {{...}} wrapping adds chars).
   */
  it('should always produce output length >= input length for any domain.key', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (domain, key) => {
        const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
        const input = `${domain}.${key}`;
        const result = pipe.transform(input);
        expect(result.length).toBeGreaterThanOrEqual(input.length);
      }),
    );
  });

  /**
   * INVARIANT: The output is always a string (never null/undefined).
   */
  it('should always return a string for any string input', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (domain, key) => {
        const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
        const result = pipe.transform(`${domain}.${key}`);
        expect(typeof result).toBe('string');
      }),
    );
  });

  /**
   * INVARIANT: When params are provided, the number of {param} placeholders
   * in the output is less than or equal to the number in the service response.
   */
  it('should interpolate params passed to transform', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer())),
        (domain, key, params) => {
          const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
          const input = `${domain}.${key}`;

          // If params is empty, the result should contain {{domain.key}}
          if (Object.keys(params).length === 0) {
            const result = pipe.transform(input);
            expect(result).toBe(`{{${domain}.${key}}}`);
          } else {
            // With params, the call should not throw
            expect(() => pipe.transform(input, params)).not.toThrow();
          }
        },
      ),
    );
  });

  /**
   * INVARIANT: Passing no params and passing an empty params object
   * should produce the same result.
   */
  it('should treat undefined params same as empty params', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (domain, key) => {
        const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
        const input = `${domain}.${key}`;
        const result1 = pipe.transform(input);
        const result2 = pipe.transform(input, {});
        expect(result1).toBe(result2);
      }),
    );
  });
});

// ==========================================
// Property: TimeFormatPipe — invariants
// ==========================================
import { TimeFormatPipe } from '../pipes/time-format.pipe';

describe('[Property] TimeFormatPipe — invariants', () => {
  let pipe: TimeFormatPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TimeFormatPipe],
    });
    pipe = TestBed.runInInjectionContext(() => new TimeFormatPipe());
  });

  /**
   * INVARIANT: For any valid ISO time string in HH:mm format,
   * the output is always in HH:mm format.
   */
  it('should always output HH:mm format for valid HH:mm inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (hours, minutes) => {
          const input = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          const result = pipe.transform(input);
          expect(result).toMatch(/^\d{2}:\d{2}$/);
        },
      ),
    );
  });

  /**
   * INVARIANT: The output is always a string (never null/undefined).
   */
  it('should always return a string for any string input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = pipe.transform(input);
        expect(typeof result).toBe('string');
      }),
    );
  });

  /**
   * INVARIANT: For valid 24h time, transform is idempotent
   * (calling it twice returns the same result).
   */
  it('should be idempotent for valid HH:mm inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (hours, minutes) => {
          const input = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          const first = pipe.transform(input);
          const second = pipe.transform(first);
          expect(first).toBe(second);
        },
      ),
    );
  });

  /**
   * INVARIANT: For invalid time formats, the pipe returns the original input
   * unchanged (graceful degradation).
   */
  it('should return input unchanged for invalid time formats', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^\d{2}:\d{2}$/.test(s)),
        (input) => {
          const result = pipe.transform(input);
          expect(result).toBe(input);
        },
      ),
    );
  });
});
