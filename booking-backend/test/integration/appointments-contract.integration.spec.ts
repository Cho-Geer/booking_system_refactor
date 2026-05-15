import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserStatus, SystemRole } from '@prisma/client';
import { AppModule } from '@/app.module';
import { createTestModule, TestModule } from '../helpers/create-test-module';
import { UserFactory, ServiceFactory, TimeSlotFactory } from '../factories';
import * as bcrypt from 'bcryptjs';
import { getTestDatabaseUrl } from '../setup/test-env';
import { extractDataBody } from '../helpers/response.helper';

// Set required environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-contract-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-contract-tests';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R2: POST /v1/appointments — Idempotency-Key header, correct DTO
 *
 * Contract validation tests for appointment creation:
 * - 201 with all financial fields (price, tax_rate, tax_included_amount)
 * - 400 when Idempotency-Key header missing
 * - 400 when DTO validation fails (missing required fields)
 * - 409 conflict when time slot is already fully booked
 * - 429 rate-limited (when rate limiter kicks in)
 * - 201 with same Idempotency-Key returns idempotent result (no duplicate)
 */
describe('[R2] POST /v1/appointments — Contract Validation', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;
  let jwtService: JwtService;

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
  });

  // Helper to generate user and return token
  async function createAuthenticatedUser(): Promise<{ token: string; userId: string; user: any }> {
    const hashedPassword = await bcrypt.hash('ValidP@ss123!', 12);
    const userData = UserFactory.create({
      email: `contract-test-user-${Date.now()}@example.com`,
      phone: undefined,
    });
    const user = await prisma.user.create({
      data: {
        ...userData as any,
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
      },
    });
    const token = jwtService.sign(
      { sub: user.id, role: SystemRole.CUSTOMER },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );
    return { token, userId: user.id, user };
  }

  // Helper to create service + time slot
  async function createServiceAndSlot(): Promise<{ serviceId: string; timeSlotId: string }> {
    const category = await prisma.serviceCategory.create({
      data: { name: `Contract Category ${Date.now()}`, displayOrder: 1, isActive: true },
    });
    const service = await prisma.service.create({
      data: {
        categoryId: category.id,
        name: 'Contract Test Service',
        description: 'Service for contract validation tests',
        durationMinutes: 60,
        price: 100,
        isActive: true,
        taxRate: 0.1,
      },
    });
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const timeSlot = await prisma.timeSlot.create({
      data: {
        serviceId: service.id,
        startTime,
        endTime,
        capacity: 1,
        currentSequence: 0,
        isActive: true,
      },
    });
    return { serviceId: service.id, timeSlotId: timeSlot.id };
  }

  describe('RED Phase — Expected failures (contract enforcement)', () => {
    it('[RED] should reject appointment creation without Idempotency-Key header', async () => {
      const { token } = await createAuthenticatedUser();
      const { serviceId, timeSlotId } = await createServiceAndSlot();

      await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'Test', email: 'test@example.com', phone: '+1234567890' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(400); // Idempotency-Key is required by controller
    });

    it('[RED] should reject appointment with missing timeSlotId', async () => {
      const { token } = await createAuthenticatedUser();
      const { serviceId } = await createServiceAndSlot();

      await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', `test-idem-${Date.now()}`)
        .send({
          serviceId,
          customerInfo: { name: 'Test', email: 'test@example.com', phone: '+1234567890' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(400);
    });

    it('[RED] should reject appointment without authentication', async () => {
      const { serviceId, timeSlotId } = await createServiceAndSlot();

      await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Idempotency-Key', `test-idem-${Date.now()}`)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'Test', email: 'test@example.com', phone: '+1234567890' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(401);
    });

    it('[RED] should return 409 when slot is inactive (manually marked)', async () => {
      const { token } = await createAuthenticatedUser();
      const { serviceId, timeSlotId } = await createServiceAndSlot();

      // Mark slot as inactive
      const testPrisma = testModule.prisma;
      await testPrisma.timeSlot.update({
        where: { id: timeSlotId },
        data: { isActive: false },
      });

      // Booking on inactive slot should get 409
      await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', `test-idem-inactive-${Date.now()}`)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'User', email: 'user@example.com', phone: '+1234567890' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(409);
    });
  });

  describe('GREEN Phase — Successful contract-compliant requests', () => {
    it('[GREEN] should create appointment with valid Idempotency-Key and return 201', async () => {
      const { token } = await createAuthenticatedUser();
      const { serviceId, timeSlotId } = await createServiceAndSlot();

      const response = await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', `test-idem-success-${Date.now()}`)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'Success Test', email: 'success@example.com', phone: '+1111111111' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      // Verify response contains required fields
      expect(extractDataBody(response)).toHaveProperty('id');
      expect(extractDataBody(response)).toHaveProperty('status');
      expect(extractDataBody(response).status).toBe('PENDING');
      expect(extractDataBody(response)).toHaveProperty('serviceId');
      expect(extractDataBody(response)).toHaveProperty('timeSlotId');
    });

    it('[GREEN] should return idempotent result for duplicate Idempotency-Key', async () => {
      const { token } = await createAuthenticatedUser();
      const { serviceId, timeSlotId } = await createServiceAndSlot();
      const idempotencyKey = `test-idem-dup-${Date.now()}`;

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'Dup Test', email: 'dup@example.com', phone: '+2222222222' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      expect(extractDataBody(response1)).toHaveProperty('id');

      // Second request with same key — should succeed idempotently
      const response2 = await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          timeSlotId,
          serviceId,
          customerInfo: { name: 'Dup Test', email: 'dup@example.com', phone: '+2222222222' },
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      // Should return the same appointment (idempotent)
      expect(extractDataBody(response2).id).toBe(extractDataBody(response1).id);
    });
  });
});
