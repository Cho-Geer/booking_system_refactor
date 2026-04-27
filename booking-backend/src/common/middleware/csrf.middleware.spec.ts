import { CsrfMiddleware, CsrfOptions } from './csrf.middleware';

// Mock Request
const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
  method: 'GET',
  url: '/api/test',
  path: '/api/test',
  headers: {},
  ...overrides,
});

// Mock Response
const createMockResponse = () => {
  const headers: Record<string, string> = {};
  return {
    status: jest.fn((code: number) => ({
      json: jest.fn((body: unknown) => body),
      end: jest.fn(),
    })),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    headers,
  };
};

// Mock NextFunction
const createMockNext = () => jest.fn();

describe('CsrfMiddleware', () => {
  describe('with default configuration', () => {
    let middleware: CsrfMiddleware;

    beforeEach(() => {
      middleware = new CsrfMiddleware();
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    describe('bypass rules', () => {
      it('should bypass CSRF for GET requests', () => {
        const mockReq = createMockRequest({ method: 'GET' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should bypass CSRF for HEAD requests', () => {
        const mockReq = createMockRequest({ method: 'HEAD' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should bypass CSRF for OPTIONS requests', () => {
        const mockReq = createMockRequest({ method: 'OPTIONS' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should be case-insensitive for bypass methods', () => {
        const mockReq = createMockRequest({ method: 'get' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('token validation', () => {
      it('should block POST requests without CSRF token', () => {
        const mockReq = createMockRequest({ method: 'POST' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should block PUT requests without CSRF token', () => {
        const mockReq = createMockRequest({ method: 'PUT' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should block DELETE requests without CSRF token', () => {
        const mockReq = createMockRequest({ method: 'DELETE' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should block PATCH requests without CSRF token', () => {
        const mockReq = createMockRequest({ method: 'PATCH' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should block requests with token but no secret cookie', () => {
        const mockReq = createMockRequest({
          method: 'POST',
          headers: { 'x-csrf-token': 'some-token' },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should block requests with secret but no token header', () => {
        const mockReq = createMockRequest({
          method: 'POST',
          headers: { cookie: 'XSRF-TOKEN=some-secret' },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should block requests with invalid token', () => {
        const mockReq = createMockRequest({
          method: 'POST',
          headers: {
            'x-csrf-token': 'invalid-token',
            cookie: 'XSRF-TOKEN=some-secret',
          },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should allow requests with valid token', () => {
        const { token, secret } = middleware.generateToken();
        const mockReq = createMockRequest({
          method: 'POST',
          headers: {
            'x-csrf-token': token,
            cookie: `XSRF-TOKEN=${secret}`,
          },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject requests with tampered token', () => {
        const { token, secret } = middleware.generateToken();
        const tamperedToken = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');

        const mockReq = createMockRequest({
          method: 'PUT',
          headers: {
            'x-csrf-token': tamperedToken,
            cookie: `XSRF-TOKEN=${secret}`,
          },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });

    describe('token generation', () => {
      it('should generate unique tokens on each call', () => {
        const token1 = middleware.generateToken();
        const token2 = middleware.generateToken();

        expect(token1.token).not.toBe(token2.token);
        expect(token1.secret).not.toBe(token2.secret);
      });

      it('should generate token that validates against its secret', () => {
        const { token, secret } = middleware.generateToken();

        const mockReq = createMockRequest({
          method: 'POST',
          headers: {
            'x-csrf-token': token,
            cookie: `XSRF-TOKEN=${secret}`,
          },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('bypass paths', () => {
      it('should bypass CSRF for configured bypass paths', () => {
        const customOptions: CsrfOptions = {
          bypassPaths: ['/api/webhook'],
        };
        const customMiddleware = new CsrfMiddleware(customOptions);

        const mockReq = createMockRequest({
          method: 'POST',
          path: '/api/webhook',
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        customMiddleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should bypass CSRF for wildcard prefix paths', () => {
        const customOptions: CsrfOptions = {
          bypassPaths: ['/api/webhook/*'],
        };
        const customMiddleware = new CsrfMiddleware(customOptions);

        const mockReq = createMockRequest({
          method: 'POST',
          path: '/api/webhook/stripe',
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        customMiddleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should not bypass CSRF for non-matching paths', () => {
        const customOptions: CsrfOptions = {
          bypassPaths: ['/api/webhook'],
        };
        const customMiddleware = new CsrfMiddleware(customOptions);

        const mockReq = createMockRequest({
          method: 'POST',
          path: '/api/other',
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        customMiddleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should support regex bypass paths', () => {
        const customOptions: CsrfOptions = {
          bypassPaths: ['/\\/api\\/webhook\\/.*/'],
        };
        const customMiddleware = new CsrfMiddleware(customOptions);

        const mockReq = createMockRequest({
          method: 'POST',
          path: '/api/webhook/github',
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        customMiddleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('error responses', () => {
      it('should return 403 with CSRF token missing message when no token', () => {
        const mockReq = createMockRequest({ method: 'POST' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should return 403 with CSRF token validation failed message for invalid token', () => {
        const mockReq = createMockRequest({
          method: 'POST',
          headers: {
            'x-csrf-token': 'wrong-token',
            cookie: 'XSRF-TOKEN=wrong-secret',
          },
        });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        middleware.use(mockReq as any, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('with custom configuration', () => {
    it('should use custom token header name', () => {
      const customOptions: CsrfOptions = {
        tokenHeader: 'X-Custom-CSRF',
      };
      const customMiddleware = new CsrfMiddleware(customOptions);

      const { token, secret } = customMiddleware.generateToken();
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-custom-csrf': token,
          cookie: 'XSRF-TOKEN=' + secret,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      customMiddleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom cookie name', () => {
      const customOptions: CsrfOptions = {
        cookieName: 'MY-CSRF-SECRET',
      };
      const customMiddleware = new CsrfMiddleware(customOptions);

      const { token, secret } = customMiddleware.generateToken();
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          cookie: 'MY-CSRF-SECRET=' + secret,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      customMiddleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom bypass methods', () => {
      const customOptions: CsrfOptions = {
        bypassMethods: ['GET', 'HEAD', 'OPTIONS', 'TRACE'],
      };
      const customMiddleware = new CsrfMiddleware(customOptions);

      const mockReq = createMockRequest({ method: 'TRACE' });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      customMiddleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block GET requests when not in bypass methods', () => {
      const customOptions: CsrfOptions = {
        bypassMethods: [],
      };
      const customMiddleware = new CsrfMiddleware(customOptions);

      const mockReq = createMockRequest({ method: 'GET' });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      customMiddleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle multiple cookies correctly', () => {
      const { token, secret } = new CsrfMiddleware().generateToken();
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          cookie: `session=abc123; XSRF-TOKEN=${secret}; tracking=xyz`,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const middleware = new CsrfMiddleware();
      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle cookie values with equals signs', () => {
      const { token, secret } = new CsrfMiddleware().generateToken();
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          cookie: `data=key=value; XSRF-TOKEN=${secret}`,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();
      const middleware = new CsrfMiddleware();
      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should decode URL-encoded cookie value (%3D for =)', () => {
      const middleware = new CsrfMiddleware();
      const { token, secret } = middleware.generateToken();
      const encodedSecret = encodeURIComponent(secret);
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          cookie: `XSRF-TOKEN=${encodedSecret}`,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should decode URL-encoded cookie value (%2B for +)', () => {
      const middleware = new CsrfMiddleware();
      const { token, secret } = middleware.generateToken();
      const encodedSecret = encodeURIComponent(secret);
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          cookie: `XSRF-TOKEN=${encodedSecret}`,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should decode URL-encoded cookie value (%2F for /)', () => {
      const middleware = new CsrfMiddleware();
      const { token, secret } = middleware.generateToken();
      const encodedSecret = encodeURIComponent(secret);
      const mockReq = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          cookie: `XSRF-TOKEN=${encodedSecret}`,
        },
      });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
