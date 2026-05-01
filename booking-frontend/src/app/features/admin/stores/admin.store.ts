import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  AdminStats,
  AdminUser,
  AdminServiceItem,
  AdminAppointment,
  UpdateAdminUserRequest,
  UpdateAdminServiceRequest,
  AdminUsersQuery,
  AdminServicesQuery,
  AdminAppointmentsQuery,
  CreateAdminUserRequest,
  CreateAdminServiceRequest,
  UpdateAppointmentStatusRequest,
  BatchCancelRequest,
} from '../dto/admin.dto';
import { AdminService } from '../services/admin.service';

export interface AdminState {
  // Stats
  stats: AdminStats | null;

  // Users (paginated list)
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;

  // Services (paginated list)
  services: AdminServiceItem[];
  servicesTotal: number;
  servicesPage: number;

  // Appointments (paginated list)
  appointments: AdminAppointment[];
  appointmentsTotal: number;
  appointmentsPage: number;

  // UI state
  isLoading: boolean;
  error: string | null;
}

export const initialAdminState: AdminState = {
  stats: null,
  users: [],
  usersTotal: 0,
  usersPage: 1,
  services: [],
  servicesTotal: 0,
  servicesPage: 1,
  appointments: [],
  appointmentsTotal: 0,
  appointmentsPage: 1,
  isLoading: false,
  error: null,
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState<AdminState>(initialAdminState),
  withComputed(({ isLoading, error, stats, users, usersTotal, usersPage, services, servicesTotal, servicesPage, appointments, appointmentsTotal, appointmentsPage }) => ({
    vm: computed(() => ({
      isLoading: isLoading(),
      error: error(),
      stats: stats(),
      users: users(),
      usersTotal: usersTotal(),
      usersPage: usersPage(),
      services: services(),
      servicesTotal: servicesTotal(),
      servicesPage: servicesPage(),
      appointments: appointments(),
      appointmentsTotal: appointmentsTotal(),
      appointmentsPage: appointmentsPage(),
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

    // ==========================================
    // Users
    // ==========================================

    setUsers(users: AdminUser[], total: number, page: number): void {
      patchState(store, { users, usersTotal: total, usersPage: page });
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

    setServices(services: AdminServiceItem[], total: number, page: number): void {
      patchState(store, { services, servicesTotal: total, servicesPage: page });
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

    setAppointments(appointments: AdminAppointment[], total: number, page: number): void {
      patchState(store, { appointments, appointmentsTotal: total, appointmentsPage: page });
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

    // ==========================================
    // Async API methods
    // ==========================================

    /**
     * Load admin dashboard stats from API.
     */
    async loadStats(): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const stats = await lastValueFrom(adminService.getStats());
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
          usersTotal: response.total,
          usersPage: response.page,
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
          servicesTotal: response.total,
          servicesPage: response.page,
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
          appointmentsTotal: response.total,
          appointmentsPage: response.page,
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
