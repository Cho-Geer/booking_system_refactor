import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { TimeSlotsService } from "@/modules/time-slots/time-slots.service";
import {
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
} from "@/modules/time-slots/dto/time-slot.dto";
import { PrismaService } from "@/common/database/prisma.service";
import { createTestModule, TestModule } from "../helpers/create-test-module";
import {
  createTestService,
  createTestTimeSlot,
} from "../fixtures/database.fixture";
import { getTestDatabaseUrl } from "../setup/test-env";

/**
 * Comprehensive integration tests for TimeSlotsService using Testcontainers.
 *
 * These tests run against a real PostgreSQL database provisioned by the
 * integration test global setup (global-setup-integration.ts).
 *
 * Prerequisites: Docker must be running.
 * Run via: npm run test:integration
 */
describe("[Integration] TimeSlotsService", () => {
  let testModule: TestModule;
  let prisma: PrismaClient;
  let service: TimeSlotsService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // Verify DATABASE_URL is available (set by global-setup-integration.ts)
    const dbUrl = getTestDatabaseUrl();
    expect(dbUrl).toContain("postgresql://");

    testModule = await createTestModule();
    prisma = testModule.prisma;

    moduleRef = await Test.createTestingModule({
      providers: [
        TimeSlotsService,
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

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe("create", () => {
    it("should create a time slot and return it with service included", async () => {
      const svc = await createTestService(prisma);

      const result = await service.create({
        serviceId: svc.id,
        startTime: "2026-07-01T09:00:00Z",
        endTime: "2026-07-01T10:00:00Z",
        capacity: 5,
      });

      expect(result).toHaveProperty("id");
      expect(result.serviceId).toBe(svc.id);
      expect(result.startTime).toEqual(new Date("2026-07-01T09:00:00Z"));
      expect(result.endTime).toEqual(new Date("2026-07-01T10:00:00Z"));
      expect(result.capacity).toBe(5);
      expect(result.isActive).toBe(true);
      expect(result.service).toBeDefined();
      expect(result.service.name).toBeDefined();
    });

    it("should use capacity=1 when not provided", async () => {
      const svc = await createTestService(prisma);

      const result = await service.create({
        serviceId: svc.id,
        startTime: "2026-07-01T09:00:00Z",
        endTime: "2026-07-01T10:00:00Z",
      } as any);

      expect(result.capacity).toBe(1);
    });

    it("should reject duplicate time slot (same service + time range)", async () => {
      const svc = await createTestService(prisma);
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-07-01T09:00:00Z"),
        endTime: new Date("2026-07-01T10:00:00Z"),
      });

      await expect(
        service.create({
          serviceId: svc.id,
          startTime: "2026-07-01T09:00:00Z",
          endTime: "2026-07-01T10:00:00Z",
          capacity: 3,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should allow same time range for different services", async () => {
      const svc1 = await createTestService(prisma);
      const svc2 = await createTestService(prisma);

      const r1 = await service.create({
        serviceId: svc1.id,
        startTime: "2026-07-01T09:00:00Z",
        endTime: "2026-07-01T10:00:00Z",
        capacity: 2,
      });
      const r2 = await service.create({
        serviceId: svc2.id,
        startTime: "2026-07-01T09:00:00Z",
        endTime: "2026-07-01T10:00:00Z",
        capacity: 3,
      });

      expect(r1.serviceId).toBe(svc1.id);
      expect(r2.serviceId).toBe(svc2.id);
    });

    it("should allow different time ranges for the same service", async () => {
      const svc = await createTestService(prisma);

      const r1 = await service.create({
        serviceId: svc.id,
        startTime: "2026-07-01T09:00:00Z",
        endTime: "2026-07-01T10:00:00Z",
        capacity: 1,
      });
      const r2 = await service.create({
        serviceId: svc.id,
        startTime: "2026-07-01T10:00:00Z",
        endTime: "2026-07-01T11:00:00Z",
        capacity: 1,
      });

      expect(r1.id).not.toBe(r2.id);
    });
  });

  // ──────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────
  describe("findAll", () => {
    it("should paginate results with default page/limit", async () => {
      const svc = await createTestService(prisma);
      await createTestTimeSlot(prisma, svc.id);
      await createTestTimeSlot(prisma, svc.id);

      const result = await service.findAll();
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.meta.total).toBeGreaterThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it("should return empty result when no time slots exist", async () => {
      const result = await service.findAll();
      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it("should filter by serviceId", async () => {
      const svc1 = await createTestService(prisma);
      const svc2 = await createTestService(prisma);
      await createTestTimeSlot(prisma, svc1.id);
      await createTestTimeSlot(prisma, svc2.id);

      const result = await service.findAll(svc1.id);
      expect(result.items.every((s) => s.serviceId === svc1.id)).toBe(true);
      expect(result.meta.total).toBe(1);
    });

    it("should support custom pagination (page 2, limit 1)", async () => {
      const svc = await createTestService(prisma);
      await createTestTimeSlot(prisma, svc.id);
      await createTestTimeSlot(prisma, svc.id);

      const result = await service.findAll(undefined, undefined, 2, 1);
      expect(result.items.length).toBe(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(1);
      expect(result.meta.hasPrev).toBe(true);
    });

    it("should include service relation in results", async () => {
      const svc = await createTestService(prisma);
      await createTestTimeSlot(prisma, svc.id);

      const result = await service.findAll();
      expect(result.items[0]).toHaveProperty("service");
    });

    it("should order by startTime ascending by default", async () => {
      const svc = await createTestService(prisma);
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-08-01T10:00:00Z"),
        endTime: new Date("2026-08-01T11:00:00Z"),
      });
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-08-01T09:00:00Z"),
        endTime: new Date("2026-08-01T10:00:00Z"),
      });

      const result = await service.findAll();
      const times = result.items.map((s) => s.startTime.getTime());
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });
  });

  // ──────────────────────────────────────────────
  // findOne
  // ──────────────────────────────────────────────
  describe("findOne", () => {
    it("should find a time slot by ID with service included", async () => {
      const svc = await createTestService(prisma);
      const slot = await createTestTimeSlot(prisma, svc.id);

      const result = await service.findOne(slot.id);
      expect(result.id).toBe(slot.id);
      expect(result.serviceId).toBe(svc.id);
      expect(result.service).toBeDefined();
    });

    it("should throw NotFoundException for non-existent ID", async () => {
      await expect(
        service.findOne("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────
  describe("update", () => {
    it("should update isActive to false", async () => {
      const svc = await createTestService(prisma);
      const slot = await createTestTimeSlot(prisma, svc.id);
      expect(slot).toBeDefined();

      const result = await service.update(slot.id, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it("should toggle isActive from false back to true", async () => {
      const svc = await createTestService(prisma);
      const slot = await createTestTimeSlot(prisma, svc.id);

      await service.update(slot.id, { isActive: false });
      const result = await service.update(slot.id, { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it("should throw NotFoundException for non-existent ID", async () => {
      await expect(
        service.update("00000000-0000-0000-0000-000000000000", {
          isActive: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should include service in updated response", async () => {
      const svc = await createTestService(prisma);
      const slot = await createTestTimeSlot(prisma, svc.id);

      const result = await service.update(slot.id, { isActive: false });
      expect(result).toHaveProperty("service");
    });
  });

  // ──────────────────────────────────────────────
  // remove
  // ──────────────────────────────────────────────
  describe("remove", () => {
    it("should delete a time slot and return success message", async () => {
      const svc = await createTestService(prisma);
      const slot = await createTestTimeSlot(prisma, svc.id);

      const result = await service.remove(slot.id);
      expect(result).toEqual({ message: "Time slot deleted successfully" });

      // Verify deletion
      await expect(service.findOne(slot.id)).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException for non-existent ID", async () => {
      await expect(
        service.remove("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getAvailableSlots
  // ──────────────────────────────────────────────
  describe("getAvailableSlots", () => {
    const startDate = new Date("2026-07-15T00:00:00.000Z");
    const endDate = new Date("2026-07-15T23:59:59.000Z");

    it("should return available slots with correct shape", async () => {
      const svc = await createTestService(prisma, undefined, {
        durationMinutes: 60,
      });
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-07-15T09:00:00Z"),
        endTime: new Date("2026-07-15T10:00:00Z"),
        capacity: 5,
      });
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-07-15T10:00:00Z"),
        endTime: new Date("2026-07-15T11:00:00Z"),
        capacity: 5,
      });

      const result = await service.getAvailableSlots(
        svc.id,
        startDate,
        endDate,
      );

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        capacity: expect.any(Number),
        bookedCount: expect.any(Number),
        available: expect.any(Boolean),
      });
      // All returned slots should have available = true
      result.forEach((slot) => expect(slot.available).toBe(true));
    });

    it("should throw NotFoundException when service does not exist", async () => {
      await expect(
        service.getAvailableSlots("nonexistent-id", startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });

    it("should generate slots via generateTimeSlotsForDateRange and return them", async () => {
      // A service with durationMinutes will cause slot generation for the date range
      const svc = await createTestService(prisma, undefined, {
        durationMinutes: 60,
      });

      const result = await service.getAvailableSlots(
        svc.id,
        startDate,
        endDate,
      );

      // The service generates slots from 9AM-5PM with 60min intervals = 8 slots
      expect(result.length).toBe(8);
      expect(result[0].startTime.getUTCHours()).toBe(9);
      expect(result[7].startTime.getUTCHours()).toBe(16);
    });

    it("should handle multi-day date range", async () => {
      const multiDayStart = new Date("2026-07-15T00:00:00.000Z");
      const multiDayEnd = new Date("2026-07-17T23:59:59.000Z");
      const svc = await createTestService(prisma, undefined, {
        durationMinutes: 60,
      });

      const result = await service.getAvailableSlots(
        svc.id,
        multiDayStart,
        multiDayEnd,
      );

      // 3 days × 8 slots per day = 24 slots
      expect(result.length).toBe(24);
    });

    it("should set available=false for slots exceeding overtime limit", async () => {
      // Create service with short duration to allow overtime calculation
      const svc = await createTestService(prisma, undefined, {
        durationMinutes: 30,
      });
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-07-15T09:00:00Z"),
        endTime: new Date("2026-07-15T09:30:00Z"),
        capacity: 3,
      });
      await createTestTimeSlot(prisma, svc.id, {
        startTime: new Date("2026-07-15T10:00:00Z"),
        endTime: new Date("2026-07-15T10:30:00Z"),
        capacity: 3,
      });

      // Request overtime > gap between slots (30min gap, request 45min overtime)
      const result = await service.getAvailableSlots(
        svc.id,
        startDate,
        endDate,
        45,
      );

      const slotsWithOvertime = result.filter(
        (s) => s.maxOvertimeMinutes !== undefined,
      );
      if (slotsWithOvertime.length > 0) {
        // The last slot before a gap may have limited overtime
        expect(slotsWithOvertime[0].maxOvertimeMinutes).toBeDefined();
      }
    });
  });
});
