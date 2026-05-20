/**
 * Admin DTOs
 * Aligned with contract.yaml v1.7.1 — Admin API definitions
 * @see contract.yaml -> api.admin
 */

// ==========================================
// Stats
// ==========================================

export interface BookingTrendItem {
  date: string;
  count: number;
  revenue: number;
}

export interface ServicePopularityItem {
  serviceName: string;
  count: number;
  percentage: number;
}

export interface TimeDistributionItem {
  hour: number;
  count: number;
}

export interface StatCard {
  value: number;
  changePercentage: number;
  isPositive: boolean;
  target: number;
  progressPercentage: number;
}

export interface AdminStats {
  todayBookings: StatCard;
  pendingBookings: StatCard;
  activeUsers: StatCard;
  totalRevenue: StatCard;
  bookingTrend: BookingTrendItem[];
  servicePopularity: ServicePopularityItem[];
  timeDistribution: TimeDistributionItem[];
}
// ==========================================
// Users
// ==========================================

export type AdminUserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
export type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

// ==========================================
// Verification Code
// ==========================================

export enum ContactType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export interface SendCreateUserCodeRequest {
  contact_type: ContactType;
  email?: string;
  phone?: string;
}

export interface SendCodeResponse {
  maskedContact?: string;
  expiresIn: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  preferredTimezone?: string;
  createdAt: string;
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  password?: string;
  verification_code?: string;
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
  pricePerMinute?: number;
  taxRate?: number;
  category?: string;
  createdAt: string;
}

export interface ServicesSummary {
  total: number;
  active: number;
  averagePrice: number;
}

export interface CreateAdminServiceRequest {
  name: string;
  description?: string;
  duration: number;
  price?: number;
  active?: boolean;
  imageUrl?: string;
  pricePerMinute?: number;
  taxRate?: number;
}

export interface UpdateAdminServiceRequest {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  active?: boolean;
  imageUrl?: string;
  pricePerMinute?: number;
  taxRate?: number;
}

export interface AdminServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  category?: string;
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
  serviceActive: boolean;
  timeSlotId: string;
  appointmentDate: string;
  status: AppointmentStatus;
  durationMinutes?: number;
  price?: number;
  taxRate?: number;
  taxIncludedAmount?: number;
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
  search?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
  userId?: string;
}

export interface CreateAdminAppointmentRequest {
  userId: string;
  serviceId: string;
  appointmentDate: string;
  timeSlotId?: string;
  notes?: string;
  overtimeMinutes?: number;
}

// ==========================================
// System Health
// ==========================================

export interface SystemHealth {
  server: string;
  database: string;
  api: string;
  redis: string;
  lastBackup: string;
  uptime: string;
}

export interface SystemHealthDetail {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

// ==========================================
// Time Range Filter
// ==========================================

export type TimeRange = 'last24h' | 'last7d' | 'last30d' | 'thisMonth' | 'lastMonth' | 'custom';

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: 'last24h', label: 'Last 24 Hours' },
  { value: 'last7d', label: 'Last 7 Days' },
  { value: 'last30d', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

export interface TimeRangeSelection {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// Recent Bookings
// ==========================================

import { BadgeStatus } from '../../../shared/components/atoms/app-badge/app-badge.component';

export interface BookingTableRow {
  booking: AdminAppointment;
  initials: string;
  initialsBg: string;
  statusBadge: BadgeStatus;
}

// ==========================================
// Recent Users
// ==========================================

export interface RecentUserRow {
  user: AdminUser;
  initials: string;
  initialsBg: string;
  roleBadge: BadgeStatus;
}

// ==========================================
// Recent Services
// ==========================================

export interface RecentServiceRow {
  service: AdminServiceItem;
  statusBadge: BadgeStatus;
}

// ==========================================
// Notifications
// ==========================================

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface NotificationList {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadCount {
  count: number;
}

// ==========================================
// Business Hours
// ==========================================

export interface BusinessHoursDay {
  open: string;
  close: string;
}

export interface BusinessHoursDto {
  timezone: string;
  monday: BusinessHoursDay[];
  tuesday: BusinessHoursDay[];
  wednesday: BusinessHoursDay[];
  thursday: BusinessHoursDay[];
  friday: BusinessHoursDay[];
  saturday: BusinessHoursDay[];
  sunday: BusinessHoursDay[];
  updatedAt: string;
}

// ==========================================
// Paginated Response
// ==========================================

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}
