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

process.env.JWT_SECRET = 'test-jwt-secret-admin-sys';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-admin-sys';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R16: Admin System
 * - GET /v1/admin/system/health — system health status
 * - GET /v1/admin/system/metrics — system metrics
 */
describe('[R16] Admin System', () => {
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
      email: `admin-sys-${Date.now()}@example.com`,
      role: SystemRole.ADMIN,
    });
    const admin = await prisma.user.create({ data: adminData as any });
    adminToken = jwtService.sign(
      { sub: admin.id, role: SystemRole.ADMIN },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );
  });

  describe('GET /v1/admin/system/health', () => {
    it('should return system health status for ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = extractDataBody(response);
      // Health response has server/database/api/redis status fields
      expect(data).toHaveProperty('server');
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('api');
      expect(data).toHaveProperty('redis');
      expect(data).toHaveProperty('uptime');
    });

    it('should return 403 for CUSTOMER role', async () => {
      const customerData = UserFactory.create({ email: `customer-sys-${Date.now()}@example.com` });
      const customer = await prisma.user.create({ data: customerData as any });
      const customerToken = jwtService.sign(
        { sub: customer.id, role: SystemRole.CUSTOMER },
        { expiresIn: '15m', secret: process.env.JWT_SECRET },
      );

      await request(app.getHttpServer())
        .get('/v1/admin/system/health')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('GET /v1/admin/system/metrics', () => {
    it('should return system metrics for ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/system/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = extractDataBody(response);
      expect(data).toBeDefined();
      // Should have cpu/memory/disk metrics or similar
      expect(typeof data).toBe('object');
    });

    it('should return 403 for CUSTOMER role', async () => {
      const customerData = UserFactory.create({ email: `customer-sys2-${Date.now()}@example.com` });
      const customer = await prisma.user.create({ data: customerData as any });
      const customerToken = jwtService.sign(
        { sub: customer.id, role: SystemRole.CUSTOMER },
        { expiresIn: '15m', secret: process.env.JWT_SECRET },
      );

      await request(app.getHttpServer())
        .get('/v1/admin/system/metrics')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});
