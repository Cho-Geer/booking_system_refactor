import * as crypto from 'crypto';

/**
 * LocalJwtSigner — Uses Node.js crypto module for real JWT sign/verify.
 *
 * Replaces: @nestjs/jwt JwtService
 *
 * Features:
 * - Real JWT signing with HS256 (HMAC-SHA256)
 * - Real JWT verification with expiry check
 * - Compatible with NestJS JwtService interface
 * - No network, no external process — pure Node.js crypto
 *
 * IMPORTANT: This is NOT a mock. It produces real, verifiable JWTs that
 * can be decoded by any JWT library. Auth guards work unmodified.
 *
 * @example
 * ```ts
 * const signer = new LocalJwtSigner('test-secret');
 * const token = signer.sign({ sub: 'user-1', roles: ['user'] });
 * const payload = signer.verify(token);
 * expect(payload.sub).toBe('user-1');
 * ```
 */
export class LocalJwtSigner {
  private readonly algorithm = 'HS256';

  constructor(private readonly secret: string) {}

  /**
   * Synchronously sign a payload into a JWT token.
   */
  sign(payload: Record<string, any>, options?: { expiresIn?: string | number }): string {
    const header = {
      alg: this.algorithm,
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = this.calculateExp(now, options?.expiresIn);

    const fullPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.createSignature(`${headerEncoded}.${payloadEncoded}`);

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
  }

  /**
   * Asynchronously sign a payload into a JWT token.
   */
  async signAsync(
    payload: Record<string, any>,
    options?: { expiresIn?: string | number },
  ): Promise<string> {
    return this.sign(payload, options);
  }

  /**
   * Synchronously verify and decode a JWT token.
   * Throws if the token is invalid or expired.
   */
  verify<T = any>(token: string, options?: { ignoreExpiration?: boolean }): T {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('jwt malformed');
    }

    const [headerEncoded, payloadEncoded, signature] = parts;

    // Verify signature
    const expectedSignature = this.createSignature(`${headerEncoded}.${payloadEncoded}`);
    if (signature !== expectedSignature) {
      throw new Error('invalid signature');
    }

    // Decode payload
    let payload: any;
    try {
      payload = JSON.parse(this.base64UrlDecode(payloadEncoded));
    } catch {
      throw new Error('jwt malformed');
    }

    // Check expiration
    if (!options?.ignoreExpiration) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp <= now) {
        throw new Error('jwt expired');
      }
    }

    return payload as T;
  }

  /**
   * Asynchronously verify and decode a JWT token.
   */
  async verifyAsync<T = any>(token: string, options?: { ignoreExpiration?: boolean }): Promise<T> {
    return this.verify<T>(token, options);
  }

  /**
   * Decode a JWT token without verification.
   * Returns the payload (or full object with header/payload/signature when { complete: true }).
   */
  decode<T = any>(token: string, options?: { complete?: boolean }): T | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [headerEncoded, payloadEncoded, signature] = parts;

      const header = JSON.parse(this.base64UrlDecode(headerEncoded));
      const payload = JSON.parse(this.base64UrlDecode(payloadEncoded));

      if (options?.complete) {
        return {
          header,
          payload,
          signature,
        } as unknown as T;
      }

      return payload as T;
    } catch {
      return null;
    }
  }

  /**
   * Create a HMAC-SHA256 signature.
   */
  private createSignature(input: string): string {
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(input);
    return this.base64UrlEncode(hmac.digest());
  }

  /**
   * Calculate expiration timestamp.
   */
  private calculateExp(now: number, expiresIn?: string | number): number {
    if (expiresIn === undefined) {
      // Default: 1 hour
      return now + 3600;
    }

    if (typeof expiresIn === 'number') {
      return now + expiresIn;
    }

    // Parse string like '1h', '30m', '7d'
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return now + 3600; // Default fallback
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return now + value;
      case 'm':
        return now + value * 60;
      case 'h':
        return now + value * 3600;
      case 'd':
        return now + value * 86400;
      default:
        return now + 3600;
    }
  }

  /**
   * Base64url encode.
   */
  private base64UrlEncode(data: Buffer | string): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Base64url decode.
   */
  private base64UrlDecode(data: string): string {
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }
}
