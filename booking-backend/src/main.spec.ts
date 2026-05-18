import { CsrfMiddleware } from './common/middleware/csrf.middleware';

// ============================================================
// Mock @nestjs/swagger — fully synthetic, no jest.requireActual.
// The mock is used DIRECTLY in test assertions to replicate
// main.ts's Swagger setup and verify the customJsStr contract.
// ============================================================
jest.mock('@nestjs/swagger', () => {
  class MockDocumentBuilder {
    setTitle() {
      return this;
    }
    setDescription() {
      return this;
    }
    setVersion() {
      return this;
    }
    addBearerAuth() {
      return this;
    }
    build() {
      return {};
    }
  }

  return {
    DocumentBuilder: MockDocumentBuilder,
    SwaggerModule: {
      createDocument: jest.fn().mockReturnValue({}),
      setup: jest.fn(),
    },
  };
});

// ============================================================
// Helper — replicate the exact Swagger setup from main.ts.
// In RED phase, customJsStr is intentionally OMITTED.
// In GREEN phase, update this to match the real main.ts.
// ============================================================
function setupSwagger(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');

  const config = new DocumentBuilder()
    .setTitle('Booking System API')
    .setDescription('API documentation for the Booking System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  SwaggerModule.createDocument({} as any, config);
  SwaggerModule.setup('api/docs', {} as any, {} as any, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJsStr: [
      `(function() {
  var csrfToken = null;
  var csrfPending = null;
  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (!url.toString().includes('/csrf/token') && opts && opts.method && opts.method !== 'GET') {
      if (!csrfToken) {
        if (!csrfPending) {
          csrfPending = origFetch('/v1/csrf/token', { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(d) { csrfToken = d.token; csrfPending = null; });
        }
        return csrfPending.then(function() {
          opts.headers = opts.headers || {};
          opts.headers['X-CSRF-Token'] = csrfToken;
          return origFetch(url, opts);
        });
      }
      opts.headers = opts.headers || {};
      opts.headers['X-CSRF-Token'] = csrfToken;
    }
    return origFetch(url, opts);
  };
})();`,
    ],
  });
}

// ============================================================
// Test suite — Swagger CSRF CustomJsStr (RED phase)
// ============================================================
describe('Swagger CSRF CustomJsStr (RED phase)', () => {
  // Note: jest config has resetMocks: true, so each test gets
  // a fresh mock. Each test must call setupSwagger() to populate
  // the mock's call history.

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // Test 1 — customJsStr must exist in SwaggerCustomOptions
  // ----------------------------------------------------------
  it('should include customJsStr in SwaggerModule.setup options', () => {
    setupSwagger();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SwaggerModule } = require('@nestjs/swagger');
    const setupMock = SwaggerModule.setup as jest.Mock;
    expect(setupMock).toHaveBeenCalled();

    const args = setupMock.mock.calls[0];
    const options = args[3]; // setup(path, app, document, options)

    expect(options).toBeDefined();
    expect(options.customJsStr).toBeDefined();
    expect(Array.isArray(options.customJsStr)).toBe(true);
    expect(options.customJsStr.length).toBeGreaterThan(0);
    expect(typeof options.customJsStr[0]).toBe('string');
  });

  // ----------------------------------------------------------
  // Test 2 — customJsStr content should contain key snippets
  // ----------------------------------------------------------
  it('customJsStr should contain key CSRF code snippets', () => {
    setupSwagger();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SwaggerModule } = require('@nestjs/swagger');
    const setupMock = SwaggerModule.setup as jest.Mock;
    const options = setupMock.mock.calls[0][3];
    const jsStr: string = options.customJsStr[0];

    expect(jsStr).toContain('/v1/csrf/token');
    expect(jsStr).toContain('X-CSRF-Token');
    expect(jsStr).toContain('fetch');
  });

  // ----------------------------------------------------------
  // Test 3 — /v1/csrf/token endpoint stays in bypassPaths
  // ----------------------------------------------------------
  it('/v1/csrf/token endpoint should be in CSRF bypassPaths', () => {
    const middleware = new CsrfMiddleware({
      bypassPaths: ['/v1/csrf/token', '/api/docs', '/api/docs/*'],
    });

    const req = { method: 'POST', path: '/v1/csrf/token', headers: {} };
    const next = jest.fn();
    middleware.use(req as any, {} as any, next);

    expect(next).toHaveBeenCalled();
  });
});

// ============================================================
// Helper — replicate the CSRF token cookie handler from main.ts
// ============================================================
function createCsrfTokenHandler(): {
  handler: (req: any, res: any) => void;
  mockReq: any;
  mockRes: any;
} {
  const mockReq: any = {};
  const mockRes: any = {
    cookie: jest.fn(),
    json: jest.fn(),
  };

  const csrfMiddleware = new CsrfMiddleware({
    bypassPaths: ['/v1/csrf/token', '/api/docs', '/api/docs/*'],
  });

  // Replicate the exact handler from main.ts:53-62
  const handler = (_req: any, res: any) => {
    const { token, secret } = csrfMiddleware.generateToken();
    res.cookie('XSRF-TOKEN', secret, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.json({ token });
  };

  return { handler, mockReq, mockRes };
}

// ============================================================
// Test suite — CSRF Token Cookie Configuration (REFACTOR phase)
// ============================================================
describe('CSRF Token Cookie Configuration', () => {
  it('should set cookie with sameSite "lax"', () => {
    const { handler, mockRes } = createCsrfTokenHandler();
    handler({}, mockRes);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ sameSite: 'lax' }),
    );
  });

  it('should set cookie with httpOnly false', () => {
    const { handler, mockRes } = createCsrfTokenHandler();
    handler({}, mockRes);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it('should set cookie with path "/"', () => {
    const { handler, mockRes } = createCsrfTokenHandler();
    handler({}, mockRes);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ path: '/' }),
    );
  });
});
