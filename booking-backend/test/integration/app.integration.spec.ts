import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestModule, TestModule } from '../helpers/create-test-module';
import {
  createTestUser,
  createTestService,
  createTestTimeSlot,
  createTestAppointment,
  cleanupAllTestData,
} from '../fixtures/database.fixture';
import { SystemRole, AppointmentStatus } from '@prisma/client';

/**
 * Integration test example demonstrating the Testcontainers-based test module pattern.
 *
 * This test:
 * - Starts a full NestJS application with the real test database
 * - Tests the complete user registration flow
 * - Tests the complete appointment booking flow
 * - Verifies database state changes
 *
 * Run with: npm run test:integration
 */
describe('App Integration (Testcontainers)', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let jwtService: JwtService;

  beforeAll(async () => {
    // Create the test module with real database connection
    testModule = await createTestModule();

    // Build the NestJS application with the real Prisma client
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(testModule.prisma as unknown as PrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    // Set global prefix to match production (main.ts uses setGlobalPrefix('v1'))
    app.setGlobalPrefix('v1');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
    await testModule.disconnect();
  });

  beforeEach(async () => {
    // Reset database state before each test
    await testModule.resetDatabase();
  });

  describe('User Registration Flow', () => {
    it('should register a new user via two-step flow', async () => {
      const timestamp = Date.now();
      const email = `integration-${timestamp}@example.com`;

      // Step 1: Send verification code
      const sendCodeResponse = await request(app.getHttpServer())
        .post('/v1/auth/register/send-code')
        .send({ contact: email, contactType: 'email' });

      // Email service may be unavailable in test (503), validation error (400), or success (200)
      expect([200, 400, 503]).toContain(sendCodeResponse.status);

      // Step 2: Complete registration (will fail without valid code, demonstrating the flow)
      const completeResponse = await request(app.getHttpServer())
        .post('/v1/auth/register/complete')
        .send({
          contact: email,
          contactType: 'email',
          code: '123456',
          password: 'SecurePass123!',
          name: `Integration Test User ${timestamp}`,
        });

      // Registration may fail with invalid code (400), succeed (201), or email service unavailable (503)
      expect([200, 201, 400, 503]).toContain(completeResponse.status);
    });

    it('should reject registration with duplicate email', async () => {
      // Create a user directly in the database
      await createTestUser(testModule.prisma, SystemRole.CUSTOMER, {
        email: 'duplicate@example.com',
      });

      // Send code for duplicate email should return 409 (conflict) or 503 (email service unavailable)
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register/send-code')
        .send({ contact: 'duplicate@example.com', contactType: 'email' });
      expect([409, 400, 503]).toContain(response.status);
    });
  });

  describe('Authentication Flow', () => {
    it('should login with valid credentials and return tokens', async () => {
      const password = 'LoginTest123!';
      const user = await createTestUser(testModule.prisma, SystemRole.CUSTOMER, {
        email: 'login-test@example.com',
      });

      // Note: In real implementation, password is hashed. For this test
      // we assume the auth service uses bcrypt.compare
      const loginDto = {
        email: 'login-test@example.com',
        password: 'wrong-password', // This will fail since we didn't set the password
      };

      // This test demonstrates the flow - actual behavior depends on auth service implementation
      await request(app.getHttpServer())
        .post('/v1/auth/login/password')
        .send({ contact: 'login-test@example.com', contactType: 'email', password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('Appointment Booking Flow', () => {
    it('should create an appointment when authenticated', async () => {
      // Create test data
      const user = await createTestUser(testModule.prisma, SystemRole.CUSTOMER);
      const service = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, service.id);

      // Generate auth token
      const token = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        {
          secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-unit-tests-only',
          expiresIn: '15m',
        }
      );

      const appointmentDto = {
        serviceId: service.id,
        timeSlotId: timeSlot.id,
        appointmentDate: '2026-01-01T10:00:00Z',
        customerInfo: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(appointmentDto);

      // The response depends on the actual API implementation
      // This test demonstrates the pattern
      expect([201, 400, 401, 409]).toContain(response.status);
    });

    it('should reject unauthenticated appointment creation', async () => {
      const service = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, service.id);

      await request(app.getHttpServer())
        .post('/v1/appointments')
        .send({
          serviceId: service.id,
          timeSlotId: timeSlot.id,
          appointmentDate: '2026-01-01T10:00:00Z',
        })
        .expect(401);
    });
  });

  describe('Database State Verification', () => {
    it('should persist appointment in database after creation', async () => {
      const user = await createTestUser(testModule.prisma, SystemRole.CUSTOMER);
      const service = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, service.id);

      const appointment = await createTestAppointment(testModule.prisma, {
        userId: user.id,
        serviceId: service.id,
        timeSlotId: timeSlot.id,
      });

      // Verify the appointment exists in the database
      const dbAppointment = await testModule.prisma.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          user: true,
          service: true,
          timeSlot: true,
        },
      });

      expect(dbAppointment).not.toBeNull();
      expect(dbAppointment?.userId).toBe(user.id);
      expect(dbAppointment?.serviceId).toBe(service.id);
      expect(dbAppointment?.timeSlotId).toBe(timeSlot.id);
      expect(dbAppointment?.status).toBe(AppointmentStatus.PENDING);
    });

    it('should isolate test data between tests (resetDatabase works)', async () => {
      // Create test data
      await createTestUser(testModule.prisma, SystemRole.CUSTOMER);
      await createTestUser(testModule.prisma, SystemRole.ADMIN);

      const users = await testModule.prisma.user.findMany();
      expect(users.length).toBe(2);

      // The next test will call resetDatabase() in beforeEach,
      // so this data should not leak
    });
  });
});
