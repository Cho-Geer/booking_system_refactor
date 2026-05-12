import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ContactType,
  RegisterSendCodeDto,
  RegisterCompleteDto,
  LoginSendCodeDto,
  LoginVerifyCodeDto,
  LoginPasswordDto,
  AuthResponseDto,
  RegisterSendCodeResponse,
  LoginSendCodeResponse,
  ResetPasswordSendCodeDto,
  ResetPasswordSendCodeResponse,
  ResetPasswordVerifyDto,
  LogoutResponse,
} from '../../features/auth/dto/auth.dto';
import { Service, TimeSlot, ReservationResponse, BookingListItem } from '../../shared/dto';

/**
 * Standard API response envelope as produced by the backend ResponseInterceptor.
 * All backend responses (both GET and POST/DELETE) are wrapped in this format.
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

/** Metadata for paginated API responses */
export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Paginated response data wrapper for endpoints returning lists */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

// Re-export DTOs for backward compatibility
export type {
  ContactType,
  RegisterSendCodeDto,
  RegisterCompleteDto,
  LoginSendCodeDto,
  LoginVerifyCodeDto,
  LoginPasswordDto,
  AuthResponseDto,
  ResetPasswordSendCodeDto,
  ResetPasswordSendCodeResponse,
  ResetPasswordVerifyDto,
  Service,
  TimeSlot,
  ReservationResponse,
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  // ==========================================
  // Auth endpoints (PII Encryption - Scheme C v4)
  // ==========================================

  /**
   * Register Step 1: Send verification code
   * POST /v1/auth/register/send-code
   */
  registerSendCode(dto: RegisterSendCodeDto): Observable<RegisterSendCodeResponse> {
    return this.http
      .post<ApiResponse<RegisterSendCodeResponse>>(`${this.apiUrl}/auth/register/send-code`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Register Step 2: Complete registration
   * POST /v1/auth/register/complete
   */
  registerComplete(dto: RegisterCompleteDto): Observable<AuthResponseDto> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/auth/register/complete`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Code Login Step 1: Send verification code
   * POST /v1/auth/login/send-code
   */
  loginSendCode(dto: LoginSendCodeDto): Observable<LoginSendCodeResponse> {
    return this.http
      .post<ApiResponse<LoginSendCodeResponse>>(`${this.apiUrl}/auth/login/send-code`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Code Login Step 2: Verify code and login
   * POST /v1/auth/login/verify-code
   */
  loginVerifyCode(dto: LoginVerifyCodeDto): Observable<AuthResponseDto> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/auth/login/verify-code`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Password login
   * POST /v1/auth/login/password
   */
  loginPassword(dto: LoginPasswordDto): Observable<AuthResponseDto> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/auth/login/password`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Refresh access token
   * POST /v1/auth/refresh
   * refreshToken is transmitted via HttpOnly cookie, not in request body
   */
  refreshToken(): Observable<AuthResponseDto> {
    return this.http
      .post<ApiResponse<AuthResponseDto>>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Reset Password Step 1: Send verification code
   * POST /v1/auth/reset-password/send-code
   */
  resetPasswordSendCode(dto: ResetPasswordSendCodeDto): Observable<ResetPasswordSendCodeResponse> {
    return this.http
      .post<ApiResponse<ResetPasswordSendCodeResponse>>(`${this.apiUrl}/auth/reset-password/send-code`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Reset Password Step 2: Verify code and reset password
   * POST /v1/auth/reset-password/verify
   */
  resetPasswordVerify(dto: ResetPasswordVerifyDto): Observable<{ message: string }> {
    return this.http
      .post<ApiResponse<{ message: string }>>(`${this.apiUrl}/auth/reset-password/verify`, dto, { withCredentials: true })
      .pipe(map(response => response.data), catchError(this.handleError));
  }

  /**
   * Logout (notify backend to blacklist token)
   * POST /v1/auth/logout
   */
  logout(): Observable<LogoutResponse> {
    return this.http
      .post<LogoutResponse>(`${this.apiUrl}/auth/logout`, {})
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // Service endpoints
  // ==========================================

  getServices(): Observable<Service[]> {
    return this.http
      .get<ApiResponse<PaginatedResponse<Service>>>(`${this.apiUrl}/services`)
      .pipe(
        map(response => response.data.items),
        catchError(this.handleError)
      );
  }

  // ==========================================
  // Booking endpoints
  // ==========================================

  /**
   * Create a new appointment via POST /v1/appointments
   * Maps to CreateAppointmentDto on the backend
   */
  createAppointment(dto: {
    timeSlotId: string;
    serviceId: string;
    appointmentDate: string;
    preferredSequence: number;
    customerInfo?: Record<string, unknown>;
    notes?: string;
    overtimeMinutes?: number;
  }): Observable<ReservationResponse> {
    return this.http
      .post<ReservationResponse>(`${this.apiUrl}/appointments`, dto)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get user's appointments list
   * GET /v1/appointments
   */
  getMyAppointments(query?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Observable<BookingListItem[]> {
    let params = new HttpParams();
    if (query?.startDate) params = params.set('startDate', query.startDate);
    if (query?.endDate) params = params.set('endDate', query.endDate);
    if (query?.status) params = params.set('status', query.status);

    return this.http
      .get<ApiResponse<PaginatedResponse<BookingListItem>>>(`${this.apiUrl}/appointments`, { params })
      .pipe(
        map(response => response.data.items),
        catchError(this.handleError)
      );
  }

  getAvailableSlots(serviceId: string, startDate?: string, endDate?: string, overtimeMinutes?: number): Observable<TimeSlot[]> {
    let params = new HttpParams().set('serviceId', serviceId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (overtimeMinutes !== undefined) params = params.set('overtimeMinutes', overtimeMinutes.toString());
    return this.http
      .get<ApiResponse<TimeSlot[]>>(`${this.apiUrl}/time-slots/available`, { params })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  reserveSlot(
    slotId: string,
    preferSeq: number,
    idempotencyKey?: string
  ): Observable<ReservationResponse> {
    const headers = idempotencyKey
      ? { 'X-Idempotency-Key': idempotencyKey }
      : undefined;
    return this.http
      .post<ReservationResponse>(`${this.apiUrl}/slots/${slotId}/reserve`, {
        preferSeq,
      }, { headers })
      .pipe(catchError(this.handleError));
  }

  cancelBooking(bookingId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/appointments/${bookingId}`)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // User endpoints
  // ==========================================

  /**
   * Get current user profile (call after login/registration)
   * GET /v1/users/profile
   */
  getUserProfile(): Observable<{
    id: string;
    name: string;
    email?: string; // masked value like "us***@example.com"
    phone?: string; // masked value like "138****5678"
    userType: string;
    createdAt: string;
  }> {
    return this.http
      .get<ApiResponse<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
        userType: string;
        createdAt: string;
      }>>(`${this.apiUrl}/users/profile`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Update user profile
   * PUT /v1/users/profile
   */
  updateProfile(dto: { name?: string }): Observable<{ user: { id: string; name: string; email?: string; phone?: string; userType: string; createdAt?: string } }> {
    return this.http
      .put<ApiResponse<{ user: { id: string; name: string; email?: string; phone?: string; userType: string; createdAt?: string } }>>(`${this.apiUrl}/users/profile`, dto)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  // ==========================================
  // Password endpoints
  // ==========================================

  /**
   * Update password
   * PUT /v1/users/profile/password
   */
  updatePassword(dto: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http
      .put<ApiResponse<{ message: string }>>(`${this.apiUrl}/users/profile/password`, dto)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Get my appointments with pagination meta
   * GET /v1/appointments
   */
  getMyAppointmentsPaginated(query?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Observable<PaginatedResponse<BookingListItem>> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.startDate) params = params.set('startDate', query.startDate);
    if (query?.endDate) params = params.set('endDate', query.endDate);
    if (query?.status) params = params.set('status', query.status);

    return this.http
      .get<ApiResponse<PaginatedResponse<BookingListItem>>>(`${this.apiUrl}/appointments`, { params })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message || 'An error occurred. Please try again.';
      return throwError(() => new Error(message));
    }
    return throwError(() => new Error('An unexpected error occurred'));
  }
}
