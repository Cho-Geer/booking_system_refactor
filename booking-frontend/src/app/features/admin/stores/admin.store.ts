import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { lastValueFrom, pipe, switchMap, tap } from 'rxjs';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  AdminStats,
  AdminUser,
  AdminServiceItem,
  AdminAppointment,
  BookingTrendItem,
  ServicePopularityItem,
  ServicesSummary,
  UpdateAdminUserRequest,
  UpdateAdminServiceRequest,
  AdminUsersQuery,
  AdminServicesQuery,
  AdminAppointmentsQuery,
  CreateAdminUserRequest,
  CreateAdminServiceRequest,
  UpdateAppointmentStatusRequest,
  BatchCancelRequest,
  TimeDistributionItem,
  SystemHealth,
  TimeRange,
  SendCreateUserCodeRequest,
  SendCodeResponse,
} from '../dto/admin.dto';
import { AdminService } from '../services/admin.service';

export interface AdminState {
  // Stats
  stats: AdminStats | null;

  // Isolated chart data (loaded independently to avoid cross-chart reloads)
  servicePopularity: ServicePopularityItem[];
  bookingTrend: BookingTrendItem[];

  // Phase 3: Analytics
  timeDistribution: TimeDistributionItem[];

  // System Health
  systemHealth: SystemHealth | null;

  // Users (paginated list)
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;

  // Recent Users (dashboard only, isolated from paginated list)
  recentUsers: AdminUser[];

  // Users (full dataset for stats computation, isolated from paginated list)
  allUsersForStats: AdminUser[];

  // Services (paginated list)
  services: AdminServiceItem[];
  servicesTotal: number;
  servicesPage: number;

  // Recent Services (dashboard only, isolated from paginated list)
  recentServices: AdminServiceItem[];

  // Services Summary (for stats cards, replaces allServicesForStats)
  servicesSummary: ServicesSummary | null;

  // Services (full dataset for stats computation, isolated from paginated list)
  allServicesForStats: AdminServiceItem[];

  // Appointments (full dataset for stats computation, isolated from paginated list)
  allAppointmentsForStats: AdminAppointment[];

  // Appointments (paginated list)
  appointments: AdminAppointment[];
  appointmentsTotal: number;
  appointmentsPage: number;

  // Notifications
  unreadCount: number;

  // Loaded flags (BUG-1: distinguish "not yet loaded" from "loaded but empty")
  loadedServicePopularity: boolean;
  loadedBookingTrend: boolean;
  loadedDistribution: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
}

/** Parameters for loadDistributionByTimeRange with rxMethod */
export interface TimeRangeParams {
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
}

export const initialAdminState: AdminState = {
  stats: null,
  servicePopularity: [],
  bookingTrend: [],
  timeDistribution: [],
  systemHealth: null,
  users: [],
  usersTotal: 0,
  usersPage: 1,
  recentUsers: [],
  allUsersForStats: [],
  services: [],
  servicesTotal: 0,
  servicesPage: 1,
  recentServices: [],
  servicesSummary: null,
  allServicesForStats: [],
  allAppointmentsForStats: [],
  appointments: [],
  appointmentsTotal: 0,
  appointmentsPage: 1,
  unreadCount: 0,
  // Loaded flags: default to false (data not yet fetched)
  loadedServicePopularity: false,
  loadedBookingTrend: false,
  loadedDistribution: false,

  isLoading: false,
  error: null,
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState<AdminState>(initialAdminState),
  withComputed(({ isLoading, error, stats, servicePopularity, bookingTrend, timeDistribution, loadedServicePopularity, loadedBookingTrend, loadedDistribution, systemHealth, users, usersTotal, usersPage, recentUsers, allUsersForStats, services, servicesTotal, servicesPage, recentServices, servicesSummary, allServicesForStats, allAppointmentsForStats, appointments, appointmentsTotal, appointmentsPage, unreadCount }) => ({
    vm: computed(() => ({
      isLoading: isLoading(),
      error: error(),
      stats: stats(),
      servicePopularity: servicePopularity(),
      bookingTrend: bookingTrend(),
      timeDistribution: timeDistribution(),
      systemHealth: systemHealth(),
      users: users(),
      usersTotal: usersTotal(),
      usersPage: usersPage(),
      recentUsers: recentUsers(),
      allUsersForStats: allUsersForStats(),
      services: services(),
      servicesTotal: servicesTotal(),
      servicesPage: servicesPage(),
      recentServices: recentServices(),
      servicesSummary: servicesSummary(),
      allServicesForStats: allServicesForStats(),
      allAppointmentsForStats: allAppointmentsForStats(),
      appointments: appointments(),
      appointmentsTotal: appointmentsTotal(),
      appointmentsPage: appointmentsPage(),
      unreadCount: unreadCount(),
      loadedServicePopularity: loadedServicePopularity(),
      loadedBookingTrend: loadedBookingTrend(),
      loadedDistribution: loadedDistribution(),
    })),
    hasError: computed(() => error() !== null),
  })),
  withMethods((store, adminService = inject(AdminService)) => ({
    // ==========================================
    // Stats
    // ==========================================

    setStats(stats: AdminStats): void {
      patchState(store, { stats });
    },

    /**
     * Load servicePopularity + timeDistribution from DASH-001 filtered by time range.
     * Uses rxMethod + switchMap to cancel previous in-flight request when a new
     * time range is selected, preventing race conditions on rapid Time filter clicks.
     * Patches isolated state fields so only distribution panel charts reload.
     */
    loadDistributionByTimeRange: rxMethod<TimeRangeParams>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(({ timeRange, startDate, endDate }) =>
          adminService.getStats(timeRange, startDate, endDate).pipe(
            tap({
              next: (stats) =>
                patchState(store, {
                  servicePopularity: stats.servicePopularity,
                  timeDistribution: stats.timeDistribution,
                  loadedServicePopularity: true,
                  loadedDistribution: true,
                }),
              error: (err) => {
                const message = err instanceof Error ? err.message : 'Failed to load distribution data';
                patchState(store, { error: message });
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Load bookingTrend data (DASH-002 standalone endpoint) filtered by time range.
     * Patches isolated bookingTrend field so only the trend chart reloads.
     */
    async loadBookingTrend(timeRange?: TimeRange): Promise<void> {
      patchState(store, { error: null });
      try {
        const data = await lastValueFrom(adminService.getBookingTrend(timeRange));
        patchState(store, { bookingTrend: data, loadedBookingTrend: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load booking trend';
        patchState(store, { error: message });
      }
    },

    setSystemHealth(health: SystemHealth): void {
      patchState(store, { systemHealth: health });
    },

    // ==========================================
    // Phase 3: Analytics
    // ==========================================

    /**
     * Load time distribution data from API with optional time range filter.
     * This is a lightweight background update — does NOT trigger global loading state.
     */
    async loadTimeDistribution(timeRange?: TimeRange, startDate?: string, endDate?: string): Promise<void> {
      patchState(store, { error: null });
      try {
        const data = await lastValueFrom(adminService.getTimeDistribution(timeRange, startDate, endDate));
        patchState(store, { timeDistribution: data, loadedDistribution: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load time distribution';
        patchState(store, { error: message });
      }
    },

    /**
     * Load system health status from API.
     */
    async loadSystemStatus(): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const health = await lastValueFrom(adminService.getSystemStatus());
        patchState(store, { systemHealth: health, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load system status';
        patchState(store, { error: message, isLoading: false });
      }
    },

    // ==========================================
    // Users
    // ==========================================

    setUsers(users: AdminUser[], total: number | undefined, page: number): void {
      patchState(store, { users, usersTotal: total ?? users.length, usersPage: page });
    },

    setRecentUsers(users: AdminUser[]): void {
      patchState(store, { recentUsers: users });
    },

    setAllUsersForStats(users: AdminUser[]): void {
      patchState(store, { allUsersForStats: users });
    },

    setRecentServices(services: AdminServiceItem[]): void {
      patchState(store, { recentServices: services });
    },

    setAllServicesForStats(services: AdminServiceItem[]): void {
      patchState(store, { allServicesForStats: services });
    },

    setServicesSummary(summary: ServicesSummary): void {
      patchState(store, { servicesSummary: summary });
    },

    setAllAppointmentsForStats(appointments: AdminAppointment[]): void {
      patchState(store, { allAppointmentsForStats: appointments });
    },

    updateUserInList(id: string, updates: UpdateAdminUserRequest): void {
      const updated = store.users().map(u =>
        u.id === id
          ? { ...u, ...updates, name: updates.name ?? u.name, role: updates.role ?? u.role }
          : u
      );
      patchState(store, { users: updated });
    },

    removeUserFromList(id: string): void {
      patchState(store, {
        users: store.users().filter(u => u.id !== id),
        usersTotal: store.usersTotal() - 1,
      });
    },

    // ==========================================
    // Services
    // ==========================================

    setServices(services: AdminServiceItem[], total: number | undefined, page: number): void {
      patchState(store, { services, servicesTotal: total ?? services.length, servicesPage: page });
    },

    updateServiceInList(id: string, updates: UpdateAdminServiceRequest): void {
      const updated = store.services().map(s =>
        s.id === id ? { ...s, ...updates } : s
      );
      patchState(store, { services: updated });
    },

    removeServiceFromList(id: string): void {
      patchState(store, {
        services: store.services().filter(s => s.id !== id),
        servicesTotal: store.servicesTotal() - 1,
      });
    },

    // ==========================================
    // Appointments
    // ==========================================

    setAppointments(appointments: AdminAppointment[], total: number | undefined, page: number): void {
      patchState(store, { appointments, appointmentsTotal: total ?? appointments.length, appointmentsPage: page });
    },

    updateAppointmentStatusInList(id: string, status: string): void {
      const updated = store.appointments().map(a =>
        a.id === id ? { ...a, status: status as AdminAppointment['status'] } : a
      );
      patchState(store, { appointments: updated });
    },

    removeAppointmentsFromList(ids: string[]): void {
      const idSet = new Set(ids);
      patchState(store, {
        appointments: store.appointments().filter(a => !idSet.has(a.id)),
        appointmentsTotal: store.appointmentsTotal() - ids.length,
      });
    },

    // ==========================================
    // UI State
    // ==========================================

    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },

    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },

    clearError(): void {
      patchState(store, { error: null });
    },

    setUnreadCount(count: number): void {
      patchState(store, { unreadCount: count });
    },

    async loadUnreadCount(): Promise<void> {
      try {
        const result = await lastValueFrom(adminService.getUnreadCount());
        patchState(store, { unreadCount: result.count });
      } catch {
        patchState(store, { unreadCount: 0 });
      }
    },

    // ==========================================
    // Async API methods
    // ==========================================

    /**
     * Load admin dashboard stats from API with optional time range filter.
     */
    async loadStats(timeRange?: TimeRange, startDate?: string, endDate?: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const stats = await lastValueFrom(adminService.getStats(timeRange, startDate, endDate));
        patchState(store, { stats, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load stats';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Load users list with pagination from API.
     */
    async loadUsers(query: AdminUsersQuery): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const response = await lastValueFrom(adminService.getUsers(query));
        patchState(store, {
          users: response.items,
          usersTotal: response.meta.total,
          usersPage: response.meta.page,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load users';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Create a new user via API and add to local list.
     */
    async createUser(dto: CreateAdminUserRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const user = await lastValueFrom(adminService.createUser(dto));
        patchState(store, {
          users: [...store.users(), user],
          usersTotal: store.usersTotal() + 1,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create user';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Send verification code for creating a new admin user.
     */
    async sendCreateUserCode(dto: SendCreateUserCodeRequest): Promise<SendCodeResponse> {
      patchState(store, { error: null });
      try {
        return await lastValueFrom(adminService.sendCode(dto));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send verification code';
        patchState(store, { error: message });
        throw err;
      }
    },

    /**
     * Update a user via API and update in local list.
     */
    async updateUser(id: string, dto: UpdateAdminUserRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const updated = await lastValueFrom(adminService.updateUser(id, dto));
        const users = store.users().map(u => (u.id === id ? updated : u));
        patchState(store, { users, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update user';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Delete a user via API and remove from local list.
     */
    async deleteUser(id: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await lastValueFrom(adminService.deleteUser(id));
        patchState(store, {
          users: store.users().filter(u => u.id !== id),
          usersTotal: store.usersTotal() - 1,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete user';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Load admin services list with pagination from API.
     */
    async loadAdminServices(query: AdminServicesQuery): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const response = await lastValueFrom(adminService.getAdminServices(query));
        patchState(store, {
          services: response.items,
          servicesTotal: response.meta.total,
          servicesPage: response.meta.page,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load services';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Create a new service via API and add to local list.
     */
    async createAdminService(dto: CreateAdminServiceRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const service = await lastValueFrom(adminService.createAdminService(dto));
        patchState(store, {
          services: [...store.services(), service],
          servicesTotal: store.servicesTotal() + 1,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create service';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Update a service via API and update in local list.
     */
    async updateAdminService(id: string, dto: UpdateAdminServiceRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const updated = await lastValueFrom(adminService.updateAdminService(id, dto));
        const services = store.services().map(s => (s.id === id ? updated : s));
        patchState(store, { services, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update service';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Delete a service via API and remove from local list.
     */
    async deleteAdminService(id: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await lastValueFrom(adminService.deleteAdminService(id));
        patchState(store, {
          services: store.services().filter(s => s.id !== id),
          servicesTotal: store.servicesTotal() - 1,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete service';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Load admin appointments list with pagination from API.
     */
    async loadAdminAppointments(query: AdminAppointmentsQuery): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const response = await lastValueFrom(adminService.getAdminAppointments(query));
        patchState(store, {
          appointments: response.items,
          appointmentsTotal: response.meta.total,
          appointmentsPage: response.meta.page,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load appointments';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Update an appointment's status via API and update in local list.
     */
    async updateAdminAppointmentStatus(id: string, dto: UpdateAppointmentStatusRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await lastValueFrom(adminService.updateAppointmentStatus(id, dto));
        const appointments = store.appointments().map(a =>
          a.id === id ? { ...a, status: result.status as AdminAppointment['status'] } : a
        );
        patchState(store, { appointments, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update appointment status';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Batch cancel appointments via API and remove from local list.
     */
    async batchCancelAppointments(dto: BatchCancelRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await lastValueFrom(adminService.batchCancelAppointments(dto));
        const idSet = new Set(dto.ids);
        patchState(store, {
          appointments: store.appointments().filter(a => !idSet.has(a.id)),
          appointmentsTotal: store.appointmentsTotal() - dto.ids.length,
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to batch cancel appointments';
        patchState(store, { error: message, isLoading: false });
      }
    },
  }))
);
