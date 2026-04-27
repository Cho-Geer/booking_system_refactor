import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { RetentionService } from '../src/common/services/retention.service';
import { PrismaService } from '../src/common/database/prisma.service';
import { AppModule } from '../src/app.module';
import {
  createTestModule,
  TestModule,
} from './helpers/create-test-module';
import {
  createTestUser,
  createTestCategory,
  createTestService,
  createTestTimeSlot,
  createTestAppointment,
} from './fixtures/database.fixture';
import { UserType, UserStatus, AppointmentStatus } from '@prisma/client';
import { PasswordUtil } from '../src/common/utils/password.util';
import { generateTestId } from './helpers/test-helper';

/**
 * E2E tests for Data Retention Service
 * Tests the actual cleanup logic against a real PostgreSQL database via Testcontainers
 */
import { PrismaClient } from '@prisma/client';

describe('RetentionService (e2e)', () => {
  let app: INestApplication;
  let testModule: TestModule;
  let service: RetentionService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    testModule = await createTestModule();
    prisma = testModule.prisma;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(require('@prisma/client').PrismaClient)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<RetentionService>(RetentionService);
  });

  afterAll(async () => {
    await app?.close();
    await testModule.disconnect();
  });

  beforeEach(async () => {
    await testModule.resetDatabase();
  });

  // ========================================================================
  // 1. cleanupExpiredAppointments
  // ========================================================================
  describe('cleanupExpiredAppointments', () => {
    it('should archive completed appointments older than 90 days', async () => {
      // Create a user to own the appointments
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Retention User ${ts}`,
          email: `retention-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const category = await createTestCategory(prisma);
      const svc = await createTestService(prisma, category.id);

      // Create an old time slot (91 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);
      const oldSlot = await prisma.timeSlot.create({
        data: {
          serviceId: svc.id,
          slotTime: oldDate.toISOString(),
          durationMinutes: 60,
          capacity: 5,
          currentSequence: 0,
          isActive: true,
          displayOrder: 0,
        },
      });

      // Create a COMPLETED appointment with updatedAt = 91 days ago
      const oldAppointment = await prisma.appointment.create({
        data: {
          userId: user.id,
          timeSlotId: oldSlot.id,
          serviceId: svc.id,
          appointmentNumber: `APT-OLD-${Date.now()}`,
          appointmentDate: oldDate,
          slotSequence: 1,
          status: AppointmentStatus.COMPLETED,
          customerInfo: { name: 'Old Customer', email: 'old@example.com', phone: '+15551234567' },
          remarks: 'Old completed appointment',
        },
      });

      // Force updatedAt to be old via raw SQL (Prisma doesn't allow direct setting of updatedAt)
      await prisma.$executeRaw`
        UPDATE appointments SET updated_at = ${oldDate} WHERE id = ${oldAppointment.id}
      `;

      // Create a recent COMPLETED appointment (should NOT be archived)
      const recentSlot = await prisma.timeSlot.create({
        data: {
          serviceId: svc.id,
          slotTime: new Date().toISOString(),
          durationMinutes: 60,
          capacity: 5,
          currentSequence: 0,
          isActive: true,
          displayOrder: 1,
        },
      });

      const recentAppointment = await prisma.appointment.create({
        data: {
          userId: user.id,
          timeSlotId: recentSlot.id,
          serviceId: svc.id,
          appointmentNumber: `APT-RECENT-${Date.now()}`,
          appointmentDate: new Date(),
          slotSequence: 1,
          status: AppointmentStatus.COMPLETED,
          customerInfo: { name: 'Recent Customer', email: 'recent@example.com', phone: '+15551234568' },
          remarks: 'Recent completed appointment',
        },
      });

      // Run cleanup
      const archivedCount = await service.cleanupExpiredAppointments();

      // Verify: old appointment is archived
      const oldAptAfter = await prisma.appointment.findUnique({
        where: { id: oldAppointment.id },
      });
      expect(oldAptAfter?.remarks).toContain('[ARCHIVED]');

      // Verify: recent appointment is unchanged
      const recentAptAfter = await prisma.appointment.findUnique({
        where: { id: recentAppointment.id },
      });
      expect(recentAptAfter?.remarks).toBe('Recent completed appointment');

      // Verify: at least 1 record was archived
      expect(archivedCount).toBeGreaterThanOrEqual(1);
    });

    it('should not archive pending or confirmed appointments', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Retention User ${ts}`,
          email: `retention-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const category = await createTestCategory(prisma);
      const svc = await createTestService(prisma, category.id);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);

      const oldSlot = await prisma.timeSlot.create({
        data: {
          serviceId: svc.id,
          slotTime: oldDate.toISOString(),
          durationMinutes: 60,
          capacity: 5,
          currentSequence: 0,
          isActive: true,
          displayOrder: 0,
        },
      });

      // Create a PENDING appointment older than 90 days
      const pendingAppointment = await prisma.appointment.create({
        data: {
          userId: user.id,
          timeSlotId: oldSlot.id,
          serviceId: svc.id,
          appointmentNumber: `APT-PENDING-${Date.now()}`,
          appointmentDate: oldDate,
          slotSequence: 1,
          status: AppointmentStatus.PENDING,
          customerInfo: { name: 'Pending Customer', email: 'pending@example.com', phone: '+15551234567' },
          remarks: 'Pending old appointment',
        },
      });

      await prisma.$executeRaw`
        UPDATE appointments SET updated_at = ${oldDate} WHERE id = ${pendingAppointment.id}
      `;

      // Create a CONFIRMED appointment older than 90 days
      const confirmedSlot = await prisma.timeSlot.create({
        data: {
          serviceId: svc.id,
          slotTime: oldDate.toISOString(),
          durationMinutes: 60,
          capacity: 5,
          currentSequence: 0,
          isActive: true,
          displayOrder: 1,
        },
      });

      const confirmedAppointment = await prisma.appointment.create({
        data: {
          userId: user.id,
          timeSlotId: confirmedSlot.id,
          serviceId: svc.id,
          appointmentNumber: `APT-CONFIRMED-${Date.now()}`,
          appointmentDate: oldDate,
          slotSequence: 1,
          status: AppointmentStatus.CONFIRMED,
          customerInfo: { name: 'Confirmed Customer', email: 'confirmed@example.com', phone: '+15551234568' },
          remarks: 'Confirmed old appointment',
        },
      });

      await prisma.$executeRaw`
        UPDATE appointments SET updated_at = ${oldDate} WHERE id = ${confirmedAppointment.id}
      `;

      // Run cleanup
      await service.cleanupExpiredAppointments();

      // Verify: PENDING appointment is NOT archived
      const pendingAfter = await prisma.appointment.findUnique({
        where: { id: pendingAppointment.id },
      });
      expect(pendingAfter?.remarks).toBe('Pending old appointment');
      expect(pendingAfter?.status).toBe(AppointmentStatus.PENDING);

      // Verify: CONFIRMED appointment is NOT archived
      const confirmedAfter = await prisma.appointment.findUnique({
        where: { id: confirmedAppointment.id },
      });
      expect(confirmedAfter?.remarks).toBe('Confirmed old appointment');
      expect(confirmedAfter?.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should archive cancelled and expired appointments older than 90 days', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Retention User ${ts}`,
          email: `retention-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const category = await createTestCategory(prisma);
      const svc = await createTestService(prisma, category.id);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);

      for (const status of [AppointmentStatus.CANCELLED, AppointmentStatus.EXPIRED]) {
        const slot = await prisma.timeSlot.create({
          data: {
            serviceId: svc.id,
            slotTime: oldDate.toISOString(),
            durationMinutes: 60,
            capacity: 5,
            currentSequence: 0,
            isActive: true,
            displayOrder: 0,
          },
        });

        const apt = await prisma.appointment.create({
          data: {
            userId: user.id,
            timeSlotId: slot.id,
            serviceId: svc.id,
            appointmentNumber: `APT-${status}-${Date.now()}`,
            appointmentDate: oldDate,
            slotSequence: 1,
            status,
            customerInfo: { name: `${status} Customer`, email: `${status.toLowerCase()}@example.com`, phone: '+15551234567' },
            remarks: `${status} old appointment`,
          },
        });

        await prisma.$executeRaw`
          UPDATE appointments SET updated_at = ${oldDate} WHERE id = ${apt.id}
        `;
      }

      const archivedCount = await service.cleanupExpiredAppointments();

      expect(archivedCount).toBeGreaterThanOrEqual(2);

      const cancelledApt = await prisma.appointment.findFirst({
        where: { appointmentNumber: { startsWith: 'APT-CANCELLED' } },
      });
      expect(cancelledApt?.remarks).toContain('[ARCHIVED]');

      const expiredApt = await prisma.appointment.findFirst({
        where: { appointmentNumber: { startsWith: 'APT-EXPIRED' } },
      });
      expect(expiredApt?.remarks).toContain('[ARCHIVED]');
    });
  });

  // ========================================================================
  // 2. cleanupOldSystemLogs
  // ========================================================================
  describe('cleanupOldSystemLogs', () => {
    it('should delete system logs older than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      // Create old system logs
      const oldLog1 = await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          message: 'Old error log 1',
          ipAddress: '192.168.1.1',
        },
      });
      await prisma.$executeRaw`
        UPDATE system_logs SET created_at = ${oldDate} WHERE id = ${oldLog1.id}
      `;

      const oldLog2 = await prisma.systemLog.create({
        data: {
          level: 'WARN',
          message: 'Old warning log',
          ipAddress: '192.168.1.2',
        },
      });
      await prisma.$executeRaw`
        UPDATE system_logs SET created_at = ${oldDate} WHERE id = ${oldLog2.id}
      `;

      // Create a recent system log
      const recentLog = await prisma.systemLog.create({
        data: {
          level: 'INFO',
          message: 'Recent info log',
          ipAddress: '192.168.1.3',
        },
      });

      // Run cleanup
      const deletedCount = await service.cleanupOldSystemLogs();

      // Verify: old logs are deleted
      const oldLog1After = await prisma.systemLog.findUnique({
        where: { id: oldLog1.id },
      });
      expect(oldLog1After).toBeNull();

      const oldLog2After = await prisma.systemLog.findUnique({
        where: { id: oldLog2.id },
      });
      expect(oldLog2After).toBeNull();

      // Verify: recent log remains
      const recentLogAfter = await prisma.systemLog.findUnique({
        where: { id: recentLog.id },
      });
      expect(recentLogAfter).not.toBeNull();
      expect(recentLogAfter?.message).toBe('Recent info log');

      // Verify: deleted count is at least 2
      expect(deletedCount).toBeGreaterThanOrEqual(2);
    });

    it('should return count of deleted logs', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      // Create exactly 5 old logs
      for (let i = 0; i < 5; i++) {
        const log = await prisma.systemLog.create({
          data: {
            level: 'DEBUG',
            message: `Old debug log ${i}`,
          },
        });
        await prisma.$executeRaw`
          UPDATE system_logs SET created_at = ${oldDate} WHERE id = ${log.id}
        `;
      }

      const deletedCount = await service.cleanupOldSystemLogs();
      expect(deletedCount).toBe(5);
    });
  });

  // ========================================================================
  // 3. cleanupInactiveSessions
  // ========================================================================
  describe('cleanupInactiveSessions', () => {
    it('should delete inactive sessions older than 30 days', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Session User ${ts}`,
          email: `session-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      // Create an inactive session older than 30 days
      const inactiveOldSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: `session-inactive-old-${Date.now()}`,
          refreshToken: `refresh-inactive-old-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000), // expires tomorrow
          isActive: false,
          createdAt: oldDate,
        },
      });
      await prisma.$executeRaw`
        UPDATE user_sessions SET created_at = ${oldDate} WHERE id = ${inactiveOldSession.id}
      `;

      // Create an active session older than 30 days (should NOT be deleted - isActive=true and not expired)
      const activeOldSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: `session-active-old-${Date.now()}`,
          refreshToken: `refresh-active-old-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000), // expires tomorrow
          isActive: true,
          createdAt: oldDate,
        },
      });
      await prisma.$executeRaw`
        UPDATE user_sessions SET created_at = ${oldDate} WHERE id = ${activeOldSession.id}
      `;

      // Run cleanup
      const deletedCount = await service.cleanupInactiveSessions();

      // Verify: inactive old session is deleted
      const inactiveOldAfter = await prisma.userSession.findUnique({
        where: { id: inactiveOldSession.id },
      });
      expect(inactiveOldAfter).toBeNull();

      // Verify: active old session (not expired) remains
      const activeOldAfter = await prisma.userSession.findUnique({
        where: { id: activeOldSession.id },
      });
      expect(activeOldAfter).not.toBeNull();

      expect(deletedCount).toBeGreaterThanOrEqual(1);
    });

    it('should delete expired sessions regardless of isActive', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Session User ${ts}`,
          email: `session-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Create an active but expired session
      const expiredActiveSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: `session-expired-active-${Date.now()}`,
          refreshToken: `refresh-expired-active-${Date.now()}`,
          expiresAt: yesterday,
          isActive: true,
        },
      });

      // Create an inactive and expired session
      const expiredInactiveSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: `session-expired-inactive-${Date.now()}`,
          refreshToken: `refresh-expired-inactive-${Date.now()}`,
          expiresAt: yesterday,
          isActive: false,
        },
      });

      // Run cleanup
      await service.cleanupInactiveSessions();

      // Verify: expired active session is deleted
      const expiredActiveAfter = await prisma.userSession.findUnique({
        where: { id: expiredActiveSession.id },
      });
      expect(expiredActiveAfter).toBeNull();

      // Verify: expired inactive session is deleted
      const expiredInactiveAfter = await prisma.userSession.findUnique({
        where: { id: expiredInactiveSession.id },
      });
      expect(expiredInactiveAfter).toBeNull();
    });

    it('should not delete active non-expired sessions', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Session User ${ts}`,
          email: `session-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create an active session that expires tomorrow
      const activeSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: `session-active-future-${Date.now()}`,
          refreshToken: `refresh-active-future-${Date.now()}`,
          expiresAt: tomorrow,
          isActive: true,
        },
      });

      // Run cleanup
      await service.cleanupInactiveSessions();

      // Verify: active non-expired session remains
      const activeAfter = await prisma.userSession.findUnique({
        where: { id: activeSession.id },
      });
      expect(activeAfter).not.toBeNull();
      expect(activeAfter?.isActive).toBe(true);
    });
  });

  // ========================================================================
  // 4. cleanupOldActivityLogs
  // ========================================================================
  describe('cleanupOldActivityLogs', () => {
    it('should archive old user activity logs older than 30 days', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Activity User ${ts}`,
          email: `activity-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      // Create old activity logs
      const oldLog1 = await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          resourceType: 'USER',
          resourceId: user.id,
          ipAddress: '192.168.1.1',
          userAgent: 'TestBrowser/1.0',
        },
      });
      await prisma.$executeRaw`
        UPDATE activity_logs SET created_at = ${oldDate} WHERE id = ${oldLog1.id}
      `;

      const oldLog2 = await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'BOOKING_CREATED',
          resourceType: 'APPOINTMENT',
          ipAddress: '192.168.1.2',
        },
      });
      await prisma.$executeRaw`
        UPDATE activity_logs SET created_at = ${oldDate} WHERE id = ${oldLog2.id}
      `;

      // Create a recent activity log
      const recentLog = await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'PROFILE_UPDATED',
          resourceType: 'USER',
          resourceId: user.id,
        },
      });

      // Run cleanup
      const deletedCount = await service.cleanupOldActivityLogs();

      // Verify: old logs are deleted
      const oldLog1After = await prisma.activityLog.findUnique({
        where: { id: oldLog1.id },
      });
      expect(oldLog1After).toBeNull();

      const oldLog2After = await prisma.activityLog.findUnique({
        where: { id: oldLog2.id },
      });
      expect(oldLog2After).toBeNull();

      // Verify: recent log remains
      const recentLogAfter = await prisma.activityLog.findUnique({
        where: { id: recentLog.id },
      });
      expect(recentLogAfter).not.toBeNull();
      expect(recentLogAfter?.action).toBe('PROFILE_UPDATED');

      expect(deletedCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ========================================================================
  // 5. getConfig (retention schedule configuration)
  // ========================================================================
  describe('getConfig', () => {
    it('should return the correct retention configuration', () => {
      const config = service.getConfig();

      expect(config.appointmentRetentionDays).toBe(90);
      expect(config.systemLogRetentionDays).toBe(30);
      expect(config.sessionRetentionDays).toBe(30);
    });
  });

  // ========================================================================
  // 6. Retention with empty database (no-op case)
  // ========================================================================
  describe('Retention with empty database', () => {
    it('should return 0 when no expired appointments exist', async () => {
      const count = await service.cleanupExpiredAppointments();
      expect(count).toBe(0);
    });

    it('should return 0 when no old system logs exist', async () => {
      const count = await service.cleanupOldSystemLogs();
      expect(count).toBe(0);
    });

    it('should return 0 when no inactive sessions exist', async () => {
      const count = await service.cleanupInactiveSessions();
      expect(count).toBe(0);
    });

    it('should return 0 when no old activity logs exist', async () => {
      const count = await service.cleanupOldActivityLogs();
      expect(count).toBe(0);
    });
  });

  // ========================================================================
  // 7. Retention does not delete recent data
  // ========================================================================
  describe('Retention preserves recent data', () => {
    it('should not delete system logs created within retention period', async () => {
      // Create recent logs (within 30-day retention)
      const recentLogs: { id: string }[] = [];
      for (let daysAgo = 1; daysAgo <= 29; daysAgo++) {
        const logDate = new Date();
        logDate.setDate(logDate.getDate() - daysAgo);
        const log = await prisma.systemLog.create({
          data: {
            level: 'INFO',
            message: `Recent log from ${daysAgo} days ago`,
          },
        });
        await prisma.$executeRaw`
          UPDATE system_logs SET created_at = ${logDate} WHERE id = ${log.id}
        `;
        recentLogs.push(log);
      }

      await service.cleanupOldSystemLogs();

      // All recent logs should still exist
      for (const log of recentLogs) {
        const logAfter = await prisma.systemLog.findUnique({
          where: { id: log.id },
        });
        expect(logAfter).not.toBeNull();
      }
    });

    it('should not archive appointments within 90-day retention period', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Retention User ${ts}`,
          email: `retention-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const category = await createTestCategory(prisma);
      const svc = await createTestService(prisma, category.id);

      // Create a COMPLETED appointment from 89 days ago (within retention)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 89);
      const slot = await prisma.timeSlot.create({
        data: {
          serviceId: svc.id,
          slotTime: recentDate.toISOString(),
          durationMinutes: 60,
          capacity: 5,
          currentSequence: 0,
          isActive: true,
          displayOrder: 0,
        },
      });

      const apt = await prisma.appointment.create({
        data: {
          userId: user.id,
          timeSlotId: slot.id,
          serviceId: svc.id,
          appointmentNumber: `APT-RECENT-RETENTION-${Date.now()}`,
          appointmentDate: recentDate,
          slotSequence: 1,
          status: AppointmentStatus.COMPLETED,
          customerInfo: { name: 'Recent Customer', email: 'recent@example.com', phone: '+15551234567' },
          remarks: 'Recent completed within retention',
        },
      });

      await prisma.$executeRaw`
        UPDATE appointments SET updated_at = ${recentDate} WHERE id = ${apt.id}
      `;

      await service.cleanupExpiredAppointments();

      const aptAfter = await prisma.appointment.findUnique({
        where: { id: apt.id },
      });
      // Should NOT be archived (within 90-day window)
      expect(aptAfter?.remarks).toBe('Recent completed within retention');
      expect(aptAfter?.remarks).not.toContain('[ARCHIVED]');
    });
  });

  // ========================================================================
  // 8. handleCron (daily cleanup) — batch processing
  // ========================================================================
  describe('handleCron (daily batch cleanup)', () => {
    it('should complete all cleanup tasks without throwing', async () => {
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Cron User ${ts}`,
          email: `cron-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);

      // Seed various old data
      const category = await createTestCategory(prisma);
      const svc = await createTestService(prisma, category.id);
      const slot = await createTestTimeSlot(prisma, svc.id, { slotTime: oldDate.toISOString() });

      // Old completed appointment
      const apt = await createTestAppointment(prisma, {
        userId: user.id,
        timeSlotId: slot.id,
        serviceId: svc.id,
        status: AppointmentStatus.COMPLETED,
      });
      await prisma.$executeRaw`
        UPDATE appointments SET updated_at = ${oldDate} WHERE id = ${apt.id}
      `;

      // Old system log
      await prisma.systemLog.create({
        data: { level: 'ERROR', message: 'Old system error' },
      });

      // Old expired session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: `cron-expired-session-${Date.now()}`,
          refreshToken: `cron-refresh-${Date.now()}`,
          expiresAt: oldDate,
          isActive: true,
        },
      });

      // Old activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'OLD_ACTION',
          resourceType: 'SYSTEM',
        },
      });

      // Call handleCron — should not throw
      await expect(service.handleCron()).resolves.not.toThrow();

      // Verify appointments were archived
      const aptAfter = await prisma.appointment.findUnique({
        where: { id: apt.id },
      });
      expect(aptAfter?.remarks).toContain('[ARCHIVED]');

      // Verify system logs were cleaned
      const logCount = await prisma.systemLog.count();
      expect(logCount).toBe(0);

      // Verify expired sessions were cleaned
      const sessionCount = await prisma.userSession.count({
        where: { expiresAt: { lt: new Date() } },
      });
      expect(sessionCount).toBe(0);
    });

    it('should handle the full daily cleanup pipeline on a populated database', async () => {
      // Create a mix of old and recent data to test batch processing
      const ts = generateTestId();
      const hash = await PasswordUtil.hash('Test@Pass123');
      const user = await prisma.user.create({
        data: {
          name: `Batch User ${ts}`,
          email: `batch-${ts}@example.com`,
          phone: `+1${Date.now().toString().slice(-10)}`,
          passwordHash: hash,
          userType: UserType.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const category = await createTestCategory(prisma);
      const svc = await createTestService(prisma, category.id);

      // Create multiple old appointments
      const oldAppointments: { id: string }[] = [];
      for (let i = 0; i < 3; i++) {
        const slot = await prisma.timeSlot.create({
          data: {
            serviceId: svc.id,
            slotTime: oldDate.toISOString(),
            durationMinutes: 60,
            capacity: 5,
            currentSequence: i,
            isActive: true,
            displayOrder: i,
          },
        });
        const apt = await prisma.appointment.create({
          data: {
            userId: user.id,
            timeSlotId: slot.id,
            serviceId: svc.id,
            appointmentNumber: `BATCH-OLD-${i}-${Date.now()}`,
            appointmentDate: oldDate,
            slotSequence: 1,
            status: AppointmentStatus.COMPLETED,
            customerInfo: { name: `Batch Customer ${i}`, email: `batch-${i}@example.com`, phone: '+15551234567' },
          },
        });
        await prisma.$executeRaw`
          UPDATE appointments SET updated_at = ${oldDate} WHERE id = ${apt.id}
        `;
        oldAppointments.push(apt);
      }

      // Create multiple recent appointments (should survive)
      const recentSlot = await prisma.timeSlot.create({
        data: {
          serviceId: svc.id,
          slotTime: recentDate.toISOString(),
          durationMinutes: 60,
          capacity: 5,
          currentSequence: 0,
          isActive: true,
          displayOrder: 10,
        },
      });
      const recentApt = await prisma.appointment.create({
        data: {
          userId: user.id,
          timeSlotId: recentSlot.id,
          serviceId: svc.id,
          appointmentNumber: `BATCH-RECENT-${Date.now()}`,
          appointmentDate: recentDate,
          slotSequence: 1,
          status: AppointmentStatus.CONFIRMED,
          customerInfo: { name: 'Batch Recent', email: 'batch-recent@example.com', phone: '+15551234568' },
        },
      });

      // Create mixed system logs
      for (let i = 0; i < 2; i++) {
        const log = await prisma.systemLog.create({
          data: { level: 'INFO', message: `Batch old log ${i}` },
        });
        await prisma.$executeRaw`
          UPDATE system_logs SET created_at = ${oldDate} WHERE id = ${log.id}
        `;
      }

      // Execute the full daily cleanup pipeline
      await service.handleCron();

      // Verify all old appointments are archived
      for (const apt of oldAppointments) {
        const aptAfter = await prisma.appointment.findUnique({
          where: { id: apt.id },
        });
        expect(aptAfter?.remarks).toContain('[ARCHIVED]');
      }

      // Verify recent appointment is unchanged
      const recentAptAfter = await prisma.appointment.findUnique({
        where: { id: recentApt.id },
      });
      expect(recentAptAfter?.remarks).not.toContain('[ARCHIVED]');
      expect(recentAptAfter?.status).toBe(AppointmentStatus.CONFIRMED);

      // Verify old system logs are deleted
      const remainingLogs = await prisma.systemLog.count({
        where: { message: { startsWith: 'Batch old log' } },
      });
      expect(remainingLogs).toBe(0);
    });
  });
});
