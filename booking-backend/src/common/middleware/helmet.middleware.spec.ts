import { HelmetMiddleware } from './helmet.middleware';

// Mock Request
const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
  method: 'GET',
  url: '/api/test',
  headers: {},
  ...overrides,
});

// Mock Response
const createMockResponse = () => {
  const headers: Record<string, string> = {};
  return {
    getHeader: jest.fn((name: string) => headers[name]),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    removeHeader: jest.fn((name: string) => {
      delete headers[name];
    }),
    getHeaders: jest.fn(() => headers),
    headers,
  };
};

// Mock NextFunction
const createMockNext = () => jest.fn();

describe('HelmetMiddleware', () => {
  let middleware: HelmetMiddleware;

  beforeEach(() => {
    middleware = new HelmetMiddleware();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should call next() without throwing', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      expect(() => {
        middleware.use(mockReq as any, mockRes as any, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set Content-Security-Policy header', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'"),
      );
    });

    it('should set Strict-Transport-Security header with preload', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=31536000'),
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('includeSubDomains'),
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('preload'),
      );
    });

    it('should set X-Frame-Options to DENY', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-Content-Type-Options to nosniff', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-DNS-Prefetch-Control to off', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
    });

    it('should set X-Download-Options to noopen', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Download-Options', 'noopen');
    });

    it('should set X-Permitted-Cross-Domain-Policies to none', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Permitted-Cross-Domain-Policies',
        'none',
      );
    });

    it('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
    });

    it('should set X-XSS-Protection header', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        expect.stringContaining('0'),
      );
    });

    it('should set Cross-Origin-Opener-Policy header', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Opener-Policy',
        expect.any(String),
      );
    });

    it('should set Cross-Origin-Embedder-Policy header', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Embedder-Policy',
        expect.any(String),
      );
    });

    it('should set Cross-Origin-Resource-Policy header', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Resource-Policy',
        'same-origin',
      );
    });

    it('should set Origin-Agent-Cluster header', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Origin-Agent-Cluster',
        expect.any(String),
      );
    });

    it('should work with POST requests', () => {
      const mockReq = createMockRequest({ method: 'POST', url: '/api/bookings' });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String),
      );
    });

    it('should handle requests with custom headers', () => {
      const mockReq = createMockRequest({
        headers: {
          'x-custom-header': 'custom-value',
          authorization: 'Bearer token123',
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      expect(() => {
        middleware.use(mockReq as any, mockRes as any, mockNext);
      }).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
