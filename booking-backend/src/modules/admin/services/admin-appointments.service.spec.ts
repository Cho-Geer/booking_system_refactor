import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/database/prisma.service";
import { AdminAppointmentsService } from "./admin-appointments.service";
import {
  AdminAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
  BatchCancelDto,
} from "../dto/admin-appointment.dto";

// Mock PrismaService
const mockPrismaService = {
  appointment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

describe("AdminAppointmentsService", () => {
  let service: AdminAppointmentsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAppointmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminAppointmentsService>(AdminAppointmentsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    const mockAppointments = [
      {
        id: "apt-1",
        userId: "user-1",
        serviceId: "svc-1",
        timeSlotId: "ts-1",
        appointmentDate: new Date("2025-06-15T10:00:00Z"),
        status: "PENDING",
        createdAt: new Date("2025-06-01"),
        updatedAt: new Date("2025-06-01"),
        appointmentNumber: "APT-001",
        customerInfo: {},
        slotSequence: 1,
        remarks: null,
        user: { name: "John Doe" },
        service: { name: "Haircut" },
        timeSlot: { slotTime: new Date("2025-06-15T10:00:00Z") },
      },
      {
        id: "apt-2",
        userId: "user-2",
        serviceId: "svc-2",
        timeSlotId: "ts-2",
        appointmentDate: new Date("2025-06-16T14:00:00Z"),
        status: "CONFIRMED",
        createdAt: new Date("2025-06-02"),
        updatedAt: new Date("2025-06-02"),
        appointmentNumber: "APT-002",
        customerInfo: {},
        slotSequence: 1,
        remarks: null,
        user: { name: "Jane Smith" },
        service: { name: "Manicure" },
        timeSlot: { slotTime: new Date("2025-06-16T14:00:00Z") },
      },
    ];

    it("should return paginated appointments with default pagination", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrismaService.appointment.count.mockResolvedValue(2);

      const query: AdminAppointmentsQueryDto = { page: 1, limit: 20 };
      const result = await service.findAll(query);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          where: {},
          include: {
            user: { select: { name: true } },
            service: { select: { name: true } },
            timeSlot: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      );
      expect(prisma.appointment.count).toHaveBeenCalledWith({ where: {} });
      expect(result.items).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it("should filter by date range when startDate and endDate provided", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointments[0],
      ]);
      mockPrismaService.appointment.count.mockResolvedValue(1);

      const query: AdminAppointmentsQueryDto = {
        startDate: "2025-06-15",
        endDate: "2025-06-15",
      };
      await service.findAll(query);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            appointmentDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        }),
      );
    });

    it("should filter by serviceId when provided", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointments[0],
      ]);
      mockPrismaService.appointment.count.mockResolvedValue(1);

      const query: AdminAppointmentsQueryDto = { serviceId: "svc-1" };
      await service.findAll(query);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ serviceId: "svc-1" }),
        }),
      );
    });

    it("should filter by userId when provided", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointments[0],
      ]);
      mockPrismaService.appointment.count.mockResolvedValue(1);

      const query: AdminAppointmentsQueryDto = { userId: "user-1" };
      await service.findAll(query);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        }),
      );
    });

    it("should filter by status when provided", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointments[0],
      ]);
      mockPrismaService.appointment.count.mockResolvedValue(1);

      const query: AdminAppointmentsQueryDto = { status: "PENDING" };
      await service.findAll(query);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "PENDING" }),
        }),
      );
    });

    it("should combine multiple filters", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.appointment.count.mockResolvedValue(0);

      const query: AdminAppointmentsQueryDto = {
        serviceId: "svc-1",
        userId: "user-1",
        status: "CONFIRMED",
        startDate: "2025-06-01",
        endDate: "2025-06-30",
      };
      await service.findAll(query);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceId: "svc-1",
            userId: "user-1",
            status: "CONFIRMED",
            appointmentDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it("should use mapper to convert appointments to AdminAppointmentDto", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrismaService.appointment.count.mockResolvedValue(2);

      const query: AdminAppointmentsQueryDto = {};
      const result = await service.findAll(query);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toHaveProperty("appointmentNumber");
      expect(result.items[0]).toHaveProperty("userName", "John Doe");
      expect(result.items[0]).toHaveProperty("serviceName", "Haircut");
    });

    it("should return empty items when no appointments match", async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.appointment.count.mockResolvedValue(0);

      const query: AdminAppointmentsQueryDto = {};
      const result = await service.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("updateStatus", () => {
    const existingAppointment = {
      id: "apt-1",
      userId: "user-1",
      serviceId: "svc-1",
      timeSlotId: "ts-1",
      appointmentDate: new Date("2025-06-15T10:00:00Z"),
      status: "PENDING",
      createdAt: new Date("2025-06-01"),
      updatedAt: new Date("2025-06-01"),
      appointmentNumber: "APT-001",
      customerInfo: {},
      remarks: null,
      slotSequence: 1,
    };

    it("should throw NotFoundException if appointment does not exist", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      const dto: UpdateAppointmentStatusDto = { status: "CONFIRMED" };
      await expect(
        service.updateStatus("nonexistent-id", dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should allow PENDING -> CONFIRMED transition", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(
        existingAppointment,
      );
      const updated = {
        ...existingAppointment,
        status: "CONFIRMED",
        updatedAt: new Date("2025-06-02"),
      };
      mockPrismaService.appointment.update.mockResolvedValue(updated);

      const dto: UpdateAppointmentStatusDto = { status: "CONFIRMED" };
      const result = await service.updateStatus("apt-1", dto);

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "apt-1" },
        data: { status: "CONFIRMED" },
      });
      expect(result).toEqual({
        id: "apt-1",
        status: "CONFIRMED",
        updatedAt: updated.updatedAt,
      });
    });

    it("should allow CONFIRMED -> COMPLETED transition", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue({
        ...existingAppointment,
        status: "CONFIRMED",
      });
      const updated = {
        ...existingAppointment,
        status: "COMPLETED",
        updatedAt: new Date("2025-06-02"),
      };
      mockPrismaService.appointment.update.mockResolvedValue(updated);

      const dto: UpdateAppointmentStatusDto = { status: "COMPLETED" };
      const result = await service.updateStatus("apt-1", dto);

      expect(result.status).toBe("COMPLETED");
    });

    it("should allow any -> CANCELLED transition with reason", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(
        existingAppointment,
      );
      const updated = {
        ...existingAppointment,
        status: "CANCELLED",
        remarks: "Customer requested cancellation",
        updatedAt: new Date("2025-06-02"),
      };
      mockPrismaService.appointment.update.mockResolvedValue(updated);

      const dto: UpdateAppointmentStatusDto = {
        status: "CANCELLED",
        reason: "Customer requested cancellation",
      };
      const result = await service.updateStatus("apt-1", dto);

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "apt-1" },
        data: { status: "CANCELLED", remarks: "Customer requested cancellation" },
      });
      expect(result.status).toBe("CANCELLED");
    });

    it("should throw BadRequestException for CANCELLED -> any transition", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue({
        ...existingAppointment,
        status: "CANCELLED",
      });

      const dto: UpdateAppointmentStatusDto = { status: "PENDING" };
      await expect(
        service.updateStatus("apt-1", dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus("apt-1", dto),
      ).rejects.toThrow(
        "Cannot transition from CANCELLED to PENDING",
      );
    });

    it("should throw BadRequestException for invalid transition PENDING -> COMPLETED", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(
        existingAppointment,
      );

      const dto: UpdateAppointmentStatusDto = { status: "COMPLETED" };
      await expect(
        service.updateStatus("apt-1", dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus("apt-1", dto),
      ).rejects.toThrow(
        "Cannot transition from PENDING to COMPLETED",
      );
    });

    it("should throw BadRequestException for invalid transition CONFIRMED -> PENDING", async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue({
        ...existingAppointment,
        status: "CONFIRMED",
      });

      const dto: UpdateAppointmentStatusDto = { status: "PENDING" };
      await expect(
        service.updateStatus("apt-1", dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("batchCancel", () => {
    it("should cancel all appointments successfully", async () => {
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce({
          id: "apt-1",
          status: "PENDING",
          userId: "user-1",
          serviceId: "svc-1",
          timeSlotId: "ts-1",
          appointmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          appointmentNumber: "APT-001",
          customerInfo: {},
          slotSequence: 1,
          remarks: null,
        })
        .mockResolvedValueOnce({
          id: "apt-2",
          status: "CONFIRMED",
          userId: "user-2",
          serviceId: "svc-2",
          timeSlotId: "ts-2",
          appointmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          appointmentNumber: "APT-002",
          customerInfo: {},
          slotSequence: 1,
          remarks: null,
        });
      mockPrismaService.appointment.update.mockResolvedValue({});

      const dto: BatchCancelDto = {
        ids: ["apt-1", "apt-2"],
        reason: "Maintenance window",
      };
      const result = await service.batchCancel(dto);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.failedIds).toEqual([]);
    });

    it("should report failures when appointments not found", async () => {
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce({
          id: "apt-1",
          status: "PENDING",
          userId: "user-1",
          serviceId: "svc-1",
          timeSlotId: "ts-1",
          appointmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          appointmentNumber: "APT-001",
          customerInfo: {},
          slotSequence: 1,
          remarks: null,
        })
        .mockResolvedValueOnce(null);

      const dto: BatchCancelDto = {
        ids: ["apt-1", "apt-3"],
        reason: "Cleanup",
      };
      const result = await service.batchCancel(dto);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedIds).toEqual(["apt-3"]);
    });

    it("should report failures when appointment is already cancelled", async () => {
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce({
          id: "apt-1",
          status: "CANCELLED",
          userId: "user-1",
          serviceId: "svc-1",
          timeSlotId: "ts-1",
          appointmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          appointmentNumber: "APT-001",
          customerInfo: {},
          slotSequence: 1,
          remarks: null,
        })
        .mockResolvedValueOnce({
          id: "apt-2",
          status: "PENDING",
          userId: "user-2",
          serviceId: "svc-2",
          timeSlotId: "ts-2",
          appointmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          appointmentNumber: "APT-002",
          customerInfo: {},
          slotSequence: 1,
          remarks: null,
        });

      const dto: BatchCancelDto = {
        ids: ["apt-1", "apt-2"],
        reason: "Cleanup",
      };
      const result = await service.batchCancel(dto);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedIds).toEqual(["apt-1"]);
    });

    it("should handle empty ids array", async () => {
      const dto: BatchCancelDto = { ids: [], reason: "test" };
      const result = await service.batchCancel(dto);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.failedIds).toEqual([]);
    });

    it("should collect multiple failures", async () => {
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "apt-2",
          status: "CANCELLED",
          userId: "user-2",
          serviceId: "svc-2",
          timeSlotId: "ts-2",
          appointmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          appointmentNumber: "APT-002",
          customerInfo: {},
          slotSequence: 1,
          remarks: null,
        })
        .mockResolvedValueOnce(null);

      const dto: BatchCancelDto = {
        ids: ["apt-1", "apt-2", "apt-3"],
        reason: "test",
      };
      const result = await service.batchCancel(dto);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(3);
      expect(result.failedIds).toEqual(["apt-1", "apt-2", "apt-3"]);
    });
  });
});
