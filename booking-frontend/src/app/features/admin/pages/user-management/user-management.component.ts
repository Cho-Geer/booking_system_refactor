import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import {
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '../../dto/admin.dto';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    TableModule, Dialog, ButtonModule, InputTextModule, SelectModule,
    FormsModule, Tag, DatePipe,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;

  // Dialog state
  readonly userDialogVisible = signal(false);
  readonly deleteDialogVisible = signal(false);
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly userToDelete = signal<AdminUser | null>(null);
  readonly isEdit = signal(false);
  readonly submitted = signal(false);

  // Search/filter
  readonly searchQuery = signal('');
  readonly selectedRoleFilter = signal<AdminUserRole | ''>('');
  readonly selectedStatusFilter = signal<AdminUserStatus | ''>('');

  // Form model
  formName = '';
  formEmail = '';
  formPhone = '';
  formRole: AdminUserRole = 'CUSTOMER';
  formStatus: AdminUserStatus = 'ACTIVE';
  formPassword = '';

  readonly roleOptions = [
    { label: 'Customer', value: 'CUSTOMER' as AdminUserRole },
    { label: 'Admin', value: 'ADMIN' as AdminUserRole },
    { label: 'Super Admin', value: 'SUPER_ADMIN' as AdminUserRole },
  ];

  readonly statusOptions = [
    { label: 'Active', value: 'ACTIVE' as AdminUserStatus },
    { label: 'Inactive', value: 'INACTIVE' as AdminUserStatus },
    { label: 'Blocked', value: 'BLOCKED' as AdminUserStatus },
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.store.setLoading(true);
    this.adminService.getUsers({
      page: 1,
      limit: 10,
      search: this.searchQuery() || undefined,
      role: this.selectedRoleFilter() || undefined,
      status: this.selectedStatusFilter() || undefined,
    }).subscribe({
      next: (response) => {
        this.store.setUsers(response.items, response.total, response.page);
        this.store.setLoading(false);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to load users'),
    });
  }

  openNew(): void {
    this.resetForm();
    this.isEdit.set(false);
    this.selectedUser.set(null);
    this.submitted.set(false);
    this.userDialogVisible.set(true);
  }

  editUser(user: AdminUser): void {
    this.isEdit.set(true);
    this.selectedUser.set(user);
    this.formName = user.name;
    this.formEmail = user.email;
    this.formPhone = user.phone ?? '';
    this.formRole = user.role;
    this.formStatus = user.status;
    this.formPassword = '';
    this.submitted.set(false);
    this.userDialogVisible.set(true);
  }

  confirmDeleteUser(user: AdminUser): void {
    this.userToDelete.set(user);
    this.deleteDialogVisible.set(true);
  }

  closeDialog(): void {
    this.userDialogVisible.set(false);
    this.selectedUser.set(null);
    this.resetForm();
  }

  saveUser(): void {
    this.submitted.set(true);

    if (this.isEdit() && this.selectedUser()) {
      const updates: UpdateAdminUserRequest = {
        name: this.formName,
        role: this.formRole,
        status: this.formStatus,
      };
      this.adminService.updateUser(this.selectedUser()!.id, updates).subscribe({
        next: () => {
          this.store.updateUserInList(this.selectedUser()!.id, updates);
          this.closeDialog();
        },
        error: (err) => this.store.setError(err.message ?? 'Failed to update user'),
      });
    } else {
      const dto: CreateAdminUserRequest = {
        name: this.formName,
        email: this.formEmail,
        phone: this.formPhone || undefined,
        role: this.formRole,
        password: this.formPassword,
      };
      this.adminService.createUser(dto).subscribe({
        next: (user) => {
          this.store.setUsers([...this.store.users(), user], this.store.usersTotal() + 1, this.store.usersPage());
          this.closeDialog();
        },
        error: (err) => this.store.setError(err.message ?? 'Failed to create user'),
      });
    }
  }

  deleteUser(): void {
    if (!this.userToDelete()) return;
    const id = this.userToDelete()!.id;
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.store.removeUserFromList(id);
        this.deleteDialogVisible.set(false);
        this.userToDelete.set(null);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to delete user'),
    });
  }

  applyFilter(): void {
    this.loadUsers();
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | undefined {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warn';
      case 'BLOCKED': return 'danger';
      default: return undefined;
    }
  }

  private resetForm(): void {
    this.formName = '';
    this.formEmail = '';
    this.formPhone = '';
    this.formRole = 'CUSTOMER';
    this.formStatus = 'ACTIVE';
    this.formPassword = '';
  }
}
