import { maskPhone, maskEmail } from './masking.util';

describe('masking.util', () => {
  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      expect(maskPhone('13800138000')).toBe('138****8000');
    });

    it('should mask 11-digit phone', () => {
      expect(maskPhone('18612345678')).toBe('186****5678');
    });

    it('should return original if phone is too short', () => {
      expect(maskPhone('123')).toBe('123');
    });

    it('should handle empty string', () => {
      expect(maskPhone('')).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('should mask email with long local part', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
    });

    it('should mask email with short local part', () => {
      expect(maskEmail('ab@example.com')).toBe('ab***@example.com');
    });

    it('should mask email with single char local part', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
    });

    it('should return original if no @ symbol', () => {
      expect(maskEmail('notanemail')).toBe('notanemail');
    });

    it('should handle empty string', () => {
      expect(maskEmail('')).toBe('');
    });

    it('should not expose full email address', () => {
      const masked = maskEmail('fullname@company.org');
      expect(masked).not.toBe('fullname@company.org');
      expect(masked).toContain('***');
      expect(masked).toContain('@company.org');
    });
  });
});
