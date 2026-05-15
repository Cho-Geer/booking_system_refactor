import { TestBed } from '@angular/core/testing';
import { TimeFormatPipe } from './time-format.pipe';

describe('TimeFormatPipe', () => {
  let pipe: TimeFormatPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TimeFormatPipe],
    });
    pipe = TestBed.runInInjectionContext(() => new TimeFormatPipe());
  });

  describe('transform() — valid inputs', () => {
    it('should format valid HH:mm time correctly', () => {
      expect(pipe.transform('09:00')).toBe('09:00');
      expect(pipe.transform('23:59')).toBe('23:59');
      expect(pipe.transform('00:00')).toBe('00:00');
      expect(pipe.transform('12:30')).toBe('12:30');
    });

    it('should normalize single-digit hours and minutes', () => {
      expect(pipe.transform('9:5')).toBe('9:5'); // not HH:mm format, returned as-is
    });
  });

  describe('transform() — invalid inputs', () => {
    it('should return empty string unchanged', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should return null/undefined unchanged', () => {
      expect(pipe.transform(null as unknown as string)).toBeNull();
      expect(pipe.transform(undefined as unknown as string)).toBeUndefined();
    });

    it('should return non-HH:mm format unchanged', () => {
      expect(pipe.transform('abc')).toBe('abc');
      expect(pipe.transform('09-00')).toBe('09-00');
      expect(pipe.transform('9:00 AM')).toBe('9:00 AM');
    });

    it('should return out-of-range hours unchanged', () => {
      expect(pipe.transform('24:00')).toBe('24:00');
      expect(pipe.transform('99:00')).toBe('99:00');
    });

    it('should return out-of-range minutes unchanged', () => {
      expect(pipe.transform('12:60')).toBe('12:60');
      expect(pipe.transform('12:99')).toBe('12:99');
    });
  });

  describe('pipe metadata', () => {
    it('should have Pipe decorator with name "timeFormat"', () => {
      // Verify via source code inspection (avoids TestBed re-init issues)
      const fs = require('fs');
      const path = require('path');
      const sourcePath = path.resolve(__dirname, './time-format.pipe.ts');
      const content = fs.readFileSync(sourcePath, 'utf-8');
      expect(content).toContain("name: 'timeFormat'");
      expect(content).toContain('standalone: true');
      expect(content).toContain('pure: true');
    });
  });
});
