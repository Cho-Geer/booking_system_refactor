/**
 * Admin DTOs
 * Aligned with contract.yaml v1.3.0 — Admin API definitions
 * @see contract.yaml -> api.admin
 */

// ==========================================
// Stats
// ==========================================

export interface BookingTrendItem {
  date: string;
  count: number;
}

export interface ServicePopularityItem {
  serviceName: string;
  count: number;
}

export interface AdminStats {
  totalBookings: number;
  todayBookings: number;
  activeUsers: number;
  totalRevenue: number;
  bookingTrend: BookingTrendItem[];
  servicePopularity: ServicePopularityItem[];
}

// ==========================================
// Users
// ==========================================

export type AdminUserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
export type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  password: string;
}

export interface UpdateAdminUserRequest {
  name?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
}

// ==========================================
// Services
// ==========================================

export interface AdminServiceItem {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface CreateAdminServiceRequest {
  name: string;
  description?: string;
  duration: number;
  price?: number;
  active?: boolean;
  imageUrl?: string;
}

export interface UpdateAdminServiceRequest {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  active?: boolean;
  imageUrl?: string;
}

export interface AdminServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

// ==========================================
// Appointments
// ==========================================

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

export interface AdminAppointment {
  id: string;
  appointmentNumber: string;
  userId: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  timeSlotId: string;
  appointmentDate: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
  reason?: string;
}

export interface BatchCancelRequest {
  ids: string[];
  reason?: string;
}

export interface BatchCancelResponse {
  successCount: number;
  failedCount: number;
  failedIds: string[];
}

export interface AdminAppointmentsQuery {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
  userId?: string;
}

// ==========================================
// Paginated Response
// ==========================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
