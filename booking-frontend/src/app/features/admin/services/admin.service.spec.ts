import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import {
  AdminStats,
  AdminUser,
  AdminServiceItem,
  AdminAppointment,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  CreateAdminServiceRequest,
  UpdateAdminServiceRequest,
  UpdateAppointmentStatusRequest,
  BatchCancelRequest,
  BatchCancelResponse,
  PaginatedResponse,
} from '../dto/admin.dto';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ==========================================
  // Stats
  // ==========================================

  describe('getStats()', () => {
    it('[RED] should fetch admin stats from GET /v1/admin/stats', () => {
      const mockStats: AdminStats = {
        totalBookings: 150,
        todayBookings: 12,
        activeUsers: 45,
        totalRevenue: 12500.50,
        bookingTrend: [
          { date: '2026-04-24', count: 5 },
          { date: '2026-04-25', count: 8 },
        ],
        servicePopularity: [
          { serviceName: 'Haircut', count: 30 },
          { serviceName: 'Massage', count: 20 },
        ],
      };

      service.getStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });

    it('[RED] should handle error when fetching stats', () => {
      service.getStats().subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/stats`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  // ==========================================
  // Users
  // ==========================================

  describe('getUsers()', () => {
    it('[RED] should fetch paginated users from GET /v1/admin/users', () => {
      const mockResponse: PaginatedResponse<AdminUser> = {
        items: [
          { id: '1', name: 'Alice', email: 'al***@example.com', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-01-15T10:00:00Z' },
          { id: '2', name: 'Bob', email: 'bo***@example.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-02-20T10:00:00Z' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      service.getUsers({ page: 1, limit: 10 }).subscribe(response => {
        expect(response.items.length).toBe(2);
        expect(response.total).toBe(2);
        expect(response.items[0].name).toBe('Alice');
      });

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/admin/users`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });

    it('[RED] should include search and role params in query', () => {
      service.getUsers({ page: 1, limit: 10, search: 'alice', role: 'CUSTOMER' }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/admin/users`);
      expect(req.request.params.get('search')).toBe('alice');
      expect(req.request.params.get('role')).toBe('CUSTOMER');
      req.flush({ items: [], total: 0, page: 1, limit: 10 });
    });
  });

  describe('createUser()', () => {
    it('[RED] should create user via POST /v1/admin/users', () => {
      const dto: CreateAdminUserRequest = {
        name: 'Charlie',
        email: 'charlie@example.com',
        role: 'CUSTOMER',
        password: 'password123',
      };

      service.createUser(dto).subscribe(user => {
        expect(user.name).toBe('Charlie');
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: '3', name: 'Charlie', email: 'ch***@example.com', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-04-30T10:00:00Z' });
    });
  });

  describe('updateUser()', () => {
    it('[RED] should update user via PUT /v1/admin/users/:id', () => {
      const dto: UpdateAdminUserRequest = { name: 'Alice Updated', role: 'ADMIN' };

      service.updateUser('1', dto).subscribe(user => {
        expect(user.name).toBe('Alice Updated');
        expect(user.role).toBe('ADMIN');
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/users/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: '1', name: 'Alice Updated', role: 'ADMIN', status: 'ACTIVE', updatedAt: '2026-04-30T10:00:00Z' });
    });
  });

  describe('deleteUser()', () => {
    it('[RED] should delete user via DELETE /v1/admin/users/:id', () => {
      service.deleteUser('1').subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/users/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  // ==========================================
  // Services Admin
  // ==========================================

  describe('getAdminServices()', () => {
    it('[RED] should fetch paginated admin services from GET /v1/admin/services', () => {
      const mockResponse: PaginatedResponse<AdminServiceItem> = {
        items: [
          { id: '1', name: 'Haircut', description: 'Standard haircut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T10:00:00Z' },
          { id: '2', name: 'Massage', description: 'Full body massage', duration: 60, price: 80, active: true, createdAt: '2026-01-01T10:00:00Z' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      service.getAdminServices({ page: 1, limit: 10 }).subscribe(response => {
        expect(response.items.length).toBe(2);
        expect(response.items[0].name).toBe('Haircut');
      });

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/admin/services`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createAdminService()', () => {
    it('[RED] should create service via POST /v1/admin/services', () => {
      const dto: CreateAdminServiceRequest = {
        name: 'New Service',
        description: 'Brand new service',
        duration: 45,
        price: 50,
      };

      service.createAdminService(dto).subscribe(item => {
        expect(item.name).toBe('New Service');
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/services`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: '3', name: 'New Service', description: 'Brand new service', duration: 45, price: 50, active: true, createdAt: '2026-04-30T10:00:00Z' });
    });
  });

  describe('updateAdminService()', () => {
    it('[RED] should update service via PUT /v1/admin/services/:id', () => {
      const dto: UpdateAdminServiceRequest = { name: 'Updated Service', price: 60 };

      service.updateAdminService('1', dto).subscribe(item => {
        expect(item.name).toBe('Updated Service');
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/services/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: '1', name: 'Updated Service', duration: 30, price: 60, active: true, updatedAt: '2026-04-30T10:00:00Z' });
    });
  });

  describe('deleteAdminService()', () => {
    it('[RED] should delete service via DELETE /v1/admin/services/:id', () => {
      service.deleteAdminService('1').subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/services/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  // ==========================================
  // Appointments Admin
  // ==========================================

  describe('getAdminAppointments()', () => {
    it('[RED] should fetch paginated admin appointments from GET /v1/admin/appointments', () => {
      const mockResponse: PaginatedResponse<AdminAppointment> = {
        items: [
          {
            id: '1', appointmentNumber: 'APT-001', userId: 'u1', userName: 'Alice',
            serviceId: 'svc1', serviceName: 'Haircut', timeSlotId: 'ts1',
            appointmentDate: '2026-04-30T14:00:00Z', status: 'PENDING', createdAt: '2026-04-28T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      service.getAdminAppointments({ page: 1, limit: 10 }).subscribe(response => {
        expect(response.items.length).toBe(1);
        expect(response.items[0].userName).toBe('Alice');
      });

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/admin/appointments`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('updateAppointmentStatus()', () => {
    it('[RED] should update appointment status via PUT /v1/admin/appointments/:id/status', () => {
      const dto: UpdateAppointmentStatusRequest = { status: 'CONFIRMED', reason: 'Confirmed by admin' };

      service.updateAppointmentStatus('1', dto).subscribe(response => {
        expect(response.status).toBe('CONFIRMED');
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/appointments/1/status`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ id: '1', status: 'CONFIRMED', updatedAt: '2026-04-30T10:00:00Z' });
    });
  });

  describe('batchCancelAppointments()', () => {
    it('[RED] should batch cancel appointments via POST /v1/admin/appointments/batch-cancel', () => {
      const dto: BatchCancelRequest = { ids: ['1', '2'], reason: 'Admin bulk cancellation' };

      service.batchCancelAppointments(dto).subscribe(response => {
        expect(response.successCount).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/appointments/batch-cancel`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ successCount: 2, failedCount: 0, failedIds: [] });
    });
  });

  // ==========================================
  // Error Handling
  // ==========================================

  describe('error handling', () => {
    it('[RED] should handle network errors gracefully', () => {
      service.getStats().subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/admin/stats`);
      req.error(new ProgressEvent('Network error'));
    });
  });
});
