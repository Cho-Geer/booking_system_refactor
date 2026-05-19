import { TestBed } from '@angular/core/testing';
import { AdminStore } from './admin.store';
import { AdminService } from '../services/admin.service';
import {
  AdminStats,
  AdminUser,
  StatCard,
  AdminServiceItem,
  AdminAppointment,
  AdminUsersQuery,
  AdminServicesQuery,
  AdminAppointmentsQuery,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  CreateAdminServiceRequest,
  UpdateAdminServiceRequest,
  UpdateAppointmentStatusRequest,
  BatchCancelRequest,
  PaginatedResponse,
  TimeDistributionItem,
  SystemHealth,
} from '../dto/admin.dto';
import { of, throwError, delay } from 'rxjs';

describe('AdminStore', () => {
  let store: InstanceType<typeof AdminStore>;
  let adminServiceMock: jest.Mocked<AdminService>;

  beforeEach(() => {
    adminServiceMock = {
      getStats: jest.fn(),
      getUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn(),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
      getSystemStatus: jest.fn(),
      getTimeDistribution: jest.fn(),
      getBookingTrend: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    TestBed.configureTestingModule({
      providers: [AdminStore, { provide: AdminService, useValue: adminServiceMock }],
    });
    store = TestBed.inject(AdminStore);
  });

  // ==========================================
  // Initial State
  // ==========================================

  it('should initialize with default state', () => {
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.stats()).toBeNull();
    expect(store.users()).toEqual([]);
    expect(store.usersTotal()).toBe(0);
    expect(store.usersPage()).toBe(1);
    expect(store.services()).toEqual([]);
    expect(store.servicesTotal()).toBe(0);
    expect(store.servicesPage()).toBe(1);
    expect(store.appointments()).toEqual([]);
    expect(store.appointmentsTotal()).toBe(0);
    expect(store.appointmentsPage()).toBe(1);
  });

  // ==========================================
  // Stats
  // ==========================================

  it('should set stats', () => {
    const sc = (v: number, ch = 0, pos = true, tg = 1000, pp = 0): StatCard => ({
      value: v,
      changePercentage: ch,
      isPositive: pos,
      target: tg,
      progressPercentage: pp,
    });
    const mockStats: AdminStats = {
      totalBookings: sc(100),
      todayBookings: sc(10),
      pendingBookings: sc(5),
      activeUsers: sc(50),
      totalRevenue: sc(5000),
      bookingTrend: [{ date: '2026-04-24', count: 5, revenue: 250 }],
      servicePopularity: [{ serviceName: 'Haircut', count: 20, percentage: 100 }],
      timeDistribution: [{ hour: '09:00', count: 8 }],
    };

    store.setStats(mockStats);
    expect(store.stats()).toEqual(mockStats);
  });

  // ==========================================
  // Users
  // ==========================================

  it('should set users with pagination', () => {
    const users: AdminUser[] = [
      {
        id: '1',
        name: 'Alice',
        email: 'al***@test.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    store.setUsers(users, 10, 1);
    expect(store.users()).toEqual(users);
    expect(store.usersTotal()).toBe(10);
    expect(store.usersPage()).toBe(1);
  });

  it('should update user in list after successful update', () => {
    const user1: AdminUser = {
      id: '1',
      name: 'Alice',
      email: 'al***@test.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const user2: AdminUser = {
      id: '2',
      name: 'Bob',
      email: 'bo***@test.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    store.setUsers([user1, user2], 2, 1);
    store.updateUserInList('1', { name: 'Alice Updated', role: 'ADMIN' });

    expect(store.users()[0].name).toBe('Alice Updated');
    expect(store.users()[0].role).toBe('ADMIN');
    expect(store.users().length).toBe(2);
  });

  it('should remove user from list after deletion', () => {
    const user1: AdminUser = {
      id: '1',
      name: 'Alice',
      email: 'al***@test.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const user2: AdminUser = {
      id: '2',
      name: 'Bob',
      email: 'bo***@test.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    store.setUsers([user1, user2], 2, 1);
    store.removeUserFromList('1');

    expect(store.users().length).toBe(1);
    expect(store.users()[0].id).toBe('2');
  });

  // ==========================================
  // Services
  // ==========================================

  it('should set services with pagination', () => {
    const services: AdminServiceItem[] = [
      {
        id: '1',
        name: 'Haircut',
        description: 'Cut',
        duration: 30,
        price: 25,
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    store.setServices(services, 5, 1);
    expect(store.services()).toEqual(services);
    expect(store.servicesTotal()).toBe(5);
    expect(store.servicesPage()).toBe(1);
  });

  it('should update service in list', () => {
    const svc: AdminServiceItem = {
      id: '1',
      name: 'Haircut',
      description: 'Cut',
      duration: 30,
      price: 25,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    store.setServices([svc], 1, 1);

    store.updateServiceInList('1', { name: 'Haircut Deluxe', price: 40 });
    expect(store.services()[0].name).toBe('Haircut Deluxe');
    expect(store.services()[0].price).toBe(40);
  });

  it('should remove service from list after deletion', () => {
    const svc: AdminServiceItem = {
      id: '1',
      name: 'Haircut',
      description: 'Cut',
      duration: 30,
      price: 25,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    store.setServices([svc], 1, 1);
    store.removeServiceFromList('1');
    expect(store.services().length).toBe(0);
  });

  // ==========================================
  // Appointments
  // ==========================================

  it('should set appointments with pagination', () => {
    const appointments: AdminAppointment[] = [
      {
        id: '1',
        appointmentNumber: 'APT-001',
        userId: 'u1',
        userName: 'Alice',
        serviceId: 'svc1',
        serviceName: 'Haircut',
        timeSlotId: 'ts1',
        appointmentDate: '2026-04-30T14:00:00Z',
        status: 'PENDING',
        createdAt: '2026-04-28T10:00:00Z',
      },
    ];

    store.setAppointments(appointments, 1, 1);
    expect(store.appointments()).toEqual(appointments);
    expect(store.appointmentsTotal()).toBe(1);
  });

  it('should update appointment status in list', () => {
    const appt: AdminAppointment = {
      id: '1',
      appointmentNumber: 'APT-001',
      userId: 'u1',
      userName: 'Alice',
      serviceId: 'svc1',
      serviceName: 'Haircut',
      timeSlotId: 'ts1',
      appointmentDate: '2026-04-30T14:00:00Z',
      status: 'PENDING',
      createdAt: '2026-04-28T10:00:00Z',
    };

    store.setAppointments([appt], 1, 1);
    store.updateAppointmentStatusInList('1', 'CONFIRMED');

    expect(store.appointments()[0].status).toBe('CONFIRMED');
  });

  it('should remove multiple appointments from list after batch cancel', () => {
    const appt1: AdminAppointment = {
      id: '1',
      appointmentNumber: 'APT-001',
      userId: 'u1',
      userName: 'Alice',
      serviceId: 'svc1',
      serviceName: 'Haircut',
      timeSlotId: 'ts1',
      appointmentDate: '2026-04-30T14:00:00Z',
      status: 'PENDING',
      createdAt: '2026-04-28T10:00:00Z',
    };
    const appt2: AdminAppointment = {
      id: '2',
      appointmentNumber: 'APT-002',
      userId: 'u2',
      userName: 'Bob',
      serviceId: 'svc1',
      serviceName: 'Haircut',
      timeSlotId: 'ts2',
      appointmentDate: '2026-04-30T15:00:00Z',
      status: 'PENDING',
      createdAt: '2026-04-28T10:00:00Z',
    };

    store.setAppointments([appt1, appt2], 2, 1);
    store.removeAppointmentsFromList(['1', '2']);
    expect(store.appointments().length).toBe(0);
  });

  // ==========================================
  // Loading & Error
  // ==========================================

  it('should set loading state', () => {
    store.setLoading(true);
    expect(store.isLoading()).toBe(true);
    store.setLoading(false);
    expect(store.isLoading()).toBe(false);
  });

  it('should set error state', () => {
    store.setError('Something went wrong');
    expect(store.error()).toBe('Something went wrong');
  });

  it('should clear error', () => {
    store.setError('Error');
    store.clearError();
    expect(store.error()).toBeNull();
  });

  // ==========================================
  // RED PHASE: Wire AdminStore to real API calls
  // ==========================================

  describe('[RED] loadStats()', () => {
    it('[RED] should fail: loadStats is not yet defined', () => {
      expect(store.loadStats).toBeDefined();
    });

    it('[RED] should fail: should call adminService.getStats and store stats', async () => {
      const sc = (v: number, ch = 0, pos = true, tg = 1000, pp = 0): StatCard => ({
        value: v,
        changePercentage: ch,
        isPositive: pos,
        target: tg,
        progressPercentage: pp,
      });
      const mockStats: AdminStats = {
        totalBookings: sc(100),
        todayBookings: sc(10),
        pendingBookings: sc(5),
        activeUsers: sc(50),
        totalRevenue: sc(5000),
        bookingTrend: [],
        servicePopularity: [],
        timeDistribution: [],
      };
      adminServiceMock.getStats.mockReturnValue(of(mockStats));

      await store.loadStats();

      expect(adminServiceMock.getStats).toHaveBeenCalled();
      expect(store.stats()).toEqual(mockStats);
    });

    it('[RED] should fail: should handle API error', async () => {
      adminServiceMock.getStats.mockReturnValue(throwError(() => new Error('Stats fetch failed')));

      await store.loadStats();

      expect(store.error()).toBe('Stats fetch failed');
    });
  });

  describe('[RED] loadUsers()', () => {
    it('[RED] should fail: loadUsers is not yet defined', () => {
      expect(store.loadUsers).toBeDefined();
    });

    it('[RED] should fail: should call adminService.getUsers with query', async () => {
      const mockResponse: PaginatedResponse<AdminUser> = {
        items: [
          {
            id: '1',
            name: 'Alice',
            email: 'al***@test.com',
            role: 'CUSTOMER',
            status: 'ACTIVE',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      adminServiceMock.getUsers.mockReturnValue(of(mockResponse));

      await store.loadUsers({ page: 1, limit: 20 });

      expect(adminServiceMock.getUsers).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(store.users()).toEqual(mockResponse.items);
      expect(store.usersTotal()).toBe(1);
      expect(store.usersPage()).toBe(1);
    });
  });

  describe('[RED] createUser()', () => {
    const createDto: CreateAdminUserRequest = {
      name: 'New User',
      email: 'new@test.com',
      role: 'CUSTOMER',
      password: 'pass123',
    };

    it('[RED] should fail: createUser is not yet defined', () => {
      expect(store.createUser).toBeDefined();
    });

    it('[RED] should fail: should call adminService.createUser and add to list', async () => {
      const createdUser: AdminUser = {
        id: 'new-1',
        name: 'New User',
        email: 'new@test.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: '2026-05-01T00:00:00Z',
      };
      adminServiceMock.createUser.mockReturnValue(of(createdUser));

      await store.createUser(createDto);

      expect(adminServiceMock.createUser).toHaveBeenCalledWith(createDto);
      expect(store.users()).toContainEqual(createdUser);
      expect(store.usersTotal()).toBe(1);
    });
  });

  describe('[RED] updateUser()', () => {
    it('[RED] should fail: updateUser is not yet defined', () => {
      expect(store.updateUser).toBeDefined();
    });

    it('[RED] should fail: should call adminService.updateUser and update in list', async () => {
      const existing: AdminUser = {
        id: '1',
        name: 'Alice',
        email: 'al***@test.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
      };
      adminServiceMock.getUsers.mockReturnValue(
        of({ items: [existing], total: 1, page: 1, limit: 20 }),
      );
      await store.loadUsers({});

      const updates: UpdateAdminUserRequest = { name: 'Alice Updated', role: 'ADMIN' };
      const updatedUser: AdminUser = {
        ...existing,
        ...updates,
        name: 'Alice Updated',
        role: 'ADMIN',
      };
      adminServiceMock.updateUser.mockReturnValue(of(updatedUser));

      await store.updateUser('1', updates);

      expect(adminServiceMock.updateUser).toHaveBeenCalledWith('1', updates);
    });
  });

  describe('[RED] deleteUser()', () => {
    it('[RED] should fail: deleteUser is not yet defined', () => {
      expect(store.deleteUser).toBeDefined();
    });

    it('[RED] should fail: should call adminService.deleteUser and remove from list', async () => {
      const existing: AdminUser = {
        id: '1',
        name: 'Alice',
        email: 'al***@test.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
      };
      adminServiceMock.getUsers.mockReturnValue(
        of({ items: [existing], total: 1, page: 1, limit: 20 }),
      );
      await store.loadUsers({});

      adminServiceMock.deleteUser.mockReturnValue(of(null));

      await store.deleteUser('1');

      expect(adminServiceMock.deleteUser).toHaveBeenCalledWith('1');
      expect(store.users().length).toBe(0);
      expect(store.usersTotal()).toBe(0);
    });
  });

  describe('[RED] loadAdminServices()', () => {
    it('[RED] should fail: loadAdminServices is not yet defined', () => {
      expect(store.loadAdminServices).toBeDefined();
    });

    it('[RED] should fail: should call adminService.getAdminServices with query', async () => {
      const mockResponse: PaginatedResponse<AdminServiceItem> = {
        items: [
          {
            id: '1',
            name: 'Haircut',
            description: 'Cut',
            duration: 30,
            price: 25,
            active: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      adminServiceMock.getAdminServices.mockReturnValue(of(mockResponse));

      await store.loadAdminServices({ page: 1 });

      expect(adminServiceMock.getAdminServices).toHaveBeenCalledWith({ page: 1 });
      expect(store.services()).toEqual(mockResponse.items);
      expect(store.servicesTotal()).toBe(1);
    });
  });

  describe('[RED] createAdminService()', () => {
    const createDto: CreateAdminServiceRequest = { name: 'New Service', duration: 45, price: 50 };

    it('[RED] should fail: createAdminService is not yet defined', () => {
      expect(store.createAdminService).toBeDefined();
    });

    it('[RED] should fail: should call adminService.createAdminService and add to list', async () => {
      const created: AdminServiceItem = {
        id: 'svc-new',
        name: 'New Service',
        description: '',
        duration: 45,
        price: 50,
        active: true,
        createdAt: '2026-05-01T00:00:00Z',
      };
      adminServiceMock.createAdminService.mockReturnValue(of(created));

      await store.createAdminService(createDto);

      expect(adminServiceMock.createAdminService).toHaveBeenCalledWith(createDto);
      expect(store.services()).toContainEqual(created);
    });
  });

  describe('[RED] updateAdminService()', () => {
    it('[RED] should fail: updateAdminService is not yet defined', () => {
      expect(store.updateAdminService).toBeDefined();
    });

    it('[RED] should fail: should call adminService.updateAdminService and update in list', async () => {
      const existing: AdminServiceItem = {
        id: '1',
        name: 'Haircut',
        description: 'Cut',
        duration: 30,
        price: 25,
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      };
      adminServiceMock.getAdminServices.mockReturnValue(
        of({ items: [existing], total: 1, page: 1, limit: 20 }),
      );
      await store.loadAdminServices({});

      const updates: UpdateAdminServiceRequest = { name: 'Haircut Deluxe', price: 40 };
      const updated: AdminServiceItem = { ...existing, ...updates };
      adminServiceMock.updateAdminService.mockReturnValue(of(updated));

      await store.updateAdminService('1', updates);

      expect(adminServiceMock.updateAdminService).toHaveBeenCalledWith('1', updates);
    });
  });

  describe('[RED] deleteAdminService()', () => {
    it('[RED] should fail: deleteAdminService is not yet defined', () => {
      expect(store.deleteAdminService).toBeDefined();
    });

    it('[RED] should fail: should call adminService.deleteAdminService and remove from list', async () => {
      const existing: AdminServiceItem = {
        id: '1',
        name: 'Haircut',
        description: 'Cut',
        duration: 30,
        price: 25,
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      };
      adminServiceMock.getAdminServices.mockReturnValue(
        of({ items: [existing], total: 1, page: 1, limit: 20 }),
      );
      await store.loadAdminServices({});

      adminServiceMock.deleteAdminService.mockReturnValue(of(null));

      await store.deleteAdminService('1');

      expect(adminServiceMock.deleteAdminService).toHaveBeenCalledWith('1');
      expect(store.services().length).toBe(0);
    });
  });

  describe('[RED] loadAdminAppointments()', () => {
    it('[RED] should fail: loadAdminAppointments is not yet defined', () => {
      expect(store.loadAdminAppointments).toBeDefined();
    });

    it('[RED] should fail: should call adminService.getAdminAppointments with query', async () => {
      const mockResponse: PaginatedResponse<AdminAppointment> = {
        items: [
          {
            id: '1',
            appointmentNumber: 'APT-001',
            userId: 'u1',
            userName: 'Alice',
            serviceId: 'svc1',
            serviceName: 'Haircut',
            timeSlotId: 'ts1',
            appointmentDate: '2026-04-30T14:00:00Z',
            status: 'PENDING',
            createdAt: '2026-04-28T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      adminServiceMock.getAdminAppointments.mockReturnValue(of(mockResponse));

      await store.loadAdminAppointments({ page: 1 });

      expect(adminServiceMock.getAdminAppointments).toHaveBeenCalledWith({ page: 1 });
      expect(store.appointments()).toEqual(mockResponse.items);
      expect(store.appointmentsTotal()).toBe(1);
    });
  });

  describe('[RED] updateAdminAppointmentStatus()', () => {
    it('[RED] should fail: updateAdminAppointmentStatus is not yet defined', () => {
      expect(store.updateAdminAppointmentStatus).toBeDefined();
    });

    it('[RED] should fail: should call adminService.updateAppointmentStatus and update in list', async () => {
      const appt: AdminAppointment = {
        id: '1',
        appointmentNumber: 'APT-001',
        userId: 'u1',
        userName: 'Alice',
        serviceId: 'svc1',
        serviceName: 'Haircut',
        timeSlotId: 'ts1',
        appointmentDate: '2026-04-30T14:00:00Z',
        status: 'PENDING',
        createdAt: '2026-04-28T10:00:00Z',
      };
      adminServiceMock.getAdminAppointments.mockReturnValue(
        of({ items: [appt], total: 1, page: 1, limit: 20 }),
      );
      await store.loadAdminAppointments({});

      const statusDto: UpdateAppointmentStatusRequest = {
        status: 'CONFIRMED',
        reason: 'Available',
      };
      adminServiceMock.updateAppointmentStatus.mockReturnValue(
        of({ id: '1', status: 'CONFIRMED', updatedAt: '2026-05-01T00:00:00Z' }),
      );

      await store.updateAdminAppointmentStatus('1', statusDto);

      expect(adminServiceMock.updateAppointmentStatus).toHaveBeenCalledWith('1', statusDto);
    });
  });

  describe('[RED] batchCancelAppointments()', () => {
    it('[RED] should fail: batchCancelAppointments is not yet defined', () => {
      expect(store.batchCancelAppointments).toBeDefined();
    });

    it('[RED] should fail: should call adminService.batchCancelAppointments and remove from list', async () => {
      const appt1: AdminAppointment = {
        id: '1',
        appointmentNumber: 'APT-001',
        userId: 'u1',
        userName: 'Alice',
        serviceId: 'svc1',
        serviceName: 'Haircut',
        timeSlotId: 'ts1',
        appointmentDate: '2026-04-30T14:00:00Z',
        status: 'PENDING',
        createdAt: '2026-04-28T10:00:00Z',
      };
      const appt2: AdminAppointment = {
        id: '2',
        appointmentNumber: 'APT-002',
        userId: 'u2',
        userName: 'Bob',
        serviceId: 'svc1',
        serviceName: 'Haircut',
        timeSlotId: 'ts2',
        appointmentDate: '2026-04-30T15:00:00Z',
        status: 'PENDING',
        createdAt: '2026-04-28T10:00:00Z',
      };
      adminServiceMock.getAdminAppointments.mockReturnValue(
        of({ items: [appt1, appt2], total: 2, page: 1, limit: 20 }),
      );
      await store.loadAdminAppointments({});

      const batchDto: BatchCancelRequest = { ids: ['1', '2'], reason: 'Overbooking' };
      adminServiceMock.batchCancelAppointments.mockReturnValue(
        of({ successCount: 2, failedCount: 0, failedIds: [] }),
      );

      await store.batchCancelAppointments(batchDto);

      expect(adminServiceMock.batchCancelAppointments).toHaveBeenCalledWith(batchDto);
      expect(store.appointments().length).toBe(0);
    });
  });

  // ==========================================
  // Phase 3: Time Distribution, Staff Workload, System Health
  // ==========================================

  describe('[RED] Initial state for Phase 3 fields', () => {
    it('[RED] should initialize timeDistribution as empty array', () => {
      expect(store.timeDistribution()).toEqual([]);
    });

    it('[RED] should initialize systemHealth as null', () => {
      expect(store.systemHealth()).toBeNull();
    });
  });

  describe('[RED] loadTimeDistribution()', () => {
    it('[RED] should fail: loadTimeDistribution is not yet defined', () => {
      expect(store.loadTimeDistribution).toBeDefined();
    });

    it('[RED] should fail: should call adminService.getTimeDistribution and store result', async () => {
      const mockData: TimeDistributionItem[] = [
        { hour: '09:00', count: 8 },
        { hour: '10:00', count: 12 },
      ];
      adminServiceMock.getTimeDistribution.mockReturnValue(of(mockData));

      await store.loadTimeDistribution();

      expect(adminServiceMock.getTimeDistribution).toHaveBeenCalled();
      expect(store.timeDistribution()).toEqual(mockData);
    });

    it('[RED] should fail: should handle API error', async () => {
      adminServiceMock.getTimeDistribution.mockReturnValue(
        throwError(() => new Error('Failed to load time distribution')),
      );

      await store.loadTimeDistribution();

      expect(store.error()).toBe('Failed to load time distribution');
    });
  });

  describe('[RED] loadSystemStatus()', () => {
    it('[RED] should fail: loadSystemStatus is not yet defined', () => {
      expect(store.loadSystemStatus).toBeDefined();
    });

    it('[RED] should fail: should call adminService.getSystemStatus and store result', async () => {
      const mockHealth: SystemHealth = {
        server: 'Online',
        database: 'Online',
        api: 'Online',
        lastBackup: '2026-05-06T02:15:00Z',
        uptime: '99.9%',
      };
      adminServiceMock.getSystemStatus.mockReturnValue(of(mockHealth));

      await store.loadSystemStatus();

      expect(adminServiceMock.getSystemStatus).toHaveBeenCalled();
      expect(store.systemHealth()).toEqual(mockHealth);
    });

    it('[RED] should fail: should handle API error', async () => {
      adminServiceMock.getSystemStatus.mockReturnValue(
        throwError(() => new Error('Health check failed')),
      );

      await store.loadSystemStatus();

      expect(store.error()).toBe('Health check failed');
    });
  });

  // ==========================================
  // [RED] BUG-1: Loaded flags for chart data isolation
  // These tests will fail until the loadedServicePopularity,
  // loadedBookingTrend, and loadedDistribution flags are added to the store.
  // ==========================================

  describe('[RED] BUG-1: loaded flags for chart data isolation', () => {
    it('[RED] should fail: loadedServicePopularity is initially false', () => {
      // This will fail because loadedServicePopularity signal doesn't exist yet
      expect(store.loadedServicePopularity()).toBe(false);
    });

    it('[RED] should fail: loadedBookingTrend is initially false', () => {
      expect(store.loadedBookingTrend()).toBe(false);
    });

    it('[RED] should fail: loadedDistribution is initially false', () => {
      expect(store.loadedDistribution()).toBe(false);
    });

    it('[RED] should fail: loadDistributionByTimeRange sets loadedServicePopularity and loadedDistribution to true on success', () => {
      adminServiceMock.getStats.mockReturnValue(
        of({
          servicePopularity: [{ serviceName: 'Haircut', count: 10, percentage: 100 }],
          timeDistribution: [{ hour: '09:00', count: 5 }],
        } as any),
      );

      store.loadDistributionByTimeRange({} as any);

      expect(store.loadedServicePopularity()).toBe(true);
      expect(store.loadedDistribution()).toBe(true);
    });

    it('[RED] should fail: loadDistributionByTimeRange with empty arrays still sets flags to true', () => {
      adminServiceMock.getStats.mockReturnValue(
        of({
          servicePopularity: [],
          timeDistribution: [],
        } as any),
      );

      store.loadDistributionByTimeRange({} as any);

      expect(store.loadedServicePopularity()).toBe(true);
      expect(store.loadedDistribution()).toBe(true);
      expect(store.servicePopularity()).toEqual([]);
      expect(store.timeDistribution()).toEqual([]);
    });

    it('[RED] should fail: loadBookingTrend sets loadedBookingTrend to true on success with empty data', async () => {
      adminServiceMock.getBookingTrend.mockReturnValue(of([]));

      await store.loadBookingTrend();

      expect(store.loadedBookingTrend()).toBe(true);
      expect(store.bookingTrend()).toEqual([]);
    });

    it('[RED] should fail: loadBookingTrend sets loadedBookingTrend to true on success with data', async () => {
      const bt = [{ date: '2026-05-01', count: 5, revenue: 250 }];
      adminServiceMock.getBookingTrend.mockReturnValue(of(bt));

      await store.loadBookingTrend();

      expect(store.loadedBookingTrend()).toBe(true);
      expect(store.bookingTrend()).toEqual(bt);
    });

    it('[RED] should fail: loadStats does NOT set loadedServicePopularity flag (stats is separate)', async () => {
      const sc = (v: number, ch = 0, pos = true, tg = 1000, pp = 0): StatCard => ({
        value: v,
        changePercentage: ch,
        isPositive: pos,
        target: tg,
        progressPercentage: pp,
      });
      const mockStats: AdminStats = {
        totalBookings: sc(100),
        todayBookings: sc(10),
        pendingBookings: sc(5),
        activeUsers: sc(50),
        totalRevenue: sc(5000),
        bookingTrend: [],
        servicePopularity: [{ serviceName: 'Haircut', count: 20, percentage: 100 }],
        timeDistribution: [{ hour: '09:00', count: 8 }],
      };
      adminServiceMock.getStats.mockReturnValue(of(mockStats));

      await store.loadStats();

      // loadStats sets stats, not the isolated chart fields, so loadedServicePopularity stays false
      expect(store.loadedServicePopularity()).toBe(false);
      expect(store.stats()).toEqual(mockStats);
    });
  });

  // ==========================================
  // [RED] BUG-2: Race condition — rxMethod + switchMap for rapid Time filter clicks
  // These tests will FAIL until loadDistributionByTimeRange uses rxMethod + switchMap.
  // ==========================================

  describe('[RED] BUG-2: rxMethod + switchMap prevents race condition on rapid Time filter clicks', () => {
    it('[RED] should fail: loadDistributionByTimeRange is a function', () => {
      expect(store.loadDistributionByTimeRange).toBeDefined();
      expect(typeof store.loadDistributionByTimeRange).toBe('function');
    });

    it('[RED] should fail: loadDistributionByTimeRange calls getStats and updates store on success', () => {
      const mockData = {
        servicePopularity: [{ serviceName: 'Haircut', count: 10, percentage: 100 }],
        timeDistribution: [{ hour: 9, count: 5 }],
      };
      adminServiceMock.getStats.mockReturnValue(of(mockData as any));

      store.loadDistributionByTimeRange({ timeRange: 'last30d' });

      expect(adminServiceMock.getStats).toHaveBeenCalledWith('last30d', undefined, undefined);
      expect(store.loadedServicePopularity()).toBe(true);
      expect(store.loadedDistribution()).toBe(true);
      expect(store.servicePopularity()).toEqual(mockData.servicePopularity);
      expect(store.timeDistribution()).toEqual(mockData.timeDistribution);
    });

    it('[RED] should fail: loadDistributionByTimeRange sets error on API failure', () => {
      adminServiceMock.getStats.mockReturnValue(throwError(() => new Error('API Error')));

      store.loadDistributionByTimeRange({ timeRange: 'last7d' });

      expect(store.error()).toBe('API Error');
    });

    it('[RED] should fail: rapid consecutive calls cancel previous in-flight request — only last call wins', () => {
      const slowData = {
        servicePopularity: [{ serviceName: 'Old Service', count: 5, percentage: 100 }],
        timeDistribution: [{ hour: 8, count: 3 }],
      };
      const fastData = {
        servicePopularity: [{ serviceName: 'New Service', count: 20, percentage: 100 }],
        timeDistribution: [{ hour: 14, count: 15 }],
      };

      // First call returns a slow observable (takes 100ms)
      adminServiceMock.getStats.mockReturnValueOnce(of(slowData).pipe(delay(100)));
      // Second call returns immediately
      adminServiceMock.getStats.mockReturnValueOnce(of(fastData));

      // Simulate rapid time filter switching
      store.loadDistributionByTimeRange({ timeRange: 'last7d' });
      store.loadDistributionByTimeRange({ timeRange: 'last30d' });

      // If rxMethod + switchMap works correctly:
      // 1. First call starts a slow observable that would complete in 100ms
      // 2. Second call triggers switchMap to unsubscribe from first observable (cancelling it)
      // 3. Second call's observable emits synchronously, patching store with fastData
      // Therefore the store should contain fastData, NOT slowData
      expect(store.servicePopularity()).toEqual(fastData.servicePopularity);
      expect(store.timeDistribution()).toEqual(fastData.timeDistribution);
    });

    it('[RED] should fail: rapid consecutive calls with identical params work correctly (same observable emitted twice)', () => {
      const data = {
        servicePopularity: [{ serviceName: 'Same Service', count: 10, percentage: 100 }],
        timeDistribution: [{ hour: 10, count: 8 }],
      };

      adminServiceMock.getStats.mockReturnValue(of(data as any));

      // Rapid identical calls should still work — last one wins with same data
      store.loadDistributionByTimeRange({ timeRange: 'thisMonth' });
      store.loadDistributionByTimeRange({ timeRange: 'thisMonth' });

      expect(store.servicePopularity()).toEqual(data.servicePopularity);
      expect(store.loadedServicePopularity()).toBe(true);
    });
  });
});
