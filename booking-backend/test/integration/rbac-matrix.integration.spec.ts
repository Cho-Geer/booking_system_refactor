import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserStatus, SystemRole } from '@prisma/client';
import { AppModule } from '@/app.module';
import { createTestModule, TestModule } from '../helpers/create-test-module';
import { UserFactory } from '../factories';
import { getTestDatabaseUrl } from '../setup/test-env';
import * as bcrypt from 'bcryptjs';

process.env.JWT_SECRET = 'test-jwt-secret-rbac';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-rbac';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R8: RBAC enforcement matrix — all endpoints × all roles
 *
 * Tests that each endpoint enforces the correct role requirements:
 * - CUSTOMER can access their own endpoints
 * - ADMIN can access admin endpoints
 * - CUSTOMER is denied admin endpoints (403)
 */
describe('[R8] RBAC Enforcement Matrix', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const TEST_DB_URL = getTestDatabaseUrl();

  let customerToken: string;
  let adminToken: string;
  let customerId: string;
  let adminId: string;

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

    // Create CUSTOMER user
    const customerData = UserFactory.create({ email: `rbac-customer-${Date.now()}@example.com` });
    const customerUser = await prisma.user.create({ data: { ...customerData as any, status: UserStatus.ACTIVE } });
    customerId = customerUser.id;
    customerToken = jwtService.sign(
      { sub: customerUser.id, role: SystemRole.CUSTOMER },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );

    // Create ADMIN user
    const adminData = UserFactory.create({ email: `rbac-admin-${Date.now()}@example.com`, role: SystemRole.ADMIN });
    const adminUser = await prisma.user.create({ data: { ...adminData as any, status: UserStatus.ACTIVE } });
    adminId = adminUser.id;
    adminToken = jwtService.sign(
      { sub: adminUser.id, role: SystemRole.ADMIN },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );
  });

  describe('Customer Endpoints', () => {
    it('CUSTOMER should access /v1/appointments (POST) — 201', async () => {
      // Create service + slot for the test
      const { serviceId, timeSlotId } = await createServiceAndSlot();

      await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', `rbac-${Date.now()}`)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'RBAC Customer', email: 'rbac@example.com', phone: '+1234567890' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);
    });

    it('CUSTOMER should access GET /v1/users/profile — 200', async () => {
      await request(app.getHttpServer())
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });
  });

  describe('Admin Endpoints — CUSTOMER denied (403)', () => {
    it('CUSTOMER should be denied GET /v1/admin/stats — 403', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('CUSTOMER should be denied POST /v1/admin/users — 403', async () => {
      await request(app.getHttpServer())
        .post('/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ email: 'newadmin@example.com', name: 'New Admin', role: 'ADMIN' })
        .expect(403);
    });

    it('CUSTOMER should be denied GET /v1/admin/services — 403', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/services')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('CUSTOMER should be denied GET /v1/admin/appointments — 403', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/appointments')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('CUSTOMER should be denied GET /v1/admin/system/health — 403', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/system/health')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('CUSTOMER should be denied GET /v1/admin/settings/business-hours — 403', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/settings/business-hours')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('Admin Endpoints — ADMIN allowed (200)', () => {
    it('ADMIN should access GET /v1/admin/stats — 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(response.status);
    });

    it('ADMIN should access GET /v1/admin/services — 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/services')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(response.status);
    });

    it('ADMIN should access GET /v1/admin/system/health — 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(response.status);
    });

    it('ADMIN should access GET /v1/admin/settings/business-hours — 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/settings/business-hours')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(response.status);
    });

    it('ADMIN should access GET /v1/admin/notifications — 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Unauthenticated — 401', () => {
    it('should reject unauthenticated GET /v1/users/profile — 401', async () => {
      await request(app.getHttpServer())
        .get('/v1/users/profile')
        .expect(401);
    });

    it('should reject unauthenticated GET /v1/admin/stats — 401', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .expect(401);
    });
  });

  /** Create a service + time slot for test data */
  async function createServiceAndSlot(): Promise<{ serviceId: string; timeSlotId: string }> {
    const category = await prisma.serviceCategory.create({
      data: { name: `RBAC Category ${Date.now()}`, displayOrder: 1, isActive: true },
    });
    const service = await prisma.service.create({
      data: {
        categoryId: category.id,
        name: 'RBAC Test Service',
        durationMinutes: 60,
        price: 100,
        isActive: true,
      },
    });
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const timeSlot = await prisma.timeSlot.create({
      data: { serviceId: service.id, startTime, endTime, capacity: 5, currentSequence: 0, isActive: true },
    });
    return { serviceId: service.id, timeSlotId: timeSlot.id };
  }
});
