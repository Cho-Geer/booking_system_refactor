/**
 * Integration Test: Profile API Flat Response
 *
 * Verifies the full login → profile → route flow:
 * 1. Seed admin user in database
 * 2. Authenticate and obtain JWT token
 * 3. Fetch profile via GET /users/profile
 * 4. Verify response is FLAT (not wrapped in { user: ... })
 * 5. Verify role = ADMIN at top level
 * 6. Verify RouteResolver maps ADMIN → /admin/dashboard
 *
 * TDD Status: GREEN — written after backend fix (return profile instead of { user: profile })
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserStatus, SystemRole } from '@prisma/client';
import { AppModule } from '@/app.module';
import * as bcrypt from 'bcryptjs';

// RouteResolver mirror (copied from frontend for verification)
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
  CUSTOMER: '/booking',
};
const DEFAULT_ROUTE = '/booking';
const getPostLoginRoute = (role?: string): string => {
  if (!role) return DEFAULT_ROUTE;
  return ROLE_HOME[role] || DEFAULT_ROUTE;
};

describe('Profile API Flat Response (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const ADMIN_EMAIL = 'zhaoge.tzx@gmail.com';
  const ADMIN_PASSWORD = 'Test1234!';
  const ADMIN_NAME = 'System Admin';

  let adminUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Connect to test database
    prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });
    await prisma.$connect();

    // Build the full NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    // Set global prefix to match production (main.ts uses setGlobalPrefix('v1'))
    app.setGlobalPrefix('v1');
    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    // Clean existing users with our test email
    await prisma.userSession.deleteMany({
      where: { user: { email: ADMIN_EMAIL } },
    });
    await prisma.user
      .deleteMany({
        where: { email: ADMIN_EMAIL },
      })
      .catch(() => {});

    // Seed admin user with hashed password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: hashedPassword,
        phone: '+8613800138000',
      },
    });
    adminUserId = user.id;

    // Generate JWT access token (as login would)
    accessToken = jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );

    // Create user session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: 'integration-test-session-token',
        refreshToken: jwtService.sign(
          { sub: user.id, tokenType: 'refresh', jti: 'jti-' + Date.now() },
          { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET },
        ),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  // ============================================================
  // RED Phase: Tests that would fail with OLD { user: ... } wrapping
  // ============================================================

  describe('[RED] GET /users/profile — response shape', () => {
    it('[RED] should return 200 when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // ResponseInterceptor wraps in { statusCode, message, data, ... }
      expect(response.body).toHaveProperty('data');
    });

    it('[RED] should return profile at data level (not wrapped in { user: ... })', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profile = response.body.data;

      // CRITICAL: profile must NOT have a 'user' property
      // Old buggy code returned: { user: { id, name, role, ... } }
      // Fixed code returns: { id, name, role, ... }
      expect(profile).not.toHaveProperty('user');

      // Profile fields must be at the top level of data
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('role');
    });

    it('[RED] should return ADMIN role at profile top level (not nested under user.role)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profile = response.body.data;

      // role must be directly accessible at profile.role
      expect(profile.role).toBe('ADMIN');

      // Old bug: profile.user.role was 'ADMIN' but profile.role was undefined
      // This would cause RouteResolver.getPostLoginRoute(undefined) → '/booking'
      expect(profile.name).toBe(ADMIN_NAME);
    });

    it('[RED] should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/v1/users/profile').expect(401);
    });
  });

  // ============================================================
  // GREEN Phase: Tests that verify the full flow works correctly
  // ============================================================

  describe('[GREEN] Full flow: login → profile → route resolution', () => {
    it('[GREEN] profile.role ADMIN should map to /admin/dashboard via RouteResolver', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profile = response.body.data;

      // This is exactly what the frontend does:
      // const route = RouteResolver.getPostLoginRoute(profile.role);
      const postLoginRoute = getPostLoginRoute(profile.role);

      expect(postLoginRoute).toBe('/admin/dashboard');
    });

    it('[GREEN] profile.role CUSTOMER should map to /booking via RouteResolver', async () => {
      // Seed a CUSTOMER user instead
      const customerEmail = 'customer@example.com';
      await prisma.user.deleteMany({ where: { email: customerEmail } }).catch(() => {});
      const hashedPassword = await bcrypt.hash('Test1234!', 12);
      const customerUser = await prisma.user.create({
        data: {
          email: customerEmail,
          name: 'Test Customer',
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          passwordHash: hashedPassword,
          phone: '+8613800138001',
        },
      });

      // Generate CUSTOMER JWT
      const customerToken = jwtService.sign(
        {
          sub: customerUser.id,
          email: customerUser.email,
          name: customerUser.name,
          role: customerUser.role,
        },
        { expiresIn: '15m', secret: process.env.JWT_SECRET },
      );

      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const profile = response.body.data;

      // CUSTOMER role at top level
      expect(profile.role).toBe('CUSTOMER');
      expect(profile).not.toHaveProperty('user');

      // RouteResolver maps CUSTOMER → /booking
      const postLoginRoute = getPostLoginRoute(profile.role);
      expect(postLoginRoute).toBe('/booking');
    });

    it('[GREEN] undefined role (no profile) should default to /booking', () => {
      const route = getPostLoginRoute(undefined);
      expect(route).toBe('/booking');
    });

    it('[GREEN] should return 401 for expired token', async () => {
      // Create an expired token
      const expiredToken = jwtService.sign(
        { sub: adminUserId, role: 'ADMIN' },
        { expiresIn: '0s', secret: process.env.JWT_SECRET },
      );

      await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});
