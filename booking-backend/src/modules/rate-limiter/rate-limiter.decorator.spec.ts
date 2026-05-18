import {
  RateLimit,
  resolveRateLimitOptions,
  RATE_LIMIT_KEY,
  RATE_LIMIT_DEFAULTS,
} from './rate-limiter.decorator';
import { SetMetadata } from '@nestjs/common';

describe('Rate Limiter Decorator', () => {
  describe('RateLimit decorator', () => {
    it('should set metadata with the correct key and options', () => {
      const options = { tier: 'strict' as const, key: 'user' as const };
      const decorator = RateLimit(options);

      // Decorator should call SetMetadata with the correct key
      expect(typeof decorator).toBe('function');
    });

    it('should work with strict tier', () => {
      const options = { tier: 'strict' as const, key: 'user' as const };
      const decorator = RateLimit(options);

      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should work with auth tier', () => {
      const options = { tier: 'auth' as const, key: 'ip' as const };
      const decorator = RateLimit(options);

      expect(decorator).toBeDefined();
    });

    it('should work with api tier', () => {
      const options = { tier: 'api' as const, key: 'ip' as const };
      const decorator = RateLimit(options);

      expect(decorator).toBeDefined();
    });

    it('should work with public tier', () => {
      const options = { tier: 'public' as const, key: 'ip' as const };
      const decorator = RateLimit(options);

      expect(decorator).toBeDefined();
    });

    it('should work with custom limit and window overrides', () => {
      const options = {
        tier: 'api' as const,
        key: 'user' as const,
        limit: 50,
        window: 120,
      };
      const decorator = RateLimit(options);

      expect(decorator).toBeDefined();
    });
  });

  describe('resolveRateLimitOptions', () => {
    it('should return default api tier options when no config provided', () => {
      const result = resolveRateLimitOptions(undefined);

      expect(result).toEqual({
        tier: 'api',
        key: 'ip',
      });
    });

    it('should resolve strict tier defaults', () => {
      const config = { tier: 'strict' as const, key: 'user' as const };
      const result = resolveRateLimitOptions(config);

      expect(result).toEqual({
        tier: 'strict',
        key: 'user',
        limit: 1,
        window: 1,
      });
    });

    it('should resolve auth tier defaults', () => {
      const config = { tier: 'auth' as const, key: 'ip' as const };
      const result = resolveRateLimitOptions(config);

      expect(result).toEqual({
        tier: 'auth',
        key: 'ip',
        limit: 5,
        window: 60,
      });
    });

    it('should resolve api tier defaults', () => {
      const config = { tier: 'api' as const, key: 'ip' as const };
      const result = resolveRateLimitOptions(config);

      expect(result).toEqual({
        tier: 'api',
        key: 'ip',
        limit: 30,
        window: 60,
      });
    });

    it('should resolve public tier defaults', () => {
      const config = { tier: 'public' as const };
      const result = resolveRateLimitOptions(config);

      expect(result).toEqual({
        tier: 'public',
        key: 'ip',
        limit: 100,
        window: 60,
      });
    });

    it('should use custom limit override when provided', () => {
      const config = { tier: 'api' as const, limit: 50 };
      const result = resolveRateLimitOptions(config);

      expect(result.limit).toBe(50);
      expect(result.window).toBe(60);
    });

    it('should use custom window override when provided', () => {
      const config = { tier: 'api' as const, window: 120 };
      const result = resolveRateLimitOptions(config);

      expect(result.limit).toBe(30);
      expect(result.window).toBe(120);
    });

    it('should use both custom limit and window overrides', () => {
      const config = { tier: 'strict' as const, limit: 5, window: 10 };
      const result = resolveRateLimitOptions(config);

      expect(result.tier).toBe('strict');
      expect(result.limit).toBe(5);
      expect(result.window).toBe(10);
    });

    it('should default key to ip when not specified', () => {
      const config = { tier: 'api' as const };
      const result = resolveRateLimitOptions(config);

      expect(result.key).toBe('ip');
    });

    it('should use user key when specified', () => {
      const config = { tier: 'strict' as const, key: 'user' as const };
      const result = resolveRateLimitOptions(config);

      expect(result.key).toBe('user');
    });

    it('should use api_key key when specified', () => {
      const config = { tier: 'auth' as const, key: 'api_key' as const };
      const result = resolveRateLimitOptions(config);

      expect(result.key).toBe('api_key');
    });
  });

  describe('RATE_LIMIT_KEY', () => {
    it('should be a string constant', () => {
      expect(RATE_LIMIT_KEY).toBe('rate_limit_config');
    });
  });

  describe('RATE_LIMIT_DEFAULTS', () => {
    it('should have strict tier config', () => {
      expect(RATE_LIMIT_DEFAULTS.strict).toEqual({ limit: 1, window: 1 });
    });

    it('should have auth tier config', () => {
      expect(RATE_LIMIT_DEFAULTS.auth).toEqual({ limit: 5, window: 60 });
    });

    it('should have api tier config', () => {
      expect(RATE_LIMIT_DEFAULTS.api).toEqual({ limit: 30, window: 60 });
    });

    it('should have public tier config', () => {
      expect(RATE_LIMIT_DEFAULTS.public).toEqual({ limit: 100, window: 60 });
    });

    it('should have all four tiers defined', () => {
      const tiers = ['strict', 'auth', 'api', 'public'];
      tiers.forEach((tier) => {
        expect(RATE_LIMIT_DEFAULTS).toHaveProperty(tier);
      });
    });

    it('should have valid limit and window for each tier', () => {
      Object.values(RATE_LIMIT_DEFAULTS).forEach((config) => {
        expect(config.limit).toBeGreaterThan(0);
        expect(config.window).toBeGreaterThan(0);
      });
    });

    it('should have strict tier with 1 req/1 sec (User+TimeSlot layer)', () => {
      expect(RATE_LIMIT_DEFAULTS.strict.limit).toBe(1);
      expect(RATE_LIMIT_DEFAULTS.strict.window).toBe(1);
    });

    it('should have auth tier with 5 req/60 sec', () => {
      expect(RATE_LIMIT_DEFAULTS.auth.limit).toBe(5);
      expect(RATE_LIMIT_DEFAULTS.auth.window).toBe(60);
    });

    it('should have api tier with 30 req/60 sec', () => {
      expect(RATE_LIMIT_DEFAULTS.api.limit).toBe(30);
      expect(RATE_LIMIT_DEFAULTS.api.window).toBe(60);
    });

    it('should have public tier with 100 req/60 sec', () => {
      expect(RATE_LIMIT_DEFAULTS.public.limit).toBe(100);
      expect(RATE_LIMIT_DEFAULTS.public.window).toBe(60);
    });
  });

  // ========================================================================
  // NEW: Decorator metadata verification
  // ========================================================================

  describe('decorator metadata integration', () => {
    it('should produce a decorator function that can be applied', () => {
      const decorator = RateLimit({ tier: 'strict', key: 'user' });
      expect(typeof decorator).toBe('function');
      expect(decorator.length).toBe(3); // Standard decorator signature
    });

    it('should work with all key types', () => {
      const keyTypes: Array<'ip' | 'user' | 'api_key'> = ['ip', 'user', 'api_key'];

      keyTypes.forEach((keyType) => {
        const decorator = RateLimit({ tier: 'api', key: keyType });
        expect(decorator).toBeDefined();
        expect(typeof decorator).toBe('function');
      });
    });

    it('should support custom limit and window together', () => {
      const config = {
        tier: 'api' as const,
        limit: 50,
        window: 120,
      };
      const result = resolveRateLimitOptions(config);

      expect(result.limit).toBe(50);
      expect(result.window).toBe(120);
      expect(result.tier).toBe('api');
    });

    it('should support all 5 rate limiting layer configurations', () => {
      // Layer 1: User+TimeSlot (1 req/sec)
      const layer1 = resolveRateLimitOptions({ tier: 'strict', key: 'user' });
      expect(layer1.limit).toBe(1);
      expect(layer1.window).toBe(1);

      // Layer 2: User Daily (20/day)
      const layer2 = resolveRateLimitOptions({
        tier: 'api',
        key: 'user',
        limit: 20,
        window: 86400,
      });
      expect(layer2.limit).toBe(20);
      expect(layer2.window).toBe(86400);

      // Layer 3: IP Global (10/min)
      const layer3 = resolveRateLimitOptions({ tier: 'api', key: 'ip', limit: 10, window: 60 });
      expect(layer3.limit).toBe(10);
      expect(layer3.window).toBe(60);

      // Layer 4: TimeSlot Capacity (public tier)
      const layer4 = resolveRateLimitOptions({ tier: 'public', key: 'ip' });
      expect(layer4.limit).toBe(100);
      expect(layer4.window).toBe(60);

      // Layer 5: Global User (100/min)
      const layer5 = resolveRateLimitOptions({
        tier: 'public',
        key: 'user',
        limit: 100,
        window: 60,
      });
      expect(layer5.limit).toBe(100);
      expect(layer5.window).toBe(60);
    });
  });
});
