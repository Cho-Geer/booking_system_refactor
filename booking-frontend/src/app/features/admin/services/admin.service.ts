import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../../core/services/api.service';
import {
  AdminStats,
  AdminUser,
  BookingTrendItem,
  AdminServiceItem,
  AdminAppointment,
  BusinessHoursDto,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  CreateAdminServiceRequest,
  UpdateAdminServiceRequest,
  UpdateAppointmentStatusRequest,
  BatchCancelRequest,
  BatchCancelResponse,
  CreateAdminAppointmentRequest,
  PaginatedResponse,
  AdminUsersQuery,
  AdminServicesQuery,
  AdminAppointmentsQuery,
  TimeDistributionItem,
  SystemHealth,
  SystemHealthDetail,
  ServicesSummary,
  TimeRange,
  NotificationList,
  UnreadCount,
  SendCreateUserCodeRequest,
  SendCodeResponse,
  MessageListResponse,
} from '../dto/admin.dto';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  // ==========================================
  // Stats
  // ==========================================

  getStats(timeRange?: TimeRange, startDate?: string, endDate?: string): Observable<AdminStats> {
    let params = new HttpParams();
    if (timeRange) params = params.set('timeRange', timeRange);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<AdminStats>>(`${this.apiUrl}/admin/stats`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
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

    return this.http.get<ApiResponse<PaginatedResponse<AdminUser>>>(`${this.apiUrl}/admin/users`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  createUser(dto: CreateAdminUserRequest): Observable<AdminUser> {
    return this.http.post<ApiResponse<AdminUser>>(`${this.apiUrl}/admin/users`, dto)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  updateUser(id: string, dto: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.http.put<ApiResponse<AdminUser>>(`${this.apiUrl}/admin/users/${id}`, dto)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  deleteUser(id: string): Observable<null> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/admin/users/${id}`)
      .pipe(map(response => response.data), catchError(this.handleError));
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
    if (query.category) params = params.set('category', query.category);

    return this.http.get<ApiResponse<PaginatedResponse<AdminServiceItem>>>(`${this.apiUrl}/admin/services`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  createAdminService(dto: CreateAdminServiceRequest): Observable<AdminServiceItem> {
    return this.http.post<ApiResponse<AdminServiceItem>>(`${this.apiUrl}/admin/services`, dto)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  updateAdminService(id: string, dto: UpdateAdminServiceRequest): Observable<AdminServiceItem> {
    return this.http.put<ApiResponse<AdminServiceItem>>(`${this.apiUrl}/admin/services/${id}`, dto)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  deleteAdminService(id: string): Observable<null> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/admin/services/${id}`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Appointments Admin CRUD
  // ==========================================

  getAdminAppointments(query: AdminAppointmentsQuery): Observable<PaginatedResponse<AdminAppointment>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.startDate) params = params.set('startDate', query.startDate);
    if (query.endDate) params = params.set('endDate', query.endDate);
    if (query.serviceId) params = params.set('serviceId', query.serviceId);
    if (query.userId) params = params.set('userId', query.userId);

    return this.http.get<ApiResponse<PaginatedResponse<AdminAppointment>>>(`${this.apiUrl}/admin/appointments`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  updateAppointmentStatus(id: string, dto: UpdateAppointmentStatusRequest): Observable<{ id: string; status: string; updatedAt: string }> {
    return this.http.put<ApiResponse<{ id: string; status: string; updatedAt: string }>>(
      `${this.apiUrl}/admin/appointments/${id}/status`, dto
    ).pipe(map(response => response.data), catchError(this.handleError));
  }

  batchCancelAppointments(dto: BatchCancelRequest): Observable<BatchCancelResponse> {
    return this.http.post<ApiResponse<BatchCancelResponse>>(`${this.apiUrl}/admin/appointments/batch-cancel`, dto)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  createAdminAppointment(dto: CreateAdminAppointmentRequest): Observable<AdminAppointment> {
    return this.http.post<ApiResponse<AdminAppointment>>(`${this.apiUrl}/admin/appointments`, dto)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Time Distribution
  // ==========================================

  getTimeDistribution(timeRange?: TimeRange, startDate?: string, endDate?: string): Observable<TimeDistributionItem[]> {
    let params = new HttpParams();
    if (timeRange) params = params.set('timeRange', timeRange);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<TimeDistributionItem[]>>(`${this.apiUrl}/admin/stats/time-distribution`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Booking Trends (DASH-002)
  // ==========================================

  getBookingTrend(timeRange?: TimeRange): Observable<BookingTrendItem[]> {
    let params = new HttpParams();
    if (timeRange) params = params.set('timeRange', timeRange);
    return this.http.get<ApiResponse<BookingTrendItem[]>>(`${this.apiUrl}/admin/stats/booking-trends`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // System Health
  // ==========================================

  getSystemStatus(): Observable<SystemHealth> {
    return this.http.get<ApiResponse<SystemHealth>>(`${this.apiUrl}/admin/system/health`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  getSystemMetrics(): Observable<SystemHealthDetail> {
    return this.http.get<ApiResponse<SystemHealthDetail>>(`${this.apiUrl}/admin/system/metrics`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Messages (MSG-001)
  // ==========================================

  getMessages(page: number = 1, limit: number = 20): Observable<MessageListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<MessageListResponse>>(`${this.apiUrl}/admin/messages`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  getMessageUnreadCount(): Observable<UnreadCount> {
    return this.http.get<ApiResponse<UnreadCount>>(`${this.apiUrl}/admin/messages/unread-count`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Notifications (SYS-002, SYS-003, MSG-004)
  // ==========================================

  getNotifications(page: number = 1, limit: number = 20, unreadOnly: boolean = false): Observable<NotificationList> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (unreadOnly) params = params.set('unread_only', 'true');
    return this.http.get<ApiResponse<NotificationList>>(`${this.apiUrl}/admin/notifications`, { params })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  markNotificationRead(id: string): Observable<null> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/admin/notifications/${id}/read`, {})
      .pipe(map(_response => null), catchError(this.handleError));
  }

  getUnreadCount(): Observable<UnreadCount> {
    return this.http.get<ApiResponse<UnreadCount>>(`${this.apiUrl}/admin/messages/unread-count`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Services Summary
  // ==========================================

  getServicesSummary(): Observable<ServicesSummary> {
    return this.http.get<ApiResponse<ServicesSummary>>(`${this.apiUrl}/admin/services/summary`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Business Hours
  // ==========================================

  getBusinessHours(): Observable<BusinessHoursDto> {
    return this.http.get<ApiResponse<BusinessHoursDto>>(`${this.apiUrl}/admin/settings/business-hours`)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Service Image Upload
  // ==========================================

  uploadServiceImage(id: string, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<ApiResponse<{ imageUrl: string }>>(`${this.apiUrl}/admin/services/${id}/image`, formData)
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  // ==========================================
  // Affected Appointments (service disable warning)
  // ==========================================

  getServiceAffectedAppointments(serviceId: string): Observable<{pendingCount: number; confirmedCount: number}> {
    return this.http.get<ApiResponse<{pendingCount: number; confirmedCount: number}>>(`${this.apiUrl}/admin/services/${serviceId}/affected-appointments`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ==========================================
  // Verification Code (T-ADMIN-VERIFY-005)
  // ==========================================

  sendCode(dto: SendCreateUserCodeRequest): Observable<SendCodeResponse> {
    return this.http.post<ApiResponse<SendCodeResponse>>(`${this.apiUrl}/admin/users/send-code`, dto)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ==========================================
  // Error Handler
  // ==========================================

  private handleError(error: unknown): Observable<never> {
    let message = 'An error occurred. Please try again.';
    if (error instanceof HttpErrorResponse) {
      message = error.error?.message || `HTTP ${error.status}: ${error.statusText}`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return throwError(() => new Error(message));
  }
}
