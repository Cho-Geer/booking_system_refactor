import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AppModule } from "./app.module";
import { HelmetMiddleware } from "./common/middleware/helmet.middleware";
import { CsrfMiddleware } from "./common/middleware/csrf.middleware";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  // Security: Helmet (CSP, HSTS, X-Frame-Options, etc.)
  const helmetInstance = new HelmetMiddleware();
  app.use(helmetInstance.use.bind(helmetInstance));

  // cookieParser must be registered BEFORE CsrfMiddleware
  app.use(cookieParser());

  // CSRF protection (double-submit cookie pattern)
  // Exempt the token endpoint and Swagger docs from CSRF checks
  const csrfInstance = new CsrfMiddleware({
    bypassPaths: ["/v1/csrf/token", "/api/docs", "/api/docs/*"],
  });
  app.use(csrfInstance.use.bind(csrfInstance));

  // CSRF token endpoint — generates token/secret pair, sets XSRF-TOKEN cookie
  app.use("/v1/csrf/token", (req: Request, res: Response) => {
    const { token, secret } = csrfInstance.generateToken();
    res.cookie("XSRF-TOKEN", secret, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    res.json({ token });
  });

  // FIX-P2-004: 严格 CORS 配置
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4200")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // 允许非浏览器请求（如 Swagger/curl）或白名单来源
      if (!origin || allowedOrigins.includes(origin)) {
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
    ],
    exposedHeaders: ["X-Request-ID"],
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
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 API documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
