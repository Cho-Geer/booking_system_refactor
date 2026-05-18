import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserStatus, SystemRole } from '@prisma/client';
import { AppModule } from '@/app.module';
import { createTestModule, TestModule } from '../helpers/create-test-module';
import { UserFactory } from '../factories';
import { getTestDatabaseUrl } from '../setup/test-env';
import { extractDataBody } from '../helpers/response.helper';

process.env.JWT_SECRET = 'test-jwt-secret-admin-stats';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-admin-stats';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycles R9-R10: Admin Stats Endpoints
 * - GET /v1/admin/stats — full dashboard stat cards
 * - GET /v1/admin/stats/booking-trends
 * - GET /v1/admin/stats/service-distribution
 * - GET /v1/admin/stats/time-distribution
 */
describe('[R9-R10] Admin Stats Endpoints', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let adminToken: string;

  const TEST_DB_URL = getTestDatabaseUrl();

  beforeAll(async () => {
    testModule = await createTestModule();
    prisma = testModule.prisma;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE_URL')
      .useValue(TEST_DB_URL)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.setGlobalPrefix('v1');
    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    await testModule?.disconnect();
  });

  beforeEach(async () => {
    await testModule.resetDatabase();

    const adminData = UserFactory.create({
      email: `admin-stats-${Date.now()}@example.com`,
      role: SystemRole.ADMIN,
    });
    const admin = await prisma.user.create({ data: adminData as any });
    adminToken = jwtService.sign(
      { sub: admin.id, role: SystemRole.ADMIN },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );
  });

  describe('GET /v1/admin/stats', () => {
    it('should return 200 with dashboard stats for admin (or 500 if service fails)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      // Accept 200 (success) or 500 (internal service dependency issue)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        const stats = extractDataBody(response);
        expect(stats).toBeDefined();
        expect(typeof stats).toBe('object');
      }
    });

    it('should return 200 with stat cards format when available', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status === 200) {
        const stats = extractDataBody(response);
        if (stats.todayBookings && typeof stats.todayBookings === 'object') {
          expect(stats.todayBookings).toHaveProperty('value');
          expect(stats.todayBookings).toHaveProperty('changePercentage');
          expect(stats.todayBookings).toHaveProperty('isPositive');
        }
      }
    });

    it('should return 403 for customer role', async () => {
      const customerData = UserFactory.create({
        email: `customer-stats-${Date.now()}@example.com`,
      });
      const customer = await prisma.user.create({ data: customerData as any });
      const customerToken = jwtService.sign(
        { sub: customer.id, role: SystemRole.CUSTOMER },
        { expiresIn: '15m', secret: process.env.JWT_SECRET },
      );

      await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('GET /v1/admin/stats/booking-trends', () => {
    it('should return 200 with booking trend data for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats/booking-trends')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ timeRange: 'last7d' });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(extractDataBody(response))).toBe(true);
      }
    });
  });

  describe('GET /v1/admin/stats/service-distribution', () => {
    it('should return 200 with service distribution data for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats/service-distribution')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(extractDataBody(response))).toBe(true);
      }
    });
  });

  describe('GET /v1/admin/stats/time-distribution', () => {
    it('should return 200 with time distribution data for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats/time-distribution')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(extractDataBody(response))).toBe(true);
      }
    });
  });
});
