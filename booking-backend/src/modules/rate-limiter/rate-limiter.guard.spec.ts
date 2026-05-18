import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { RateLimitGuard } from './rate-limiter.guard';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limiter.decorator';

// Mock RateLimiterService
const mockRateLimiterService = {
  isAllowed: jest.fn(),
  getStatus: jest.fn(),
};

// Mock Reflector
const mockReflector = {
  get: jest.fn(),
  getAll: jest.fn(),
};

// Mock ClsService
const mockClsService = {
  get: jest.fn().mockReturnValue('test-request-id'),
  set: jest.fn(),
  getId: jest.fn().mockReturnValue('test-request-id'),
};

// Mock Response
const createMockResponse = () => ({
  setHeader: jest.fn(),
});

// Mock Request
const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
  path: '/api/test',
  method: 'GET',
  headers: {},
  ip: '127.0.0.1',
  ...overrides,
});

// Mock ExecutionContext
const createMockExecutionContext = (
  req: Record<string, unknown> = {},
  rateLimitConfig?: RateLimitOptions,
) => {
  const mockRequest = createMockRequest(req);
  const mockResponse = createMockResponse();

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    mockRequest,
    mockResponse,
  };
};

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: typeof mockReflector;
  let rateLimiterService: typeof mockRateLimiterService;

  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RateLimiterService,
          useValue: mockRateLimiterService,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get(Reflector);
    rateLimiterService = module.get(RateLimiterService);
  });

  afterEach(() => {
    // Restore NODE_ENV
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';

      const mockCtx = createMockExecutionContext() as any;
      const result = await guard.canActivate(mockCtx);

      expect(result).toBe(true);
    });

    it('should return true when no rate limit config is found', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get.mockReturnValue(undefined);

      const mockCtx = createMockExecutionContext() as any;
      const result = await guard.canActivate(mockCtx);

      expect(result).toBe(true);
    });

    it('should return true when identifier cannot be extracted', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'user' }) // handler level
        .mockReturnValueOnce(undefined); // class level

      const mockCtx = createMockExecutionContext({ user: null }) as any;
      const result = await guard.canActivate(mockCtx);

      expect(result).toBe(true);
    });

    it('should throw HttpException 429 when rate limit exceeded', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'strict', key: 'user' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({
        user: { sub: 'user-1' },
      }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: false,
        limit: 1,
        current: 2,
        window: 1,
        retryAfter: 500,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 1,
        remaining: 0,
        resetAt: new Date(Date.now() + 1000),
      });

      await expect(guard.canActivate(mockCtx)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(mockCtx);
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(error.getResponse()).toEqual(
          expect.objectContaining({
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
          }),
        );
      }
    });

    it('should return true when rate limit is not exceeded', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'user' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({
        user: { sub: 'user-1' },
      }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 5,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 25,
        resetAt: new Date(Date.now() + 60000),
      });

      const result = await guard.canActivate(mockCtx);

      expect(result).toBe(true);
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-1',
        '/api/test',
        'api',
        30,
        60,
      );
    });

    it('should set rate limit headers on response', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 100,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
    });

    it('should set Retry-After header when rate limit exceeded', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'strict', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: false,
        limit: 1,
        current: 2,
        window: 1,
        retryAfter: 1500,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 1,
        remaining: 0,
        resetAt: new Date(Date.now() + 1000),
      });

      try {
        await guard.canActivate(mockCtx);
      } catch {
        // Expected
      }

      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '2');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'public', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
      }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 100,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        '203.0.113.195',
        '/api/test',
        'public',
        100,
        60,
      );
    });

    it('should extract user ID from request.user.sub', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'user' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({
        user: { sub: 'user-123' },
      }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 29,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-123',
        '/api/test',
        'api',
        30,
        60,
      );
    });

    it('should extract user ID from request.user.id as fallback', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'user' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({
        user: { id: 'user-456' },
      }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 29,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-456',
        '/api/test',
        'api',
        30,
        60,
      );
    });

    it('should extract API key from x-api-key header', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'api_key' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({
        headers: { 'x-api-key': 'my-secret-api-key' },
      }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 29,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'my-secret-api-key',
        '/api/test',
        'api',
        30,
        60,
      );
    });

    it('should set X-RateLimit-Reset header as Unix timestamp', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const resetDate = new Date(Date.now() + 60000);
      const expectedResetTimestamp = Math.floor(resetDate.getTime() / 1000);

      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 5,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 25,
        resetAt: resetDate,
      });

      await guard.canActivate(mockCtx);

      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        String(expectedResetTimestamp),
      );
    });

    it('should set all three rate limit headers together', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'public', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const resetDate = new Date(Date.now() + 60000);
      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 100,
        current: 42,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 100,
        remaining: 58,
        resetAt: resetDate,
      });

      await guard.canActivate(mockCtx);

      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '58');
      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        String(Math.floor(resetDate.getTime() / 1000)),
      );
    });

    it('should not set Retry-After header when request is allowed', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 29,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(mockCtx.mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String),
      );
    });

    it('should clamp negative remaining to 0 in headers', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'strict', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: false,
        limit: 1,
        current: 5,
        window: 1,
        retryAfter: 500,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 1,
        remaining: -4, // Should be clamped to 0
        resetAt: new Date(Date.now() + 1000),
      });

      try {
        await guard.canActivate(mockCtx);
      } catch {
        // Expected
      }

      expect(mockCtx.mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should apply 5 rate limiting layers via different configurations', async () => {
      process.env.NODE_ENV = 'production';

      // Layer 1: User+TimeSlot (strict, 1 req/sec)
      mockReflector.get
        .mockReturnValueOnce({ tier: 'strict', key: 'user' })
        .mockReturnValueOnce(undefined);
      let mockCtx = createMockExecutionContext({ user: { sub: 'user-1' } }) as any;
      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 1,
        current: 1,
        window: 1,
      });
      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 1,
        remaining: 0,
        resetAt: new Date(),
      });
      await guard.canActivate(mockCtx);
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-1',
        '/api/test',
        'strict',
        1,
        1,
      );

      // Layer 2: User Daily (20/day)
      jest.clearAllMocks();
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'user', limit: 20, window: 86400 })
        .mockReturnValueOnce(undefined);
      mockCtx = createMockExecutionContext({ user: { sub: 'user-1' } }) as any;
      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 20,
        current: 5,
        window: 86400,
      });
      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 20,
        remaining: 15,
        resetAt: new Date(),
      });
      await guard.canActivate(mockCtx);
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-1',
        '/api/test',
        'api',
        20,
        86400,
      );

      // Layer 3: IP Global (10/min)
      jest.clearAllMocks();
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'ip', limit: 10, window: 60 })
        .mockReturnValueOnce(undefined);
      mockCtx = createMockExecutionContext({ ip: '10.0.0.1' }) as any;
      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 10,
        current: 3,
        window: 60,
      });
      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 10,
        remaining: 7,
        resetAt: new Date(),
      });
      await guard.canActivate(mockCtx);
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        '10.0.0.1',
        '/api/test',
        'api',
        10,
        60,
      );

      // Layer 4: TimeSlot Capacity (public tier)
      jest.clearAllMocks();
      mockReflector.get
        .mockReturnValueOnce({ tier: 'public', key: 'ip' })
        .mockReturnValueOnce(undefined);
      mockCtx = createMockExecutionContext() as any;
      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 100,
        current: 50,
        window: 60,
      });
      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 100,
        remaining: 50,
        resetAt: new Date(),
      });
      await guard.canActivate(mockCtx);
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        '127.0.0.1',
        '/api/test',
        'public',
        100,
        60,
      );

      // Layer 5: Global User (100/min)
      jest.clearAllMocks();
      mockReflector.get
        .mockReturnValueOnce({ tier: 'public', key: 'user', limit: 100, window: 60 })
        .mockReturnValueOnce(undefined);
      mockCtx = createMockExecutionContext({ user: { sub: 'user-1' } }) as any;
      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 100,
        current: 50,
        window: 60,
      });
      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 100,
        remaining: 50,
        resetAt: new Date(),
      });
      await guard.canActivate(mockCtx);
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-1',
        '/api/test',
        'public',
        100,
        60,
      );
    });

    it('should extract IP from req.ip when no x-forwarded-for header', async () => {
      process.env.NODE_ENV = 'production';
      mockReflector.get
        .mockReturnValueOnce({ tier: 'api', key: 'ip' })
        .mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext({ ip: '192.168.0.1' }) as any;
      delete mockCtx.mockRequest.headers['x-forwarded-for'];

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 30,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 30,
        remaining: 29,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        '192.168.0.1',
        '/api/test',
        'api',
        30,
        60,
      );
    });

    it('should check handler-level config before class-level config', async () => {
      process.env.NODE_ENV = 'production';
      const handlerConfig = { tier: 'strict', key: 'user' };
      const classConfig = { tier: 'public', key: 'ip' };
      mockReflector.get
        .mockReturnValueOnce(handlerConfig) // handler
        .mockReturnValueOnce(classConfig); // class (should not be used)

      const mockCtx = createMockExecutionContext({ user: { sub: 'user-1' } }) as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 1,
        current: 1,
        window: 1,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 1,
        remaining: 0,
        resetAt: new Date(Date.now() + 1000),
      });

      await guard.canActivate(mockCtx);

      // Should use handler config (strict), not class config (public)
      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        'user-1',
        '/api/test',
        'strict',
        1,
        1,
      );
    });

    it('should fall back to class-level config when handler has no config', async () => {
      process.env.NODE_ENV = 'production';
      const classConfig = { tier: 'auth', key: 'ip' };
      mockReflector.get
        .mockReturnValueOnce(undefined) // handler: no config
        .mockReturnValueOnce(classConfig); // class: use this

      const mockCtx = createMockExecutionContext() as any;

      mockRateLimiterService.isAllowed.mockResolvedValue({
        allowed: true,
        limit: 5,
        current: 1,
        window: 60,
      });

      mockRateLimiterService.getStatus.mockResolvedValue({
        limit: 5,
        remaining: 4,
        resetAt: new Date(Date.now() + 60000),
      });

      await guard.canActivate(mockCtx);

      expect(rateLimiterService.isAllowed).toHaveBeenCalledWith(
        '127.0.0.1',
        '/api/test',
        'auth',
        5,
        60,
      );
    });
  });
});
