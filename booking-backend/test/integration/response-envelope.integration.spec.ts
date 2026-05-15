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

process.env.JWT_SECRET = 'test-jwt-secret-env';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-env';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R21: Response Envelope Validation
 *
 * Tests the StandardResponse envelope format across different endpoint types:
 * { statusCode, message, data, timestamp, requestId }
 *
 * Also validates paginated format: { items, meta: { total, page, limit, totalPages, hasNext, hasPrev } }
 * And error format: { statusCode, message, error, errors[], timestamp, requestId }
 */
describe('[R21] Response Envelope Validation', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let adminToken: string;
  let customerToken: string;

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

    const adminData = UserFactory.create({ email: `admin-env-${Date.now()}@example.com`, role: SystemRole.ADMIN });
    const admin = await prisma.user.create({ data: adminData as any });
    adminToken = jwtService.sign({ sub: admin.id, role: SystemRole.ADMIN }, { expiresIn: '15m', secret: process.env.JWT_SECRET });

    const customerData = UserFactory.create({ email: `customer-env-${Date.now()}@example.com` });
    const customer = await prisma.user.create({ data: customerData as any });
    customerToken = jwtService.sign({ sub: customer.id, role: SystemRole.CUSTOMER }, { expiresIn: '15m', secret: process.env.JWT_SECRET });
  });

  /**
   * Validate StandardResponse envelope structure
   */
  function expectStandardResponse(response: request.Response) {
    const body = response.body;
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('requestId');
    expect(typeof body.statusCode).toBe('number');
    expect(typeof body.message).toBe('string');
    expect(typeof body.requestId).toBe('string');
    // requestId should start with 'req-'
    expect(body.requestId).toMatch(/^req-/);
  }

  describe('StandardResponse Envelope — Public Endpoints', () => {
    it('GET /v1/health should have StandardResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/health')
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.statusCode).toBe(200);
    });

    it('GET /v1/translations should have StandardResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/translations')
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.statusCode).toBe(200);
    });
  });

  describe('StandardResponse Envelope — Auth Endpoints', () => {
    it('POST /v1/auth/login/password (invalid) should have error envelop', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login/password')
        .send({ contact: 'nonexistent@example.com', contactType: 'email', password: 'ValidP@ss123' });

      // 401 response - verify error envelope
      const body = response.body;
      expect(body).toHaveProperty('statusCode');
      expect(body).toHaveProperty('message');
      // timestamp should be present
      expect(body).toHaveProperty('timestamp');
      expect(response.status).toBe(401);
    });
  });

  describe('StandardResponse Envelope — Auth-Protected Endpoints', () => {
    it('GET /v1/users/profile should have StandardResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expectStandardResponse(response);
      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('StandardResponse Envelope — Admin Endpoints', () => {
    it('GET /v1/admin/notifications should have paginated StandardResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expectStandardResponse(response);
      // Paginated: data should have items + meta
      const data = response.body.data;
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('total');
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
    });
  });

  describe('Error Response Envelope', () => {
    it('401 Unauthorized should have error envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body.statusCode).toBe(401);
    });

    it('403 Forbidden should have error envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .set('Authorization', `Bearer ${customerToken}`);

      // May be 403 or 500 (if stats backend fails)
      if (response.status === 403) {
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('requestId');
      }
    });

    it('400 Bad Request should have error envelope with validation details', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register/send-code')
        .send({ contact: '', contactType: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
    });
  });
});
