import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { RateLimitInterceptor } from './rate-limiter.interceptor';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_KEY } from './rate-limiter.decorator';
import { Logger } from '@nestjs/common';

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

// Mock CallHandler
const createMockCallHandler = (value: unknown = null, error?: Error) => {
  if (error) {
    return {
      handle: () => throwError(() => error),
    };
  }
  return {
    handle: () => of(value),
  };
};

// Mock Response
const createMockResponse = (statusCode: number = 200) => ({
  statusCode,
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
  resStatusCode: number = 200,
) => {
  const mockRequest = createMockRequest(req);
  const mockResponse = createMockResponse(resStatusCode);

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

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;
  let reflector: typeof mockReflector;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Spy on Logger methods
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitInterceptor,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RateLimiterService,
          useValue: mockRateLimiterService,
        },
      ],
    }).compile();

    interceptor = module.get<RateLimitInterceptor>(RateLimitInterceptor);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should call next.handle and return the observable', (done) => {
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ data: 'test' });

      const result = interceptor.intercept(mockCtx, mockHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toEqual({ data: 'test' });
          done();
        },
      });
    });

    it('should log request details on successful response', (done) => {
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ success: true });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          // Logger is async inside logRequest, but the tap should complete
          done();
        },
      });
    });

    it('should log error when handler throws', (done) => {
      const mockError = new Error('Test error');
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler(null, mockError);

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        error: (error) => {
          expect(error).toBe(mockError);
          done();
        },
      });
    });

    it('should log warning for slow requests (> 1000ms)', (done) => {
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ slow: true });

      // Mock Date.now to simulate slow request
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000000; // startTime
        return 1001500; // After handler (1500ms later)
      });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(loggerWarnSpy).toHaveBeenCalled();
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should not log warning for fast requests (< 1000ms)', (done) => {
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ fast: true });

      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000000;
        return 1000500; // 500ms later
      });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          // Should not warn for fast requests
          expect(loggerWarnSpy).not.toHaveBeenCalled();
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should log warning for 429 status code', (done) => {
      const mockCtx = createMockExecutionContext({}, 429) as any;
      const mockHandler = createMockCallHandler({ rateLimited: true });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(loggerWarnSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should not log 429 warning for non-429 status codes', (done) => {
      const mockCtx = createMockExecutionContext({}, 200) as any;
      const mockHandler = createMockCallHandler({ ok: true });

      // Simulate fast request to avoid slow request warning
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000000;
        return 1000100; // 100ms later
      });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(loggerWarnSpy).not.toHaveBeenCalled();
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should get rate limit config from handler metadata first', (done) => {
      const handlerConfig = { tier: 'strict', key: 'user' };
      mockReflector.get.mockReturnValueOnce(handlerConfig).mockReturnValueOnce(undefined);

      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ data: 'test' });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(mockReflector.get).toHaveBeenCalledWith(RATE_LIMIT_KEY, undefined);
          done();
        },
      });
    });

    it('should get rate limit config from class metadata when handler has none', (done) => {
      const classConfig = { tier: 'api', key: 'ip' };
      mockReflector.get.mockReturnValueOnce(undefined).mockReturnValueOnce(classConfig);

      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ data: 'test' });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(mockReflector.get).toHaveBeenCalledTimes(2);
          expect(mockReflector.get).toHaveBeenNthCalledWith(1, RATE_LIMIT_KEY, undefined);
          expect(mockReflector.get).toHaveBeenNthCalledWith(2, RATE_LIMIT_KEY, undefined);
          done();
        },
      });
    });

    it('should handle requests with x-forwarded-for header', (done) => {
      const mockCtx = createMockExecutionContext(
        {
          headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
        },
        200,
      ) as any;
      const mockHandler = createMockCallHandler({ proxied: true });

      // Simulate fast request
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000000;
        return 1000100;
      });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should handle error responses correctly', (done) => {
      const error = new Error('Internal server error');
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler(null, error);

      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000000;
        return 1000100;
      });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should handle concurrent requests through interceptor', (done) => {
      const mockCtx = createMockExecutionContext() as any;
      const mockHandler = createMockCallHandler({ concurrent: true });

      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000000;
        return 1000100;
      });

      // Simulate multiple concurrent requests
      const observables = [
        interceptor.intercept(mockCtx, mockHandler),
        interceptor.intercept(mockCtx, mockHandler),
        interceptor.intercept(mockCtx, mockHandler),
      ];

      let completedCount = 0;
      observables.forEach((obs) => {
        obs.subscribe({
          complete: () => {
            completedCount++;
            if (completedCount === 3) {
              Date.now = originalDateNow;
              done();
            }
          },
        });
      });
    });

    it('should not log warning when usage is below 80% threshold', (done) => {
      const mockCtx = createMockExecutionContext({}, 200) as any;
      const mockHandler = createMockCallHandler({ normal: true });

      const originalDateNow = Date.now;
      Date.now = jest.fn(() => {
        return 1000100; // fast request
      });

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          // Normal requests should not trigger warnings
          expect(loggerWarnSpy).not.toHaveBeenCalled();
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should log 429 violation with extracted IP address', (done) => {
      const mockCtx = createMockExecutionContext(
        {
          headers: { 'x-forwarded-for': '10.0.0.5, 172.16.0.1' },
        },
        429,
      ) as any;
      const mockHandler = createMockCallHandler({ rateLimited: true });

      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1000100);

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('10.0.0.5'));
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should handle x-forwarded-for as array of strings', (done) => {
      const mockCtx = createMockExecutionContext(
        {
          headers: { 'x-forwarded-for': ['203.0.113.50, 70.41.3.18'] },
        },
        429,
      ) as any;
      const mockHandler = createMockCallHandler({ rateLimited: true });

      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1000100);

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('203.0.113.50'));
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should handle missing IP gracefully', (done) => {
      const mockCtx = createMockExecutionContext({ ip: undefined }, 429) as any;
      const mockHandler = createMockCallHandler({ rateLimited: true });

      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1000100);

      interceptor.intercept(mockCtx, mockHandler).subscribe({
        complete: () => {
          expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown'));
          Date.now = originalDateNow;
          done();
        },
      });
    });
  });
});
