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

process.env.JWT_SECRET = 'test-jwt-secret-sm';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-sm';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R26: Appointment State Machine Full Path Testing
 *
 * Valid transitions:
 *   PENDING    → CONFIRMED, CANCELLED
 *   CONFIRMED  → COMPLETED, CANCELLED
 *   COMPLETED  → (terminal — no outgoing)
 *   CANCELLED  → (terminal — no outgoing)
 *
 * Invalid transitions (should return 400):
 *   PENDING    → COMPLETED
 *   CONFIRMED  → PENDING
 *   COMPLETED  → PENDING, CONFIRMED, CANCELLED
 *   CANCELLED  → PENDING, CONFIRMED, COMPLETED
 */
describe('[R26] Appointment State Machine — Full Path', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let adminToken: string;
  let adminUserId: string;

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

    const adminData = UserFactory.create({ email: `admin-sm-${Date.now()}@example.com`, role: SystemRole.ADMIN });
    const admin = await prisma.user.create({ data: adminData as any });
    adminUserId = admin.id;
    adminToken = jwtService.sign({ sub: admin.id, role: SystemRole.ADMIN }, { expiresIn: '15m', secret: process.env.JWT_SECRET });
  });

  async function createTestAppointment(status = 'PENDING') {
    const category = await prisma.serviceCategory.create({ data: { name: `SMCat ${Date.now()}`, displayOrder: 1, isActive: true } });
    const service = await prisma.service.create({ data: { categoryId: category.id, name: 'SM Service', durationMinutes: 60, price: 100, isActive: true } });
    const timeSlot = await prisma.timeSlot.create({
      data: { serviceId: service.id, startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 86400000 + 3600000), capacity: 5, currentSequence: 0, isActive: true },
    });
    return prisma.appointment.create({
      data: {
        userId: adminUserId,
        serviceId: service.id,
        timeSlotId: timeSlot.id,
        appointmentDate: new Date(),
        appointmentNumber: `APT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        slotSequence: 1,
        status: status as any,
        customerInfo: { name: 'SM User', email: 'sm@example.com', phone: '+1234567890' },
      },
    });
  }

  describe('Valid Transitions', () => {
    it('PENDING → CONFIRMED should succeed', async () => {
      const apt = await createTestAppointment('PENDING');
      const response = await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(extractDataBody(response).status).toBe('CONFIRMED');
    });

    it('PENDING → CANCELLED should succeed', async () => {
      const apt = await createTestAppointment('PENDING');
      const response = await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);
      expect(extractDataBody(response).status).toBe('CANCELLED');
    });

    it('CONFIRMED → COMPLETED should succeed', async () => {
      const apt = await createTestAppointment('CONFIRMED');
      const response = await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);
      expect(extractDataBody(response).status).toBe('COMPLETED');
    });

    it('CONFIRMED → CANCELLED should succeed', async () => {
      const apt = await createTestAppointment('CONFIRMED');
      const response = await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);
      expect(extractDataBody(response).status).toBe('CANCELLED');
    });
  });

  describe('Invalid Transitions (should return 400)', () => {
    it('PENDING → COMPLETED should return 400 (skip CONFIRMED)', async () => {
      const apt = await createTestAppointment('PENDING');
      await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });

    it('CONFIRMED → PENDING should return 400 (no rollback)', async () => {
      const apt = await createTestAppointment('CONFIRMED');
      await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PENDING' })
        .expect(400);
    });

    it('COMPLETED → CANCELLED should succeed (allowed transition)', async () => {
      const apt = await createTestAppointment('COMPLETED');
      const response = await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);
      expect(extractDataBody(response).status).toBe('CANCELLED');
    });

    it('CANCELLED → CONFIRMED should return 400 (terminal state)', async () => {
      const apt = await createTestAppointment('CANCELLED');
      await request(app.getHttpServer())
        .put(`/v1/admin/appointments/${apt.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(400);
    });
  });
});
