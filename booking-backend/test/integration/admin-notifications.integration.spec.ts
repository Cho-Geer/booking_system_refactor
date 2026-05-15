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

process.env.JWT_SECRET = 'test-jwt-secret-admin-notif';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-admin-notif';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R15: Admin Notifications
 * - GET /v1/admin/notifications — paginated list
 * - POST /v1/admin/notifications/:id/read — mark as read
 */
describe('[R15] Admin Notifications', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let adminToken: string;
  let adminId: string;

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

    const adminData = UserFactory.create({ email: `admin-notif-${Date.now()}@example.com`, role: SystemRole.ADMIN });
    const admin = await prisma.user.create({ data: adminData as any });
    adminId = admin.id;
    adminToken = jwtService.sign({ sub: admin.id, role: SystemRole.ADMIN }, { expiresIn: '15m', secret: process.env.JWT_SECRET });
  });

  describe('GET /v1/admin/notifications', () => {
    it('should return paginated notifications for ADMIN', async () => {
      // Create a test notification
      await prisma.notification.create({
        data: {
          userId: adminId,
          title: 'Test Notification',
          content: 'This is a test',
          type: 'SYSTEM',
          isRead: false,
        } as any,
      });

      const response = await request(app.getHttpServer())
        .get('/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const data = extractDataBody(response);
      expect(data.items).toBeDefined();
      expect(data.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should support unread_only filter', async () => {
      await prisma.notification.create({ data: { userId: adminId, title: 'Unread', content: 'Unread msg', type: 'SYSTEM', isRead: false } as any });
      await prisma.notification.create({ data: { userId: adminId, title: 'Read', content: 'Read msg', type: 'SYSTEM', isRead: true } as any });

      const response = await request(app.getHttpServer())
        .get('/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ unread_only: true })
        .expect(200);

      const data = extractDataBody(response);
      expect(data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for CUSTOMER role', async () => {
      const customerData = UserFactory.create({ email: `customer-notif-${Date.now()}@example.com` });
      const customer = await prisma.user.create({ data: customerData as any });
      const customerToken = jwtService.sign({ sub: customer.id, role: SystemRole.CUSTOMER }, { expiresIn: '15m', secret: process.env.JWT_SECRET });

      await request(app.getHttpServer())
        .get('/v1/admin/notifications')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('POST /v1/admin/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notif = await prisma.notification.create({
        data: { userId: adminId, title: 'Mark Read', content: 'To be read', type: 'SYSTEM', isRead: false } as any,
      });

      const response = await request(app.getHttpServer())
        .post(`/v1/admin/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
    });
  });
});
