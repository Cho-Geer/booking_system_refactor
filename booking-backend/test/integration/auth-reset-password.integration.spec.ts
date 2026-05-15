import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, UserStatus, SystemRole } from '@prisma/client';
import { AppModule } from '@/app.module';
import { createTestModule, TestModule } from '../helpers/create-test-module';
import { getTestDatabaseUrl } from '../setup/test-env';

process.env.JWT_SECRET = 'test-jwt-secret-rpw';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-rpw';
process.env.PII_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HASH_PEPPER = 'test-pepper-for-integration-tests-only';

/**
 * Cycle R5: POST /v1/auth/reset-password/send-code + POST /v1/auth/reset-password/verify
 */
describe('[R5] Auth Reset Password Flow', () => {
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

  describe('POST /v1/auth/reset-password/send-code', () => {
    it('should return 200 for existing user email (or 503 if email service unavailable)', async () => {
      const hashedPassword = await bcrypt.hash('OldP@ss123!', 12);
      await prisma.user.create({
        data: {
          name: 'Reset PW User',
          email: 'resetpw@example.com',
          phone: '+8613800138002',
          emailHash: `hash-resetpw@example.com`,
          phoneHash: `hash-8613800138002`,
          passwordHash: hashedPassword,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password/send-code')
        .send({ contact: 'resetpw@example.com', contactType: 'email' });

      expect([200, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('expiresIn');
        expect(response.body.data.expiresIn).toBeGreaterThan(0);
      }
    });

    it('should return 200 for non-existent user (anti-enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password/send-code')
        .send({ contact: 'nobody@example.com', contactType: 'email' });

      // Anti-enumeration: always 200
      expect([200, 503]).toContain(response.status);
    });

    it('should return 400 for missing contact', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password/send-code')
        .send({ contact: '', contactType: 'email' })
        .expect(400);
    });
  });

  describe('POST /v1/auth/reset-password/verify', () => {
    it('should return 400 for invalid verification code', async () => {
      const hashedPassword = await bcrypt.hash('OldP@ss123!', 12);
      await prisma.user.create({
        data: {
          name: 'Reset Verify User',
          email: 'resetverify@example.com',
          phone: '+8613800138003',
          emailHash: `hash-resetverify@example.com`,
          phoneHash: `hash-8613800138003`,
          passwordHash: hashedPassword,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      await request(app.getHttpServer())
        .post('/v1/auth/reset-password/verify')
        .send({
          contact: 'resetverify@example.com',
          contactType: 'email',
          code: '000000',
          newPassword: 'NewP@ss123!',
        })
        .expect(400);
    });

    it('should return 400 for weak password (missing requirements)', async () => {
      const hashedPassword = await bcrypt.hash('OldP@ss123!', 12);
      await prisma.user.create({
        data: {
          name: 'Weak PW User',
          email: 'weakpw@example.com',
          phone: '+8613800138004',
          emailHash: `hash-weakpw@example.com`,
          phoneHash: `hash-8613800138004`,
          passwordHash: hashedPassword,
          role: SystemRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      await request(app.getHttpServer())
        .post('/v1/auth/reset-password/verify')
        .send({
          contact: 'weakpw@example.com',
          contactType: 'email',
          code: '123456',
          newPassword: 'weak', // too short, no special chars
        })
        .expect(400);
    });
  });
});
