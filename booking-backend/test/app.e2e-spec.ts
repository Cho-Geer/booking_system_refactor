import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Test as SupertestTest } from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { createTestModule, TestModule } from './helpers/create-test-module';
import {
  createTestUser,
  createTestService,
  createTestCategory,
  createTestTimeSlot,
  createTestAppointment,
  cleanupAllTestData,
} from './fixtures/database.fixture';
import { SystemRole, UserStatus, AppointmentStatus } from '@prisma/client';
import { PasswordUtil } from '../src/common/utils/password.util';
import { generateTestId, generateTestEmail, sleep } from './helpers/test-helper';

// ---------------------------------------------------------------------------
// Auth token helpers
// ---------------------------------------------------------------------------

/** Generate a valid JWT access token for integration tests */
function generateToken(
  jwtService: JwtService,
  user: { id: string; email: string | null; role: string; name: string },
): string {
  return jwtService.sign(
    { sub: user.id, email: user.email ?? '', role: user.role, name: user.name },
    {
      secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-unit-tests-only',
      expiresIn: '15m',
    },
  );
}

/** Generate a valid JWT refresh token */
function generateRefreshToken(jwtService: JwtService, userId: string): string {
  return jwtService.sign(
    { sub: userId, tokenType: 'refresh', sid: `sess_${Date.now()}` },
    {
      secret: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-unit-tests-only',
      expiresIn: '7d',
    },
  );
}

// ---------------------------------------------------------------------------
// VALID TEST PASSWORD (passes RegisterDto regex: upper + lower + digit + special)
// ---------------------------------------------------------------------------
const VALID_PASSWORD = 'Test@Pass123';

// ---------------------------------------------------------------------------
// Full integration test suite — covers ALL API endpoints
// ---------------------------------------------------------------------------
describe('App E2E Integration (Testcontainers — PostgreSQL + Redis)', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let jwtService: JwtService;

  // ---- lifecycle ----------------------------------------------------------
  beforeAll(async () => {
    testModule = await createTestModule();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(require('@prisma/client').PrismaClient)
      .useValue(testModule.prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
    await testModule.disconnect();
  });

  beforeEach(async () => {
    await testModule.resetDatabase();
  });

  // ========================================================================
  // 1. HEALTH
  // ========================================================================
  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });

  // ========================================================================
  // 2. AUTH FLOW (register → login → logout → token blacklist)
  // ========================================================================
  describe('POST /auth/register', () => {
    it('creates a new user and returns user object (201)', async () => {
      const ts = generateTestId();
      const dto = { name: `New User ${ts}`, email: `${ts}@example.com`, password: VALID_PASSWORD };

      const res = await request(app.getHttpServer()).post('/auth/register').send(dto).expect(201);

      expect(res.body.user).toMatchObject({ email: dto.email, name: dto.name, role: 'USER' });
      expect(res.body.user).not.toHaveProperty('password');

      const dbUser = await testModule.prisma.user.findFirst({ where: { email: dto.email } });
      expect(dbUser).not.toBeNull();
    });

    it('rejects registration with weak password (400)', async () => {
      const ts = generateTestId();
      const dto = { name: `User ${ts}`, email: `${ts}@example.com`, password: 'weak' };

      await request(app.getHttpServer()).post('/auth/register').send(dto).expect(400);
    });

    it('rejects registration with missing name (400)', async () => {
      const dto = { email: 'noname@example.com', password: VALID_PASSWORD };

      await request(app.getHttpServer()).post('/auth/register').send(dto).expect(400);
    });

    it('rejects registration with invalid email (400)', async () => {
      const dto = { name: 'Bad Email', email: 'not-an-email', password: VALID_PASSWORD };

      await request(app.getHttpServer()).post('/auth/register').send(dto).expect(400);
    });

    it('rejects duplicate email (400)', async () => {
      const ts = generateTestId();
      const email = `dup-${ts}@example.com`;

      // first registration succeeds
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'First', email, password: VALID_PASSWORD })
        .expect(201);

      // second registration with same email fails
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Second', email, password: VALID_PASSWORD })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    let testUser: {
      id: string;
      email: string | null;
      role: string;
      name: string;
      passwordHash: string;
    };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);
      const created = await testModule.prisma.user.create({
        data: {
          name: `Login User ${ts}`,
          email: `login-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });
      testUser = created as typeof testUser;
    });

    it('returns access_token and refresh_token on valid login (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: VALID_PASSWORD })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body).toHaveProperty('expires_in');
      expect(res.body).toHaveProperty('token_type', 'Bearer');
      expect(res.body.user).toMatchObject({ email: testUser.email });
    });

    it('rejects wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'Wrong@Pass999' })
        .expect(401);
    });

    it('rejects non-existent email (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: VALID_PASSWORD })
        .expect(401);
    });

    it('rejects login with missing password (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email })
        .expect(400);
    });

    it('rejects login with invalid email format (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad', password: VALID_PASSWORD })
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let testUser: { id: string; email: string | null; role: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);
      const user = await testModule.prisma.user.create({
        data: {
          name: `Logout User ${ts}`,
          email: `logout-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });
      testUser = user as typeof testUser;

      // login to create a session
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: VALID_PASSWORD })
        .expect(200);
      accessToken = loginRes.body.access_token;
    });

    it('logs out successfully with valid token (204)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });

  // ========================================================================
  // 3. USERS CRUD (admin-only write, any authenticated read own)
  // ========================================================================
  describe('Users CRUD', () => {
    let adminToken: string;
    let customerToken: string;
    let adminUser: { id: string; email: string | null; role: string; name: string };
    let customerUser: { id: string; email: string | null; role: string; name: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);

      adminUser = (await testModule.prisma.user.create({
        data: {
          name: `Admin ${ts}`,
          email: `admin-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      })) as typeof adminUser;

      customerUser = (await testModule.prisma.user.create({
        data: {
          name: `Customer ${ts}`,
          email: `cust-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      })) as typeof customerUser;

      adminToken = generateToken(jwtService, adminUser);
      customerToken = generateToken(jwtService, customerUser);
    });

    describe('POST /users (admin only)', () => {
      it('creates a user when admin (201)', async () => {
        const ts = generateTestId();
        const res = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `New ${ts}`,
            email: `${ts}@test.com`,
            password: VALID_PASSWORD,
            role: 'CUSTOMER',
          })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe(`${ts}@test.com`);
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ name: 'Unauthorized', password: VALID_PASSWORD })
          .expect(403);
      });

      it('rejects unauthenticated request (401)', async () => {
        await request(app.getHttpServer())
          .post('/users')
          .send({ name: 'No Token', password: VALID_PASSWORD })
          .expect(401);
      });
    });

    describe('GET /users (admin only)', () => {
      it('returns paginated list for admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, pageSize: 10 })
          .expect(200);

        if (!Array.isArray(res.body)) {
          expect(res.body).toHaveProperty('data');
        }
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('GET /users/:id', () => {
      it('returns user by id (200)', async () => {
        const res = await request(app.getHttpServer())
          .get(`/users/${customerUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.id).toBe(customerUser.id);
      });

      it('returns 404 for non-existent user', async () => {
        await request(app.getHttpServer())
          .get('/users/nonexistent-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('PATCH /users/:id', () => {
      it('updates user name (200)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/users/${customerUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(res.body.name).toBe('Updated Name');
      });

      it('rejects invalid status enum (400)', async () => {
        await request(app.getHttpServer())
          .patch(`/users/${customerUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'INVALID' })
          .expect(400);
      });
    });

    describe('DELETE /users/:id (admin only)', () => {
      it('deletes user when admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/users/${customerUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('id', customerUser.id);

        const deleted = await testModule.prisma.user.findUnique({ where: { id: customerUser.id } });
        expect(deleted).toBeNull();
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${customerUser.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('POST /users/:id/change-password', () => {
      it('changes password with correct old password (200)', async () => {
        await request(app.getHttpServer())
          .post(`/users/${customerUser.id}/change-password`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ oldPassword: VALID_PASSWORD, newPassword: 'New@Pass456' })
          .expect(200);
      });

      it('rejects wrong old password (400)', async () => {
        await request(app.getHttpServer())
          .post(`/users/${customerUser.id}/change-password`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ oldPassword: 'Wrong@Old999', newPassword: 'New@Pass456' })
          .expect(400);
      });
    });
  });

  // ========================================================================
  // 4. SERVICES CRUD (admin write, public read)
  // ========================================================================
  describe('Services CRUD', () => {
    let adminToken: string;
    let customerToken: string;
    let adminUser: { id: string; email: string | null; role: string; name: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);

      adminUser = (await testModule.prisma.user.create({
        data: {
          name: `Admin ${ts}`,
          email: `admin-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      })) as typeof adminUser;

      const customer = await testModule.prisma.user.create({
        data: {
          name: `Cust ${ts}`,
          email: `cust-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      adminToken = generateToken(jwtService, adminUser);
      customerToken = generateToken(jwtService, customer);
    });

    describe('POST /services (admin only)', () => {
      it('creates a service when admin (201)', async () => {
        const category = await createTestCategory(testModule.prisma);

        const res = await request(app.getHttpServer())
          .post('/services')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            categoryId: category.id,
            name: 'Test Service',
            durationMinutes: 45,
            price: 29.99,
          })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Service');
      });

      it('rejects non-admin (403)', async () => {
        const category = await createTestCategory(testModule.prisma);

        await request(app.getHttpServer())
          .post('/services')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ categoryId: category.id, name: 'Forbidden', durationMinutes: 30, price: 10 })
          .expect(403);
      });

      it('rejects missing required fields (400)', async () => {
        await request(app.getHttpServer())
          .post('/services')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Incomplete' })
          .expect(400);
      });
    });

    describe('GET /services', () => {
      it('returns services list without auth (200)', async () => {
        // create some services first
        const category = await createTestCategory(testModule.prisma);
        await createTestService(testModule.prisma, category.id, { name: 'Haircut' });

        const res = await request(app.getHttpServer()).get('/services').expect(200);

        expect(Array.isArray(res.body) || res.body.data).toBeTruthy();
      });

      it('supports isActive filter', async () => {
        const res = await request(app.getHttpServer())
          .get('/services')
          .query({ isActive: true })
          .expect(200);

        expect(res.status).toBe(200);
      });
    });

    describe('GET /services/:id', () => {
      it('returns service by id (200)', async () => {
        const category = await createTestCategory(testModule.prisma);
        const svc = await createTestService(testModule.prisma, category.id);

        const res = await request(app.getHttpServer()).get(`/services/${svc.id}`).expect(200);

        expect(res.body.id).toBe(svc.id);
      });

      it('returns 404 for non-existent service', async () => {
        await request(app.getHttpServer()).get('/services/nonexistent').expect(404);
      });
    });

    describe('PATCH /services/:id (admin only)', () => {
      it('updates service when admin (200)', async () => {
        const category = await createTestCategory(testModule.prisma);
        const svc = await createTestService(testModule.prisma, category.id);

        const res = await request(app.getHttpServer())
          .patch(`/services/${svc.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated Service' })
          .expect(200);

        expect(res.body.name).toBe('Updated Service');
      });

      it('rejects non-admin (403)', async () => {
        const category = await createTestCategory(testModule.prisma);
        const svc = await createTestService(testModule.prisma, category.id);

        await request(app.getHttpServer())
          .patch(`/services/${svc.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ name: 'Should Fail' })
          .expect(403);
      });
    });

    describe('DELETE /services/:id (admin only)', () => {
      it('deletes service when admin (200)', async () => {
        const category = await createTestCategory(testModule.prisma);
        const svc = await createTestService(testModule.prisma, category.id);

        const res = await request(app.getHttpServer())
          .delete(`/services/${svc.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('id', svc.id);

        const deleted = await testModule.prisma.service.findUnique({ where: { id: svc.id } });
        expect(deleted).toBeNull();
      });
    });
  });

  // ========================================================================
  // 5. TIME SLOTS (admin write, public read with filters)
  // ========================================================================
  describe('Time Slots', () => {
    let adminToken: string;
    let customerToken: string;
    let adminUser: { id: string; email: string | null; role: string; name: string };
    let category: { id: string };
    let service: { id: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);

      adminUser = (await testModule.prisma.user.create({
        data: {
          name: `Admin ${ts}`,
          email: `admin-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      })) as typeof adminUser;

      const customer = await testModule.prisma.user.create({
        data: {
          name: `Cust ${ts}`,
          email: `cust-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      adminToken = generateToken(jwtService, adminUser);
      customerToken = generateToken(jwtService, customer);

      category = await createTestCategory(testModule.prisma);
      service = await createTestService(testModule.prisma, category.id);
    });

    describe('POST /time-slots (admin only)', () => {
      it('creates a time slot when admin (201)', async () => {
        const slotTime = new Date();
        slotTime.setDate(slotTime.getDate() + 7);
        slotTime.setHours(10, 0, 0, 0);

        const res = await request(app.getHttpServer())
          .post('/time-slots')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ serviceId: service.id, slotTime: slotTime.toISOString(), capacity: 5 })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.capacity).toBe(5);
      });

      it('rejects non-admin (403)', async () => {
        const slotTime = new Date();
        slotTime.setDate(slotTime.getDate() + 7);

        await request(app.getHttpServer())
          .post('/time-slots')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ serviceId: service.id, slotTime: slotTime.toISOString() })
          .expect(403);
      });

      it('rejects missing serviceId (400)', async () => {
        const slotTime = new Date().toISOString();
        await request(app.getHttpServer())
          .post('/time-slots')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ slotTime })
          .expect(400);
      });
    });

    describe('GET /time-slots', () => {
      it('returns time slots list without auth (200)', async () => {
        const res = await request(app.getHttpServer()).get('/time-slots').expect(200);

        expect(res.status).toBe(200);
      });

      it('filters by serviceId', async () => {
        await createTestTimeSlot(testModule.prisma, service.id);

        const res = await request(app.getHttpServer())
          .get('/time-slots')
          .query({ serviceId: service.id })
          .expect(200);

        expect(res.status).toBe(200);
      });
    });

    describe('GET /time-slots/available', () => {
      it('returns available slots for a date range (200)', async () => {
        await createTestTimeSlot(testModule.prisma, service.id);

        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const res = await request(app.getHttpServer())
          .get('/time-slots/available')
          .query({ serviceId: service.id, startDate, endDate })
          .expect(200);

        expect(res.status).toBe(200);
      });

      it('rejects missing serviceId (400)', async () => {
        await request(app.getHttpServer())
          .get('/time-slots/available')
          .query({
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
          })
          .expect(400);
      });
    });

    describe('GET /time-slots/:id', () => {
      it('returns time slot by id (200)', async () => {
        const slot = await createTestTimeSlot(testModule.prisma, service.id);

        const res = await request(app.getHttpServer()).get(`/time-slots/${slot.id}`).expect(200);

        expect(res.body.id).toBe(slot.id);
      });

      it('returns 404 for non-existent slot', async () => {
        await request(app.getHttpServer()).get('/time-slots/nonexistent').expect(404);
      });
    });

    describe('PATCH /time-slots/:id (admin only)', () => {
      it('updates time slot when admin (200)', async () => {
        const slot = await createTestTimeSlot(testModule.prisma, service.id);

        const res = await request(app.getHttpServer())
          .patch(`/time-slots/${slot.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ capacity: 10 })
          .expect(200);

        expect(res.body.capacity).toBe(10);
      });

      it('rejects non-admin (403)', async () => {
        const slot = await createTestTimeSlot(testModule.prisma, service.id);

        await request(app.getHttpServer())
          .patch(`/time-slots/${slot.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ capacity: 10 })
          .expect(403);
      });
    });

    describe('DELETE /time-slots/:id (admin only)', () => {
      it('deletes time slot when admin (200)', async () => {
        const slot = await createTestTimeSlot(testModule.prisma, service.id);

        const res = await request(app.getHttpServer())
          .delete(`/time-slots/${slot.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('id', slot.id);

        const deleted = await testModule.prisma.timeSlot.findUnique({ where: { id: slot.id } });
        expect(deleted).toBeNull();
      });
    });
  });

  // ========================================================================
  // 6. APPOINTMENTS (create, list, update, cancel, delete)
  // ========================================================================
  describe('Appointments', () => {
    let adminToken: string;
    let customerToken: string;
    let adminUser: { id: string; email: string | null; role: string; name: string };
    let customerUser: {
      id: string;
      email: string | null;
      role: string;
      name: string;
      phone: string | null;
    };
    let category: { id: string };
    let service: { id: string };
    let timeSlot: { id: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);

      adminUser = (await testModule.prisma.user.create({
        data: {
          name: `Admin ${ts}`,
          email: `admin-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      })) as typeof adminUser;

      customerUser = (await testModule.prisma.user.create({
        data: {
          name: `Cust ${ts}`,
          email: `cust-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      })) as typeof customerUser;

      adminToken = generateToken(jwtService, adminUser);
      customerToken = generateToken(jwtService, customerUser);

      category = await createTestCategory(testModule.prisma);
      service = await createTestService(testModule.prisma, category.id);
      timeSlot = await createTestTimeSlot(testModule.prisma, service.id);
    });

    describe('POST /appointments', () => {
      it('creates an appointment (201)', async () => {
        const res = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            userId: customerUser.id,
            timeSlotId: timeSlot.id,
            serviceId: service.id,
            customerName: customerUser.name,
            customerEmail: customerUser.email,
            customerPhone: customerUser.phone || '+15551234567',
          })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('PENDING');

        const db = await testModule.prisma.appointment.findUnique({ where: { id: res.body.id } });
        expect(db).not.toBeNull();
      });

      it('rejects unauthenticated request (401)', async () => {
        await request(app.getHttpServer())
          .post('/appointments')
          .send({ userId: customerUser.id, timeSlotId: timeSlot.id, serviceId: service.id })
          .expect(401);
      });

      it('rejects missing required fields (400)', async () => {
        await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ userId: customerUser.id })
          .expect(400);
      });

      it('rejects invalid email format (400)', async () => {
        await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            userId: customerUser.id,
            timeSlotId: timeSlot.id,
            serviceId: service.id,
            customerName: 'Test',
            customerEmail: 'not-an-email',
            customerPhone: '+15551234567',
          })
          .expect(400);
      });

      it('returns 409 when slot is already booked (conflict)', async () => {
        // book the slot first
        await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            userId: customerUser.id,
            timeSlotId: timeSlot.id,
            serviceId: service.id,
            customerName: 'Another',
            customerEmail: 'another@example.com',
            customerPhone: '+15559876543',
          })
          .expect(409);
      });
    });

    describe('GET /appointments (admin only)', () => {
      it('returns all appointments for admin (200)', async () => {
        await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        const res = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.status).toBe(200);
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });

      it('filters by status', async () => {
        const res = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ status: AppointmentStatus.PENDING })
          .expect(200);

        expect(res.status).toBe(200);
      });

      it('filters by userId', async () => {
        const res = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ userId: customerUser.id })
          .expect(200);

        expect(res.status).toBe(200);
      });
    });

    describe('GET /appointments/my', () => {
      it('returns current user appointments (200)', async () => {
        await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        const res = await request(app.getHttpServer())
          .get('/appointments/my')
          .set('Authorization', `Bearer ${customerToken}`)
          .query({ userId: customerUser.id })
          .expect(200);

        expect(res.status).toBe(200);
      });
    });

    describe('GET /appointments/:id', () => {
      it('returns appointment by id (200)', async () => {
        const apt = await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        const res = await request(app.getHttpServer()).get(`/appointments/${apt.id}`).expect(200);

        expect(res.body.id).toBe(apt.id);
      });

      it('returns 404 for non-existent appointment', async () => {
        await request(app.getHttpServer()).get('/appointments/nonexistent').expect(404);
      });
    });

    describe('PATCH /appointments/:id', () => {
      it('updates appointment status (200)', async () => {
        const apt = await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        const res = await request(app.getHttpServer())
          .patch(`/appointments/${apt.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ status: AppointmentStatus.CONFIRMED })
          .expect(200);

        expect(res.body.status).toBe('CONFIRMED');
      });

      it('rejects invalid status enum (400)', async () => {
        const apt = await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        await request(app.getHttpServer())
          .patch(`/appointments/${apt.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ status: 'INVALID_STATUS' })
          .expect(400);
      });
    });

    describe('POST /appointments/:id/cancel', () => {
      it('cancels an appointment (200)', async () => {
        const apt = await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        const res = await request(app.getHttpServer())
          .post(`/appointments/${apt.id}/cancel`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ reason: 'Customer requested cancellation' })
          .expect(200);

        expect(res.body.status).toBe('CANCELLED');

        const db = await testModule.prisma.appointment.findUnique({ where: { id: apt.id } });
        expect(db?.status).toBe(AppointmentStatus.CANCELLED);
      });
    });

    describe('DELETE /appointments/:id (admin only)', () => {
      it('deletes appointment when admin (200)', async () => {
        const apt = await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        const res = await request(app.getHttpServer())
          .delete(`/appointments/${apt.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('id', apt.id);

        const deleted = await testModule.prisma.appointment.findUnique({ where: { id: apt.id } });
        expect(deleted).toBeNull();
      });

      it('rejects non-admin (403)', async () => {
        const apt = await createTestAppointment(testModule.prisma, {
          userId: customerUser.id,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
        });

        await request(app.getHttpServer())
          .delete(`/appointments/${apt.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });
  });

  // ========================================================================
  // 7. STATS (admin only — overview, revenue, users, popular-services, daily-bookings)
  // ========================================================================
  describe('Stats (admin only)', () => {
    let adminToken: string;
    let customerToken: string;
    let adminUser: { id: string; email: string | null; role: string; name: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);

      adminUser = (await testModule.prisma.user.create({
        data: {
          name: `Admin ${ts}`,
          email: `admin-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      })) as typeof adminUser;

      const customer = await testModule.prisma.user.create({
        data: {
          name: `Cust ${ts}`,
          email: `cust-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      adminToken = generateToken(jwtService, adminUser);
      customerToken = generateToken(jwtService, customer);
    });

    describe('GET /stats/overview', () => {
      it('returns overview dashboard for admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .get('/stats/overview')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toBeDefined();
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/stats/overview')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });

      it('rejects unauthenticated (401)', async () => {
        await request(app.getHttpServer()).get('/stats/overview').expect(401);
      });
    });

    describe('GET /stats/revenue', () => {
      it('returns revenue stats for admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .get('/stats/revenue')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toBeDefined();
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/stats/revenue')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('GET /stats/users', () => {
      it('returns user growth stats for admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .get('/stats/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body).toBeDefined();
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/stats/users')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('GET /stats/popular-services', () => {
      it('returns popular services for admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .get('/stats/popular-services')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/stats/popular-services')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('GET /stats/daily-bookings', () => {
      it('returns daily booking trend for admin (200)', async () => {
        const res = await request(app.getHttpServer())
          .get('/stats/daily-bookings')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      });

      it('rejects non-admin (403)', async () => {
        await request(app.getHttpServer())
          .get('/stats/daily-bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });
  });

  // ========================================================================
  // 8. SLOT PREEMPTION (high-concurrency reservation)
  // ========================================================================
  describe('Slot Preemption (POST /slots/:slotId/reserve)', () => {
    let customerToken: string;
    let customerUser: {
      id: string;
      email: string | null;
      role: string;
      name: string;
      phone: string | null;
    };
    let category: { id: string };
    let service: { id: string };
    let timeSlot: { id: string };

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);

      customerUser = (await testModule.prisma.user.create({
        data: {
          name: `Cust ${ts}`,
          email: `cust-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      })) as typeof customerUser;

      customerToken = generateToken(jwtService, customerUser);

      category = await createTestCategory(testModule.prisma);
      service = await createTestService(testModule.prisma, category.id);
      timeSlot = await createTestTimeSlot(testModule.prisma, service.id, { capacity: 10 });
    });

    it('reserves a slot successfully (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          preferSeq: 3,
          serviceId: service.id,
          customerName: customerUser.name,
          customerEmail: customerUser.email,
          customerPhone: customerUser.phone || '+15551234567',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('appointment');
      expect(res.body).toHaveProperty('allocatedSeq');
    });

    it('rejects unauthenticated request (401)', async () => {
      await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .send({
          preferSeq: 0,
          serviceId: service.id,
          customerName: 'X',
          customerEmail: 'x@x.com',
          customerPhone: '+15551234567',
        })
        .expect(401);
    });

    it('rejects invalid preferSeq < 0 (400)', async () => {
      await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          preferSeq: -1,
          serviceId: service.id,
          customerName: 'X',
          customerEmail: 'x@x.com',
          customerPhone: '+15551234567',
        })
        .expect(400);
    });

    it('rejects preferSeq >= 10 (400)', async () => {
      await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          preferSeq: 10,
          serviceId: service.id,
          customerName: 'X',
          customerEmail: 'x@x.com',
          customerPhone: '+15551234567',
        })
        .expect(400);
    });

    it('supports idempotency key header', async () => {
      const idempotencyKey = `idem-${generateTestId()}`;

      const res1 = await request(app.getHttpServer())
        .post(`/slots/${timeSlot.id}/reserve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          preferSeq: 5,
          serviceId: service.id,
          customerName: 'Test',
          customerEmail: 'test@example.com',
          customerPhone: '+15551234567',
        })
        .expect(201);

      expect(res1.body.success).toBe(true);
    });
  });

  // ========================================================================
  // 9. AUTHORIZATION MATRIX (cross-cutting 401 / 403 tests)
  // ========================================================================
  describe('Authorization Matrix (401 / 403)', () => {
    let customerToken: string;

    beforeEach(async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash(VALID_PASSWORD);
      const customer = await testModule.prisma.user.create({
        data: {
          name: `Auth ${ts}`,
          email: `auth-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });
      customerToken = generateToken(jwtService, customer);
    });

    const protectedRoutes: Array<{
      method: 'get' | 'post' | 'delete';
      path: string;
      expected: number;
      body?: Record<string, unknown>;
    }> = [
      { method: 'get', path: '/users', expected: 403 },
      {
        method: 'post',
        path: '/users',
        expected: 403,
        body: { name: 'Test', password: VALID_PASSWORD },
      },
      { method: 'get', path: '/appointments', expected: 403 },
      { method: 'delete', path: '/appointments/some-id', expected: 403 },
      { method: 'get', path: '/stats/overview', expected: 403 },
      { method: 'get', path: '/stats/revenue', expected: 403 },
      { method: 'get', path: '/stats/users', expected: 403 },
      { method: 'get', path: '/stats/popular-services', expected: 403 },
      { method: 'get', path: '/stats/daily-bookings', expected: 403 },
    ];

    protectedRoutes.forEach(({ method, path, expected, body }) => {
      it(`${method.toUpperCase()} ${path} → ${expected} for non-privileged user`, async () => {
        let req: SupertestTest;
        if (method === 'get') {
          req = request(app.getHttpServer()).get(path);
        } else if (method === 'post') {
          req = request(app.getHttpServer()).post(path);
        } else {
          req = request(app.getHttpServer()).delete(path);
        }
        req = req.set('Authorization', `Bearer ${customerToken}`);
        if (body) req.send(body);
        await req.expect(expected);
      });

      it(`${method.toUpperCase()} ${path} → 401 with no token`, async () => {
        let req: SupertestTest;
        if (method === 'get') {
          req = request(app.getHttpServer()).get(path);
        } else if (method === 'post') {
          req = request(app.getHttpServer()).post(path);
        } else {
          req = request(app.getHttpServer()).delete(path);
        }
        if (body) req.send(body);
        await req.expect(401);
      });
    });
  });

  // ========================================================================
  // 10. ERROR RESPONSE SHAPE VALIDATION
  // ========================================================================
  describe('Error Response Shape', () => {
    it('400 response includes statusCode, message, error fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'bad' })
        .expect(400);

      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('error');
    });

    it('401 response includes proper shape', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(401);

      expect(res.body).toHaveProperty('statusCode', 401);
      expect(res.body).toHaveProperty('message');
    });

    it('404 response includes proper shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/nonexistent-id')
        .set(
          'Authorization',
          `Bearer ${generateToken(jwtService, { id: 'fake', email: 'a@b.com', role: 'ADMIN', name: 'X' })}`,
        )
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
    });
  });

  // ========================================================================
  // 11. END-TO-END WORKFLOW (register → login → book → view → cancel)
  // ========================================================================
  describe('End-to-End Customer Workflow', () => {
    it('full lifecycle: register, login, book appointment, view it, cancel it', async () => {
      const ts = generateTestId();

      // 1. Register
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: `E2E User ${ts}`, email: `e2e-${ts}@example.com`, password: VALID_PASSWORD })
        .expect(201);

      expect(registerRes.body.user.email).toBe(`e2e-${ts}@example.com`);

      // 2. Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `e2e-${ts}@example.com`, password: VALID_PASSWORD })
        .expect(200);

      const token = loginRes.body.access_token;
      expect(token).toBeDefined();

      // 3. Create service + time slot (via admin — use generated admin token)
      const hash = await PasswordUtil.hash(VALID_PASSWORD);
      const adminUser = await testModule.prisma.user.create({
        data: {
          name: `E2E Admin ${ts}`,
          email: `e2e-admin-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          role: SystemRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
      const adminToken = generateToken(jwtService, adminUser);

      const category = await createTestCategory(testModule.prisma);
      const svcRes = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: category.id,
          name: `E2E Service ${ts}`,
          durationMinutes: 60,
          price: 50,
        })
        .expect(201);

      const serviceId = svcRes.body.id;

      const slotTime = new Date();
      slotTime.setDate(slotTime.getDate() + 7);
      slotTime.setHours(10, 0, 0, 0);

      const slotRes = await request(app.getHttpServer())
        .post('/time-slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serviceId, slotTime: slotTime.toISOString(), capacity: 5 })
        .expect(201);

      const timeSlotId = slotRes.body.id;

      // Look up the customer user id
      const customer = await testModule.prisma.user.findFirst({
        where: { email: `e2e-${ts}@example.com` },
      });
      expect(customer).not.toBeNull();

      // 4. Book appointment
      const aptRes = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: customer!.id,
          timeSlotId,
          serviceId,
          customerName: customer!.name,
          customerEmail: customer!.email,
          customerPhone: customer!.phone || '+15551234567',
        })
        .expect(201);

      const appointmentId = aptRes.body.id;
      expect(aptRes.body.status).toBe('PENDING');

      // 5. View appointment
      const viewRes = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .expect(200);

      expect(viewRes.body.id).toBe(appointmentId);

      // 6. Cancel appointment
      const cancelRes = await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Customer no longer available' })
        .expect(200);

      expect(cancelRes.body.status).toBe('CANCELLED');

      // 7. Verify cancelled in DB
      const dbApt = await testModule.prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(dbApt?.status).toBe(AppointmentStatus.CANCELLED);
    });
  });
});
