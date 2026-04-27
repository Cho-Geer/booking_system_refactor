import * as bcrypt from "bcryptjs";

/**
 * Password Utility for secure password hashing and verification
 *
 * This utility provides methods for securely hashing passwords and
 * comparing plaintext passwords with hashed passwords.
 *
 * @example
 * ```typescript
 * // Hash a password
 * const hashedPassword = await PasswordUtil.hash('MySecurePassword123!');
 *
 * // Verify a password
 * const isValid = await PasswordUtil.compare('MySecurePassword123!', hashedPassword);
 * ```
 */
export class PasswordUtil {
  /**
   * Default salt rounds for bcrypt hashing
   * Higher values are more secure but slower
   */
  private static readonly SALT_ROUNDS = 12;

  /**
   * Minimum password length requirement
   */
  private static readonly MIN_PASSWORD_LENGTH = 8;

  /**
   * Regular expressions for password strength validation
   */
  private static readonly PASSWORD_REGEX = {
    UPPERCASE: /[A-Z]/,
    LOWERCASE: /[a-z]/,
    NUMBER: /\d/,
    SPECIAL_CHAR: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  };

  /**
   * Common passwords that should be rejected
   */
  private static readonly COMMON_PASSWORDS = [
    "password",
    "123456",
    "qwerty",
    "admin",
    "welcome",
    "password123",
    "123456789",
    "12345678",
    "12345",
    "1234567",
  ];

  /**
   * Hash a password using bcrypt with configured salt rounds
   *
   * @param password - The plaintext password to hash
   * @returns Promise resolving to the hashed password
   * @throws Error if password validation fails
   */
  static async hash(password: string): Promise<string> {
    // Validate password strength before hashing
    this.validatePasswordStrength(password);

    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a plaintext password with a hashed password
   *
   * @param password - The plaintext password to verify
   * @param hashedPassword - The hashed password to compare against
   * @returns Promise resolving to true if passwords match, false otherwise
   */
  static async compare(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    if (!password || !hashedPassword) {
      return false;
    }

    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate password strength against security requirements
   *
   * Requirements:
   * 1. Minimum 8 characters
   * 2. At least one uppercase letter
   * 3. At least one lowercase letter
   * 4. At least one number
   * 5. At least one special character
   * 6. Not a common password
   * 7. No sequential characters (e.g., "12345", "abcde")
   * 8. No repeated characters (e.g., "aaaaaa")
   *
   * @param password - The password to validate
   * @throws Error with validation message if password is weak
   */
  static validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(
        `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`,
      );
    }

    // Check for uppercase letter
    if (!this.PASSWORD_REGEX.UPPERCASE.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Check for lowercase letter
    if (!this.PASSWORD_REGEX.LOWERCASE.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Check for number
    if (!this.PASSWORD_REGEX.NUMBER.test(password)) {
      errors.push("Password must contain at least one number");
    }

    // Check for special character
    if (!this.PASSWORD_REGEX.SPECIAL_CHAR.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Check for common passwords (case-insensitive)
    const lowerPassword = password.toLowerCase();
    if (this.COMMON_PASSWORDS.includes(lowerPassword)) {
      errors.push("Password is too common. Please choose a stronger password");
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      errors.push(
        'Password contains sequential characters (e.g., "12345", "abcde")',
      );
    }

    // Check for repeated characters
    if (this.hasRepeatedChars(password)) {
      errors.push("Password contains too many repeated characters");
    }

    // Check for keyboard patterns (optional, more complex)
    if (this.isKeyboardPattern(password)) {
      errors.push("Password follows a keyboard pattern");
    }

    // If there are validation errors, throw them
    if (errors.length > 0) {
      throw new Error(`Password validation failed: ${errors.join("; ")}`);
    }
  }

  /**
   * Check if password contains sequential characters
   *
   * @param password - The password to check
   * @returns True if password contains sequential characters
   */
  private static hasSequentialChars(password: string): boolean {
    // Check for numeric sequences
    for (let i = 0; i < password.length - 2; i++) {
      const charCode1 = password.charCodeAt(i);
      const charCode2 = password.charCodeAt(i + 1);
      const charCode3 = password.charCodeAt(i + 2);

      // Check if three consecutive characters are sequential
      if (charCode2 === charCode1 + 1 && charCode3 === charCode2 + 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if password contains too many repeated characters
   *
   * @param password - The password to check
   * @returns True if password contains 4 or more repeated characters
   */
  private static hasRepeatedChars(password: string): boolean {
    let maxRepeatCount = 1;
    let currentRepeatCount = 1;
    let lastChar = password[0];

    for (let i = 1; i < password.length; i++) {
      if (password[i] === lastChar) {
        currentRepeatCount++;
        maxRepeatCount = Math.max(maxRepeatCount, currentRepeatCount);
      } else {
        currentRepeatCount = 1;
        lastChar = password[i];
      }

      // If any character repeats 4 or more times, reject
      if (maxRepeatCount >= 4) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if password follows a keyboard pattern
   *
   * @param password - The password to check
   * @returns True if password appears to be a keyboard pattern
   */
  private static isKeyboardPattern(password: string): boolean {
    const keyboardPatterns = [
      "qwerty",
      "asdfgh",
      "zxcvbn",
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm",
      "123456",
      "123456789",
      "12345678",
      "1234567",
      "12345",
      "abcdef",
      "abc123",
      "password",
    ];

    const lowerPassword = password.toLowerCase();

    for (const pattern of keyboardPatterns) {
      if (lowerPassword.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a secure random password
   *
   * @param length - Desired password length (default: 16)
   * @returns A secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";

    // Ensure at least one of each required character type
    password += this.getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ"); // Uppercase
    password += this.getRandomChar("abcdefghijklmnopqrstuvwxyz"); // Lowercase
    password += this.getRandomChar("0123456789"); // Number
    password += this.getRandomChar("!@#$%^&*()_+-=[]{}|;:,.<>?"); // Special char

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password to avoid predictable patterns
    password = this.shuffleString(password);

    return password;
  }

  /**
   * Get a random character from a character set
   *
   * @param charset - The character set to choose from
   * @returns A random character from the set
   */
  private static getRandomChar(charset: string): string {
    return charset[Math.floor(Math.random() * charset.length)];
  }

  /**
   * Shuffle a string using Fisher-Yates algorithm
   *
   * @param str - The string to shuffle
   * @returns The shuffled string
   */
  private static shuffleString(str: string): string {
    const array = str.split("");

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array.join("");
  }

  /**
   * Check if a password needs to be rehashed (e.g., after algorithm updates)
   *
   * @param hashedPassword - The hashed password to check
   * @returns True if password needs rehashing
   */
  static needsRehash(hashedPassword: string): boolean {
    // Extract the cost factor from the bcrypt hash
    // Format: $2b$12$... where 12 is the cost factor
    const matches = hashedPassword.match(/^\$2[abxy]\$(\d+)\$/);

    if (!matches) {
      return true; // Not a valid bcrypt hash
    }

    const currentCost = parseInt(matches[1], 10);
    return currentCost < this.SALT_ROUNDS;
  }
}
