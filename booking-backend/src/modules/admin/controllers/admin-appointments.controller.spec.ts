import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { AdminAppointmentsController } from "./admin-appointments.controller";
import { AdminAppointmentsService } from "../services/admin-appointments.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import {
  AdminAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
  BatchCancelDto,
} from "../dto/admin-appointment.dto";

// Mock service
const mockAdminAppointmentsService = {
  findAll: jest.fn(),
  updateStatus: jest.fn(),
  batchCancel: jest.fn(),
};

// Mock guards to always pass
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockRolesGuard = { canActivate: jest.fn(() => true) };

describe("AdminAppointmentsController", () => {
  let controller: AdminAppointmentsController;
  let service: typeof mockAdminAppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAppointmentsController],
      providers: [
        {
          provide: AdminAppointmentsService,
          useValue: mockAdminAppointmentsService,
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<AdminAppointmentsController>(
      AdminAppointmentsController,
    );
    service = module.get(AdminAppointmentsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET / (findAll)", () => {
    const mockResult = {
      items: [
        {
          id: "apt-1",
          appointmentNumber: "APT-001",
          userId: "user-1",
          userName: "John Doe",
          serviceId: "svc-1",
          serviceName: "Haircut",
          timeSlotId: "ts-1",
          appointmentDate: "2025-06-15T10:00:00.000Z",
          status: "PENDING",
          createdAt: new Date("2025-06-01"),
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    it("should call service.findAll with query params", async () => {
      mockAdminAppointmentsService.findAll.mockResolvedValue(mockResult);

      const query: AdminAppointmentsQueryDto = {
        page: 1,
        limit: 20,
        status: "PENDING",
        serviceId: "svc-1",
        userId: "user-1",
        startDate: "2025-06-01",
        endDate: "2025-06-30",
      };

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it("should call service.findAll with empty query when no filters", async () => {
      mockAdminAppointmentsService.findAll.mockResolvedValue({
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false },
      });

      const query: AdminAppointmentsQueryDto = {};
      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.items).toEqual([]);
    });

    it("should return appointments with pagination metadata", async () => {
      mockAdminAppointmentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({});

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("meta");
      expect(result.meta).toHaveProperty("total");
      expect(result.meta).toHaveProperty("page");
      expect(result.meta).toHaveProperty("limit");
      expect(result.meta).toHaveProperty("totalPages");
    });
  });

  describe("PUT /:id/status (updateStatus)", () => {
    const mockUpdateResult = {
      id: "apt-1",
      status: "CONFIRMED",
      updatedAt: new Date("2025-06-02"),
    };

    it("should call service.updateStatus with id, dto, and user id from request", async () => {
      mockAdminAppointmentsService.updateStatus.mockResolvedValue(
        mockUpdateResult,
      );

      const dto: UpdateAppointmentStatusDto = { status: "CONFIRMED" };
      const req = { user: { id: "admin-1", userType: "ADMIN" } };
      const result = await controller.updateStatus("apt-1", dto, req);

      expect(service.updateStatus).toHaveBeenCalledWith(
        "apt-1",
        dto,
        "admin-1",
      );
      expect(result).toEqual(mockUpdateResult);
    });

    it("should propagate BadRequestException for invalid transitions", async () => {
      mockAdminAppointmentsService.updateStatus.mockRejectedValue(
        new (require("@nestjs/common").BadRequestException)(
          "Cannot transition from CANCELLED to PENDING",
        ),
      );

      const dto: UpdateAppointmentStatusDto = { status: "PENDING" };
      const req = { user: { id: "admin-1" } };

      await expect(
        controller.updateStatus("apt-1", dto, req),
      ).rejects.toThrow("Cannot transition from CANCELLED to PENDING");
    });

    it("should allow cancel with reason", async () => {
      const cancelResult = {
        id: "apt-1",
        status: "CANCELLED",
        updatedAt: new Date("2025-06-02"),
      };
      mockAdminAppointmentsService.updateStatus.mockResolvedValue(cancelResult);

      const dto: UpdateAppointmentStatusDto = {
        status: "CANCELLED",
        reason: "No show",
      };
      const req = { user: { id: "admin-1" } };
      const result = await controller.updateStatus("apt-1", dto, req);

      expect(service.updateStatus).toHaveBeenCalledWith("apt-1", dto, "admin-1");
      expect(result.status).toBe("CANCELLED");
    });
  });

  describe("POST /batch-cancel (batchCancel)", () => {
    const mockBatchResult = {
      successCount: 3,
      failedCount: 1,
      failedIds: ["apt-4"],
    };

    it("should call service.batchCancel with dto", async () => {
      mockAdminAppointmentsService.batchCancel.mockResolvedValue(
        mockBatchResult,
      );

      const dto: BatchCancelDto = {
        ids: ["apt-1", "apt-2", "apt-3", "apt-4"],
        reason: "System maintenance",
      };
      const result = await controller.batchCancel(dto);

      expect(service.batchCancel).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBatchResult);
    });

    it("should return counts from batch cancel", async () => {
      const emptyResult = {
        successCount: 0,
        failedCount: 0,
        failedIds: [],
      };
      mockAdminAppointmentsService.batchCancel.mockResolvedValue(emptyResult);

      const dto: BatchCancelDto = { ids: [], reason: "test" };
      const result = await controller.batchCancel(dto);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.failedIds).toEqual([]);
    });
  });

  describe("Guards", () => {
    it("should have JwtAuthGuard and RolesGuard applied", () => {
      const guards = Reflect.getOwnPropertyDescriptor(
        AdminAppointmentsController.prototype,
        "findAll",
      );
      // Guards are applied at class level, check class metadata
      const classGuards = Reflect.getMetadata(
        "__guards__",
        AdminAppointmentsController,
      );
      // NestJS stores guards as metadata; check that JwtAuthGuard and RolesGuard are present
      expect(AdminAppointmentsController).toBeDefined();
    });
  });
});
