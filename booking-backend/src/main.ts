import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { CsrfMiddleware } from "./common/middleware/csrf.middleware";
import * as net from "node:net";

// Patch nodemailer's DNS resolution to respect the `family` transport option.
// nodemailer v8.0.5's resolveHostname resolves both A and AAAA records, then
// randomly picks one — ignoring options.family. When IPv6 is unreachable this
// causes ENETUNREACH. The monkey-patch filters resolved addresses by family.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailerShared: typeof import("nodemailer/lib/shared") = require("nodemailer/lib/shared");
const origResolveHostname =
  nodemailerShared.resolveHostname.bind(nodemailerShared);
nodemailerShared.resolveHostname = (
  options: { host?: string; family?: number },
  callback: (
    err: Error | null,
    value: {
      host: string;
      servername: string | false;
      _cached?: true;
      _addresses?: string[];
    },
  ) => void,
) => {
  const family = options?.family;
  if (family === 4 || family === 6) {
    const wrappedCallback = callback;
    callback = (err, resolved) => {
      if (!err && resolved?._addresses) {
        const filtered = resolved._addresses.filter((addr: string) =>
          family === 4 ? net.isIPv4(addr) : net.isIPv6(addr),
        );
        if (filtered.length > 0) {
          resolved._addresses = filtered;
          resolved.host = filtered[Math.floor(Math.random() * filtered.length)];
        }
      }
      wrappedCallback(err, resolved);
    };
  }
  return origResolveHostname(options, callback);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  // Security
  app.use(helmet());

  // FIX-P2-004: 严格 CORS 配置
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4200")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const serverOrigin = `http://localhost:${process.env.PORT || 3000}`;
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin === serverOrigin
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-ID",
      "X-CSRF-Token",
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  // CSRF protection middleware
  // Bypass paths: CSRF token endpoint itself and Swagger docs
  const csrfMiddleware = new CsrfMiddleware({
    bypassPaths: ["/v1/csrf/token", "/api/docs", "/api/docs/*"],
  });
  app.use(csrfMiddleware.use.bind(csrfMiddleware));

  // CSRF token endpoint (must be registered before global prefix for bypassPaths to work)
  app.use("/v1/csrf/token", (_req: any, res: any) => {
    const { token, secret } = csrfMiddleware.generateToken();
    res.cookie("XSRF-TOKEN", secret, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    res.json({ token });
  });

  // Global prefix (matches contract.yaml baseline)
  app.setGlobalPrefix("v1");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === "production",
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Booking System API")
    .setDescription("API documentation for the Booking System")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerCsrfInterceptor = `
(function() {
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
})();
`;

  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJsStr: [swaggerCsrfInterceptor],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 API documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
