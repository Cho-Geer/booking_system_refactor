import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  AdminUsersQuery,
  AdminServicesQuery,
  AdminAppointmentsQuery,
} from '../dto/admin.dto';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  // ==========================================
  // Stats
  // ==========================================

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/admin/stats`)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // Users CRUD
  // ==========================================

  getUsers(query: AdminUsersQuery): Observable<PaginatedResponse<AdminUser>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.search) params = params.set('search', query.search);
    if (query.role) params = params.set('role', query.role);
    if (query.status) params = params.set('status', query.status);

    return this.http.get<PaginatedResponse<AdminUser>>(`${this.apiUrl}/admin/users`, { params })
      .pipe(catchError(this.handleError));
  }

  createUser(dto: CreateAdminUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.apiUrl}/admin/users`, dto)
      .pipe(catchError(this.handleError));
  }

  updateUser(id: string, dto: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/admin/users/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  deleteUser(id: string): Observable<null> {
    return this.http.delete<null>(`${this.apiUrl}/admin/users/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // Services Admin CRUD
  // ==========================================

  getAdminServices(query: AdminServicesQuery): Observable<PaginatedResponse<AdminServiceItem>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.search) params = params.set('search', query.search);
    if (query.active !== undefined) params = params.set('active', query.active.toString());

    return this.http.get<PaginatedResponse<AdminServiceItem>>(`${this.apiUrl}/admin/services`, { params })
      .pipe(catchError(this.handleError));
  }

  createAdminService(dto: CreateAdminServiceRequest): Observable<AdminServiceItem> {
    return this.http.post<AdminServiceItem>(`${this.apiUrl}/admin/services`, dto)
      .pipe(catchError(this.handleError));
  }

  updateAdminService(id: string, dto: UpdateAdminServiceRequest): Observable<AdminServiceItem> {
    return this.http.put<AdminServiceItem>(`${this.apiUrl}/admin/services/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  deleteAdminService(id: string): Observable<null> {
    return this.http.delete<null>(`${this.apiUrl}/admin/services/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // Appointments Admin CRUD
  // ==========================================

  getAdminAppointments(query: AdminAppointmentsQuery): Observable<PaginatedResponse<AdminAppointment>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.status) params = params.set('status', query.status);
    if (query.startDate) params = params.set('startDate', query.startDate);
    if (query.endDate) params = params.set('endDate', query.endDate);
    if (query.serviceId) params = params.set('serviceId', query.serviceId);
    if (query.userId) params = params.set('userId', query.userId);

    return this.http.get<PaginatedResponse<AdminAppointment>>(`${this.apiUrl}/admin/appointments`, { params })
      .pipe(catchError(this.handleError));
  }

  updateAppointmentStatus(id: string, dto: UpdateAppointmentStatusRequest): Observable<{ id: string; status: string; updatedAt: string }> {
    return this.http.put<{ id: string; status: string; updatedAt: string }>(
      `${this.apiUrl}/admin/appointments/${id}/status`, dto
    ).pipe(catchError(this.handleError));
  }

  batchCancelAppointments(dto: BatchCancelRequest): Observable<BatchCancelResponse> {
    return this.http.post<BatchCancelResponse>(`${this.apiUrl}/admin/appointments/batch-cancel`, dto)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // Error Handler
  // ==========================================

  private handleError(error: unknown): Observable<never> {
    let message = 'An error occurred. Please try again.';
    if (error instanceof Error) {
      message = error.message;
    }
    return throwError(() => new Error(message));
  }
}
