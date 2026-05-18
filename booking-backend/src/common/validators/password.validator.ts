import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 常见弱密码黑名单（OWASP Top 10000 子集）
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'Password1!',
  '123456789',
  'Qwerty123!',
  'iloveyou',
  'admin123',
  'letmein',
  'welcome1',
  'monkey123',
  'dragon123',
  'master123',
  'abc123456',
]);

export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/**
 * 密码策略验证（FIX-P2-002）
 *
 * 规则：
 *   - 最小长度 12 位（NIST SP 800-63B）
 *   - 至少 1 个大写字母
 *   - 至少 1 个小写字母
 *   - 至少 1 个数字
 *   - 至少 1 个特殊字符 (@$!%*?&-_)
 *   - 不在常见密码黑名单中
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[@$!%*?&\-_]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&-_)');
  }
  if (COMMON_PASSWORDS.has(password)) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return { valid: errors.length === 0, errors };
}

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) return false;
    return validatePasswordStrength(password).valid;
  }

  defaultMessage(): string {
    return 'Password must be at least 12 characters and contain uppercase, lowercase, number, and special character';
  }
}

/**
 * 自定义密码强度装饰器
 * 用法: @IsStrongPassword()
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsStrongPassword',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
