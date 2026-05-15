import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TimeSlotsService } from './time-slots.service';
import { AdminSettingsService } from '../admin/services/admin-settings.service';
import { createTestModule, TestModule } from '../../../test/helpers/create-test-module';
import { createTestService, createTestTimeSlot } from '../../../test/fixtures/database.fixture';

// ============================================================
// Integration Tests (uses real database via Testcontainers)
// Jest globalSetup (jest.config.js) starts PostgreSQL + Redis
// containers and runs Prisma migrations before any test.
// ============================================================

describe('TimeSlotsService (Integration)', () => {
  let testModule: TestModule;
  let service: TimeSlotsService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    testModule = await createTestModule();
    prisma = testModule.prisma as unknown as PrismaService;

    moduleRef = await Test.createTestingModule({
      providers: [
        TimeSlotsService,
        AdminSettingsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get<TimeSlotsService>(TimeSlotsService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await testModule?.disconnect();
  });

  beforeEach(async () => {
    await testModule.resetDatabase();
  });

  describe('create', () => {
    it('should create a time slot in the real database', async () => {
      const serviceRecord = await createTestService(testModule.prisma);

      const result = await service.create({
        serviceId: serviceRecord.id,
        startTime: '2026-02-01T09:00:00Z',
        endTime: '2026-02-01T10:00:00Z',
        capacity: 10,
      });

      expect(result).toHaveProperty('id');
      expect(result.serviceId).toBe(serviceRecord.id);
      expect(result.startTime).toEqual(new Date('2026-02-01T09:00:00Z'));
      expect(result.endTime).toEqual(new Date('2026-02-01T10:00:00Z'));
    });

    it('should throw ConflictException if time slot already exists for same time and service', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      await createTestTimeSlot(testModule.prisma, serviceRecord.id, {
        startTime: new Date('2026-02-01T09:00:00Z'),
        endTime: new Date('2026-02-01T09:30:00Z'),
      });

      await expect(
        service.create({
          serviceId: serviceRecord.id,
          startTime: '2026-02-01T09:00:00Z',
          endTime: '2026-02-01T09:30:00Z',
          capacity: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow creating multiple slots for different services at same time', async () => {
      const service1 = await createTestService(testModule.prisma);
      const service2 = await createTestService(testModule.prisma);

      const result1 = await service.create({
        serviceId: service1.id,
        startTime: '2026-02-01T09:00:00Z',
        endTime: '2026-02-01T09:30:00Z',
        capacity: 1,
      });

      const result2 = await service.create({
        serviceId: service2.id,
        startTime: '2026-02-01T09:00:00Z',
        endTime: '2026-02-01T09:30:00Z',
        capacity: 1,
      });

      expect(result1.serviceId).toBe(service1.id);
      expect(result2.serviceId).toBe(service2.id);
    });

    it('should allow creating different time slots for same service', async () => {
      const serviceRecord = await createTestService(testModule.prisma);

      const result1 = await service.create({
        serviceId: serviceRecord.id,
        startTime: '2026-02-01T09:00:00Z',
        endTime: '2026-02-01T09:30:00Z',
        capacity: 1,
      });

      const result2 = await service.create({
        serviceId: serviceRecord.id,
        startTime: '2026-02-01T10:00:00Z',
        endTime: '2026-02-01T10:30:00Z',
        capacity: 1,
      });

      expect(result1.id).not.toBe(result2.id);
      expect(result2.startTime).toEqual(new Date('2026-02-01T10:00:00Z'));
    });
  });

  describe('findAll', () => {
    it('should return paginated time slots from real database', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      await createTestTimeSlot(testModule.prisma, serviceRecord.id, {
        startTime: new Date('2026-03-01T09:00:00Z'),
        endTime: new Date('2026-03-01T10:00:00Z'),
      });
      await createTestTimeSlot(testModule.prisma, serviceRecord.id, {
        startTime: new Date('2026-03-01T10:00:00Z'),
        endTime: new Date('2026-03-01T11:00:00Z'),
      });

      const result = await service.findAll();
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by serviceId', async () => {
      const service1 = await createTestService(testModule.prisma);
      const service2 = await createTestService(testModule.prisma);
      await createTestTimeSlot(testModule.prisma, service1.id);
      await createTestTimeSlot(testModule.prisma, service2.id);

      const result = await service.findAll(service1.id);
      expect(result.items.every((s) => s.serviceId === service1.id)).toBe(true);
    });

    it('should support custom pagination', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      await createTestTimeSlot(testModule.prisma, serviceRecord.id);
      await createTestTimeSlot(testModule.prisma, serviceRecord.id);

      const result = await service.findAll(undefined, undefined, 1, 1);
      expect(result.items.length).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(1);
    });

    it('should return empty data when no time slots exist', async () => {
      const result = await service.findAll();
      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return time slot by id from real database', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, serviceRecord.id);

      const result = await service.findOne(timeSlot.id);
      expect(result.id).toBe(timeSlot.id);
      expect(result.serviceId).toBe(serviceRecord.id);
    });

    it('should throw NotFoundException for non-existent time slot', async () => {
      await expect(service.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update time slot successfully', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, serviceRecord.id);

      const result = await service.update(timeSlot.id, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if time slot not found', async () => {
      await expect(
        service.update('00000000-0000-0000-0000-000000000000', {
          isActive: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include service in updated response', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, serviceRecord.id);

      const result = await service.update(timeSlot.id, { isActive: false });
      expect(result).toHaveProperty('service');
    });

    it('should revert to available after setting unavailable', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, serviceRecord.id);

      const unavailable = await service.update(timeSlot.id, {
        isActive: false,
      });
      expect(unavailable.isActive).toBe(false);

      const available = await service.update(timeSlot.id, { isActive: true });
      expect(available.isActive).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete time slot and return success message', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      const timeSlot = await createTestTimeSlot(testModule.prisma, serviceRecord.id);

      const result = await service.remove(timeSlot.id);
      expect(result).toEqual({ message: 'Time slot deleted successfully' });

      await expect(service.findOne(timeSlot.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if time slot not found', async () => {
      await expect(service.remove('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAvailableSlots', () => {
    const mondayDate = new Date('2026-06-15T00:00:00.000Z');
    const mondayEnd = new Date('2026-06-15T23:59:59.000Z');

    it('should return available time slots for given service and date range', async () => {
      const serviceRecord = await createTestService(testModule.prisma);
      await createTestTimeSlot(testModule.prisma, serviceRecord.id, {
        startTime: new Date('2026-06-15T01:00:00Z'),
        endTime: new Date('2026-06-15T02:00:00Z'),
        capacity: 5,
      });
      await createTestTimeSlot(testModule.prisma, serviceRecord.id, {
        startTime: new Date('2026-06-15T02:00:00Z'),
        endTime: new Date('2026-06-15T03:00:00Z'),
        capacity: 5,
      });

      const result = await service.getAvailableSlots(serviceRecord.id, mondayDate, mondayEnd);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        capacity: expect.any(Number),
        bookedCount: expect.any(Number),
        available: expect.any(Boolean),
      });
    });

    it('should throw NotFoundException when service does not exist', async () => {
      await expect(
        service.getAvailableSlots('nonexistent-id', mondayDate, mondayEnd),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate slots for Monday using business hours (09:00-17:00 Asia/Shanghai = UTC 01:00-09:00)', async () => {
      const serviceRecord = await createTestService(testModule.prisma, undefined, {
        durationMinutes: 60,
      });

      const result = await service.getAvailableSlots(serviceRecord.id, mondayDate, mondayEnd);

      // Monday 09:00-17:00 Asia/Shanghai = UTC 01:00-09:00, 60min + 30min gap = 90min cycle = 5 slots
      expect(result.length).toBe(5);
      expect(result[0].startTime.getUTCHours()).toBe(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('available');
      expect(result[0].available).toBe(true);
    });

    it('should generate 4 slots for Monday with 90-min service (90min + 30min gap = 120min cycle)', async () => {
      const serviceRecord = await createTestService(testModule.prisma, undefined, {
        durationMinutes: 90,
      });

      const result = await service.getAvailableSlots(serviceRecord.id, mondayDate, mondayEnd);

      // Monday 09:00-17:00 Asia/Shanghai = UTC 01:00-09:00, 90min + 30min gap = 120min cycle = 4 slots
      expect(result.length).toBe(4);
      expect(result[0].startTime.getUTCHours()).toBe(1);
    });

    it('should generate slots for Saturday using business hours (10:00-14:00 Asia/Shanghai = UTC 02:00-06:00)', async () => {
      const saturday = new Date('2026-06-20T00:00:00.000Z');
      const saturdayEnd = new Date('2026-06-20T23:59:59.000Z');
      const serviceRecord = await createTestService(testModule.prisma, undefined, {
        durationMinutes: 60,
      });

      const result = await service.getAvailableSlots(serviceRecord.id, saturday, saturdayEnd);

      // Saturday 10:00-14:00 Asia/Shanghai = UTC 02:00-06:00, 60min + 30min gap = 90min cycle = 3 slots
      expect(result.length).toBe(3);
      expect(result[0].startTime.getUTCHours()).toBe(2);
    });

    it('should generate no slots for Sunday (closed)', async () => {
      const sunday = new Date('2026-06-21T00:00:00.000Z');
      const sundayEnd = new Date('2026-06-21T23:59:59.000Z');
      const serviceRecord = await createTestService(testModule.prisma, undefined, {
        durationMinutes: 60,
      });

      const result = await service.getAvailableSlots(serviceRecord.id, sunday, sundayEnd);

      // Sunday is closed => no slots generated
      expect(result.length).toBe(0);
    });
  });
});
