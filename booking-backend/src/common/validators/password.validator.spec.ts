import { validatePasswordStrength } from './password.validator';

describe('password.validator', () => {
  describe('validatePasswordStrength', () => {
    it('should accept a strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumberInPass!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&-_)');
    });

    it('should reject common password', () => {
      const result = validatePasswordStrength('password');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a stronger password');
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePasswordStrength('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with hyphen as special character', () => {
      const result = validatePasswordStrength('StrongPass123-test');
      expect(result.valid).toBe(true);
    });

    it('should accept password with underscore as special character', () => {
      const result = validatePasswordStrength('StrongPass123_ok');
      expect(result.valid).toBe(true);
    });
  });
});
