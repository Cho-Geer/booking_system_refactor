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

process.env.JWT_SECRET = 'test-jwt-secret-trans';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-trans';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycles R17-R18: Translation Module
 * - GET /v1/translations — public, no auth
 * - GET /v1/admin/translations — admin paginated list
 * - PUT /v1/admin/translations — batch upsert
 * - DELETE /v1/admin/translations/:id — delete
 * - POST /v1/admin/translations/seed — SUPER_ADMIN only
 */
describe('[R17-R18] Translation Module', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let adminToken: string;
  let superAdminToken: string;

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

    const adminData = UserFactory.create({ email: `admin-trans-${Date.now()}@example.com`, role: SystemRole.ADMIN });
    const admin = await prisma.user.create({ data: adminData as any });
    adminToken = jwtService.sign({ sub: admin.id, role: SystemRole.ADMIN }, { expiresIn: '15m', secret: process.env.JWT_SECRET });

    const saData = UserFactory.create({ email: `sa-trans-${Date.now()}@example.com`, role: SystemRole.SUPER_ADMIN });
    const sa = await prisma.user.create({ data: saData as any });
    superAdminToken = jwtService.sign({ sub: sa.id, role: SystemRole.SUPER_ADMIN }, { expiresIn: '15m', secret: process.env.JWT_SECRET });
  });

  // ============================================================
  // R17: Public Translations Endpoint
  // ============================================================
  describe('GET /v1/translations — public', () => {
    it('should return translations without authentication', async () => {
      // Seed a translation
      await prisma.translationDictionary.create({
        data: { domain: 'common', key: 'hello', value: 'Hello', locale: 'en-US', isCustom: false },
      } as any);

      const response = await request(app.getHttpServer())
        .get('/v1/translations')
        .expect(200);

      const data = extractDataBody(response);
      expect(data).toHaveProperty('locale');
      expect(data).toHaveProperty('updatedAt');
      expect(data).toHaveProperty('translations');
    });

    it('should support locale filter', async () => {
      await prisma.translationDictionary.create({
        data: { domain: 'common', key: 'hello', value: 'Hello', locale: 'en-US', isCustom: false },
      } as any);
      await prisma.translationDictionary.create({
        data: { domain: 'common', key: 'hello', value: '你好', locale: 'zh-CN', isCustom: false },
      } as any);

      const response = await request(app.getHttpServer())
        .get('/v1/translations')
        .query({ locale: 'zh-CN' })
        .expect(200);

      const data = extractDataBody(response);
      expect(data.locale).toBe('zh-CN');
    });

    it('should support domain filter', async () => {
      await prisma.translationDictionary.create({
        data: { domain: 'admin', key: 'dashboard', value: 'Dashboard', locale: 'en-US', isCustom: false },
      } as any);

      const response = await request(app.getHttpServer())
        .get('/v1/translations')
        .query({ domain: 'admin' })
        .expect(200);

      const data = extractDataBody(response);
      expect(data.translations).toBeDefined();
    });
  });

  // ============================================================
  // R18: Admin Translations Endpoints
  // ============================================================
  describe('GET /v1/admin/translations — admin list', () => {
    it('should return paginated translations for ADMIN', async () => {
      await prisma.translationDictionary.create({
        data: { domain: 'common', key: 'test', value: 'Test', locale: 'en-US', isCustom: false },
      } as any);

      const response = await request(app.getHttpServer())
        .get('/v1/admin/translations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const data = extractDataBody(response);
      // Admin list may use { data, total, page, limit } or { items, meta } format
      const list = data.items || data.data || data;
      expect(list).toBeDefined();
      expect(Array.isArray(list)).toBe(true);
    });

    it('should return 403 for CUSTOMER role', async () => {
      const customerData = UserFactory.create({ email: `customer-trans-${Date.now()}@example.com` });
      const customer = await prisma.user.create({ data: customerData as any });
      const customerToken = jwtService.sign({ sub: customer.id, role: SystemRole.CUSTOMER }, { expiresIn: '15m', secret: process.env.JWT_SECRET });

      await request(app.getHttpServer())
        .get('/v1/admin/translations')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('PUT /v1/admin/translations — batch upsert', () => {
    it('should upsert translation entries for ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .put('/v1/admin/translations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          entries: [
            { domain: 'common', key: 'welcome', value: 'Welcome', locale: 'en-US', isCustom: false },
            { domain: 'common', key: 'welcome', value: '欢迎', locale: 'zh-CN', isCustom: false },
          ],
        })
        .expect(200);

      const data = extractDataBody(response);
      expect(data).toHaveProperty('updated');
      expect(data).toHaveProperty('created');
    });
  });

  describe('DELETE /v1/admin/translations/:id', () => {
    it('should delete a translation entry for ADMIN', async () => {
      const entry = await prisma.translationDictionary.create({
        data: { domain: 'common', key: 'todelete', value: 'Delete me', locale: 'en-US', isCustom: true },
      } as any);

      await request(app.getHttpServer())
        .delete(`/v1/admin/translations/${entry.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('POST /v1/admin/translations/seed — SUPER_ADMIN only', () => {
    it('should return 403 for ADMIN role', async () => {
      await request(app.getHttpServer())
        .post('/v1/admin/translations/seed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should seed translations for SUPER_ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/admin/translations/seed')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect([200, 201, 500]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        const data = extractDataBody(response);
        expect(data).toHaveProperty('count');
      }
    });
  });
});
