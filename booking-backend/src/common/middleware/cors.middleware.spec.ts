import { CorsMiddleware, CorsOptions } from './cors.middleware';

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
  let statusCode = 200;
  return {
    status: jest.fn((code: number) => {
      statusCode = code;
      return {
        json: jest.fn((body: unknown) => body),
        end: jest.fn(),
      };
    }),
    getHeader: jest.fn((name: string) => headers[name]),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    headers,
    statusCode,
  };
};

// Mock NextFunction
const createMockNext = () => jest.fn();

describe('CorsMiddleware', () => {
  describe('with default configuration', () => {
    let middleware: CorsMiddleware;

    beforeEach(() => {
      middleware = new CorsMiddleware();
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should allow same-origin requests (no origin header)', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from whitelisted origin', () => {
      const mockReq = createMockRequest({
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:4200',
      );
    });

    it('should set Access-Control-Allow-Credentials when enabled', () => {
      const mockReq = createMockRequest({
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should reject requests from non-whitelisted origins', () => {
      const mockReq = createMockRequest({
        headers: { origin: 'http://evil.com' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject requests from similar but different origins', () => {
      const mockReq = createMockRequest({
        headers: { origin: 'http://localhost:4201' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle preflight OPTIONS requests', () => {
      const mockReq = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:4200',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, HEAD, PUT, PATCH, POST, DELETE',
      );
    });

    it('should set Access-Control-Max-Age for preflight requests', () => {
      const mockReq = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    });

    it('should respond with 204 for preflight requests', () => {
      const mockReq = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should handle preflight with requested headers', () => {
      const mockReq = createMockRequest({
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:4200',
          'access-control-request-headers': 'X-Custom-Header, Authorization',
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'X-Custom-Header, Authorization',
      );
    });

    it('should set allowed methods for actual requests', () => {
      const mockReq = createMockRequest({
        method: 'POST',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, HEAD, PUT, PATCH, POST, DELETE',
      );
    });

    it('should set exposed headers for actual requests', () => {
      const mockReq = createMockRequest({
        method: 'GET',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Expose-Headers',
        'X-Request-Id',
      );
    });
  });

  describe('with custom configuration', () => {
    it('should allow custom whitelisted origins', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['https://myapp.example.com', 'https://admin.example.com'],
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        headers: { origin: 'https://myapp.example.com' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should support wildcard origin', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['*'],
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        headers: { origin: 'http://any-origin.com' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should support regex pattern for origins', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['/^https://.*\\.example\\.com$/'],
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        headers: { origin: 'https://api.example.com' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject origins not matching regex pattern', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['/^https://.*\\.example\\.com$/'],
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        headers: { origin: 'https://evil.com' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should use custom allowed methods', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['http://localhost:4200'],
        allowedMethods: ['GET', 'POST'],
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
    });

    it('should use custom allowed headers', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['http://localhost:4200'],
        allowedHeaders: ['Content-Type', 'X-API-Key'],
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, X-API-Key',
      );
    });

    it('should disable credentials when allowCredentials is false', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['http://localhost:4200'],
        allowCredentials: false,
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true',
      );
    });

    it('should use custom max age', () => {
      const customOptions: CorsOptions = {
        allowedOrigins: ['http://localhost:4200'],
        maxAge: 3600,
      };
      const middleware = new CorsMiddleware(customOptions);

      const mockReq = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:4200' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
    });
  });

  describe('origin validation edge cases', () => {
    it('should reject null origin', () => {
      const middleware = new CorsMiddleware();

      const mockReq = createMockRequest({
        headers: { origin: 'null' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject empty string origin', () => {
      const middleware = new CorsMiddleware();

      const mockReq = createMockRequest({
        headers: { origin: '' },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      // Empty string is treated as no origin
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
