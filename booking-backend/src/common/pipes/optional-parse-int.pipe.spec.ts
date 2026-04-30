import { OptionalParseIntPipe } from './optional-parse-int.pipe';
import { BadRequestException } from '@nestjs/common';

describe('OptionalParseIntPipe', () => {
  let pipe: OptionalParseIntPipe;

  beforeEach(() => {
    pipe = new OptionalParseIntPipe();
  });

  describe('transform', () => {
    it('should return undefined when value is undefined', () => {
      const result = pipe.transform(undefined as unknown as string, {} as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is empty string', () => {
      const result = pipe.transform('', {} as any);
      expect(result).toBeUndefined();
    });

    it('should parse valid integer string to number', () => {
      const result = pipe.transform('123', {} as any);
      expect(result).toBe(123);
    });

    it('should parse negative integer string to number', () => {
      const result = pipe.transform('-456', {} as any);
      expect(result).toBe(-456);
    });

    it('should parse zero correctly', () => {
      const result = pipe.transform('0', {} as any);
      expect(result).toBe(0);
    });

    it('should throw BadRequestException for non-numeric string', () => {
      expect(() => pipe.transform('abc', {} as any)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException with message for invalid input', () => {
      try {
        pipe.transform('xyz', {} as any);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toContain('xyz');
      }
    });

    it('should handle numeric string with decimals by parsing integer part', () => {
      const result = pipe.transform('123.45', {} as any);
      expect(result).toBe(123);
    });

    it('should return undefined for null-like falsy values are not handled (null is not undefined)', () => {
      // Note: null is not the same as undefined, parseInt will be called
      expect(() => pipe.transform(null as unknown as string, {} as any)).toThrow();
    });
  });
});
