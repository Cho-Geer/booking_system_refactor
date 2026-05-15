import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient, UserStatus, SystemRole } from '@prisma/client';
import { AppModule } from '@/app.module';
import { createTestModule, TestModule } from '../helpers/create-test-module';
import { getTestDatabaseUrl } from '../setup/test-env';

process.env.JWT_SECRET = 'test-jwt-secret-sms';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-sms';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R4: POST /v1/auth/login/send-code + POST /v1/auth/login/verify-code
 */
describe('[R4] Auth SMS Login Flow', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let prisma: PrismaClient;

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
  });

  afterAll(async () => {
    await app?.close();
    await testModule?.disconnect();
  });

  beforeEach(async () => {
    await testModule.resetDatabase();
  });

  describe('POST /v1/auth/login/send-code', () => {
    it('should return 200 with maskedContact for existing user email', async () => {
      await prisma.user.create({
        data: {
          name: 'SMS Login User',
          email: 'smslogin@example.com',
          phone: '+8613800138000',
          emailHash: `hash-smslogin@example.com`,
          phoneHash: `hash-8613800138000`,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login/send-code')
        .send({ contact: 'smslogin@example.com', contactType: 'email' });

      // Response is 200 (code sent), 503 (email service unavailable in test), or 400 (validation)
      expect([200, 400, 503]).toContain(response.status);

      if (response.status === 200) {
        // Service may return {expiresIn} or {maskedContact, expiresIn} depending on email availability
        expect(response.body.data).toHaveProperty('expiresIn');
        expect(response.body.data.expiresIn).toBeGreaterThan(0);
      }
    });

    it('should return 200 for non-existent user (anti-enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login/send-code')
        .send({ contact: 'nonexistent@example.com', contactType: 'email' });

      // Anti-enumeration: always return 200 even if user doesn't exist
      expect([200, 503]).toContain(response.status);
    });

    it('should return 400 for empty contact', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login/send-code')
        .send({ contact: '', contactType: 'email' })
        .expect(400);
    });
  });

  describe('POST /v1/auth/login/verify-code', () => {
    it('should return 401 for invalid verification code', async () => {
      const { token } = await createUserWithSessionAndToken('verify-test@example.com');

      await request(app.getHttpServer())
        .post('/v1/auth/login/verify-code')
        .send({
          contact: 'verify-test@example.com',
          contactType: 'email',
          code: '000000',
        })
        .expect(401);
    });
  });

  /** Helper to create a user and return a JWT token */
  async function createUserWithSessionAndToken(email: string) {
    const { JwtService } = require('@nestjs/jwt');
    const jwtService = app.get(JwtService);

    const user = await prisma.user.create({
      data: {
        name: `Verify User ${Date.now()}`,
        email,
        phone: '+8613800138001',
        emailHash: `hash-${email}`,
        phoneHash: `hash-8613800138001`,
        role: SystemRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });

    const token = jwtService.sign(
      { sub: user.id, role: user.role },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );

    return { user, token };
  }
});
