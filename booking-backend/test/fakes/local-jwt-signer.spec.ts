import { LocalJwtSigner } from './local-jwt-signer';

describe('LocalJwtSigner', () => {
  const secret = 'test-secret-key-for-jwt-signing';
  let signer: LocalJwtSigner;

  beforeEach(() => {
    signer = new LocalJwtSigner(secret);
  });

  describe('sign / verify', () => {
    it('should sign a payload and produce a valid JWT token', () => {
      const payload = { sub: 'user-1', roles: ['user'] };
      const token = signer.sign(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should verify a valid token and return the payload', () => {
      const payload = { sub: 'user-1', roles: ['user'] };
      const token = signer.sign(payload);
      const decoded = signer.verify(token);
      expect(decoded.sub).toBe('user-1');
      expect(decoded.roles).toEqual(['user']);
    });

    it('should include iat and exp claims by default', () => {
      const payload = { sub: 'user-1' };
      const token = signer.sign(payload);
      const decoded = signer.verify(token);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
    });

    it('should reject an expired token', () => {
      const payload = { sub: 'user-1' };
      const token = signer.sign(payload, { expiresIn: 0 }); // expires immediately
      expect(() => signer.verify(token)).toThrow('jwt expired');
    });

    it('should reject a token signed with a different secret', () => {
      const otherSigner = new LocalJwtSigner('different-secret');
      const token = otherSigner.sign({ sub: 'user-1' });
      expect(() => signer.verify(token)).toThrow('invalid signature');
    });

    it('should respect ignoreExpiration option', () => {
      const payload = { sub: 'user-1' };
      const token = signer.sign(payload, { expiresIn: 0 });
      const decoded = signer.verify(token, { ignoreExpiration: true });
      expect(decoded.sub).toBe('user-1');
    });

    it('should reject a malformed token', () => {
      expect(() => signer.verify('not-a-jwt')).toThrow();
    });
  });

  describe('signAsync / verifyAsync', () => {
    it('should sign and verify asynchronously', async () => {
      const payload = { sub: 'user-1' };
      const token = await signer.signAsync(payload);
      const decoded = await signer.verifyAsync(token);
      expect(decoded.sub).toBe('user-1');
    });
  });

  describe('decode', () => {
    it('should decode without verification', () => {
      const payload = { sub: 'user-1', roles: ['admin'] };
      const token = signer.sign(payload);
      const decoded = signer.decode(token);
      expect(decoded.sub).toBe('user-1');
      expect(decoded.roles).toEqual(['admin']);
    });

    it('should decode a tampered token without throwing', () => {
      const payload = { sub: 'user-1' };
      const token = signer.sign(payload);
      const parts = token.split('.');
      const tampered = parts[0] + '.' + parts[1] + '.tampered';
      const decoded = signer.decode(tampered);
      expect(decoded.sub).toBe('user-1');
    });

    it('should return complete object when { complete: true }', () => {
      const payload = { sub: 'user-1' };
      const token = signer.sign(payload);
      const decoded = signer.decode(token, { complete: true });
      expect(decoded).toHaveProperty('header');
      expect(decoded).toHaveProperty('payload');
      expect(decoded).toHaveProperty('signature');
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.payload.sub).toBe('user-1');
    });
  });

  describe('compatibility with NestJS JwtService interface', () => {
    it('should produce tokens compatible with Passport JWT strategy', () => {
      const payload = { sub: 'user-1', email: 'test@example.com' };
      const token = signer.sign(payload);
      const decoded = signer.verify(token);
      // Passport JWT strategy expects at least `sub` in payload
      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
    });
  });
});
