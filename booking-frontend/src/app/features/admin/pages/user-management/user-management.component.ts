import { Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import {
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  ContactType,
} from '../../dto/admin.dto';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import {
  AppBadgeComponent,
  BadgeStatus,
} from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppSearchInputComponent } from '../../../../shared/components/atoms/app-search-input/app-search-input.component';
import { AppDropdownComponent } from '../../../../shared/components/atoms/app-dropdown/app-dropdown.component';
import { AppSpinnerComponent } from '../../../../shared/components/atoms/app-spinner/app-spinner.component';
import { AppFilterBarComponent } from '../../../../shared/components/molecules/app-filter-bar/app-filter-bar.component';
import { AppTableWrapperComponent } from '../../../../shared/components/molecules/app-table-wrapper/app-table-wrapper.component';
import { AppModalComponent } from '../../../../shared/components/atoms/app-modal/app-modal.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

export type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FormsModule,
    DatePipe,
    AppCardComponent,
    AppButtonComponent,
    AppBadgeComponent,
    AppSearchInputComponent,
    AppDropdownComponent,
    AppSpinnerComponent,
    AppFilterBarComponent,
    AppTableWrapperComponent,
    AppModalComponent,
    TranslatePipe,
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
  readonly isViewMode = signal(false);
  readonly submitted = signal(false);

  // Search/filter
  readonly searchQuery = signal('');
  readonly isFiltering = signal(false);
  readonly selectedRoleFilter = signal<AdminUserRole | ''>('');
  readonly selectedStatusFilter = signal<AdminUserStatus | ''>('');

  // Form model
  formName = '';
  formEmail = '';
  formPhone = '';
  formRole: AdminUserRole = 'CUSTOMER';
  formStatus: AdminUserStatus = 'ACTIVE';
  formPassword = '';
  formConfirmPassword = '';

  // Form validation
  formErrors: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};

  // Dialog UI state
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly isSaving = signal(false);
  readonly dialogError = signal('');

  // Verification code state (T-ADMIN-VERIFY-005)
  readonly verificationStep = signal<1 | 2 | 3>(1);
  readonly contactType = signal<ContactType>(ContactType.EMAIL);
  readonly ContactType = ContactType;
  readonly countdown = signal(0);
  readonly verificationCode = signal('');
  readonly maskedContact = signal<string | null>(null);
  readonly dialogMessage = signal<string | null>(null);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  readonly isCodeValid = computed(() => /^\d{6}$/.test(this.verificationCode()));
  readonly isSendDisabled = computed(() => this.countdown() > 0);

  readonly roleOptions = [
    { label: 'CUSTOMER', value: 'CUSTOMER' as AdminUserRole },
    { label: 'ADMIN', value: 'ADMIN' as AdminUserRole },
    { label: 'SUPER_ADMIN', value: 'SUPER_ADMIN' as AdminUserRole },
  ];

  readonly statusOptions = [
    { label: 'Active', value: 'ACTIVE' as AdminUserStatus },
    { label: 'Inactive', value: 'INACTIVE' as AdminUserStatus },
    { label: 'Blocked', value: 'BLOCKED' as AdminUserStatus },
  ];

  readonly filterRoleOptions = [{ label: 'All Roles', value: '' }, ...this.roleOptions];

  readonly filterStatusOptions = [{ label: 'All Statuses', value: '' }, ...this.statusOptions];

  // Stats computed from full dataset (not paginated page)
  readonly totalUsers = computed(() => this.vm().usersTotal);
  readonly activeUsers = computed(
    () => this.vm().allUsersForStats.filter((u) => u.status === 'ACTIVE').length,
  );
  readonly newThisWeek = computed(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return this.vm().allUsersForStats.filter((u) => new Date(u.createdAt) >= oneWeekAgo).length;
  });

  readonly searchSuggestions = computed(() =>
    this.vm().allUsersForStats.map((u) => ({ label: u.name, value: u.id })),
  );

  ngOnInit(): void {
    this.store.clearError();
    this.loadUsers();
    this.loadAllUsersForStats();
  }

  loadUsers(isFilterOperation = false): void {
    if (isFilterOperation) {
      this.isFiltering.set(true);
    } else {
      this.store.setLoading(true);
    }
    this.adminService
      .getUsers({
        page: 1,
        limit: 10,
        search: this.searchQuery() || undefined,
        role: this.selectedRoleFilter() || undefined,
        status: this.selectedStatusFilter() || undefined,
      })
      .subscribe({
        next: (response) => {
          this.store.setUsers(response.items, response.meta.total, response.meta.page);
          if (isFilterOperation) {
            this.isFiltering.set(false);
          } else {
            this.store.setLoading(false);
          }
        },
        error: (err) => this.store.setError(err.message ?? 'Failed to load users'),
      });
  }

  private loadAllUsersForStats(): void {
    this.adminService.getUsers({ limit: 999, page: 1 }).subscribe({
      next: (response) => this.store.setAllUsersForStats(response.items),
      error: () => {},
    });
  }

  viewUser(user: AdminUser): void {
    this.isViewMode.set(true);
    this.isEdit.set(false);
    this.selectedUser.set(user);
    this.formName = user.name;
    this.formEmail = user.email;
    this.formPhone = user.phone ?? '';
    this.formRole = user.role;
    this.formStatus = user.status;
    this.formPassword = '';
    this.submitted.set(false);
    this.formErrors = {};
    this.userDialogVisible.set(true);
  }

  openNew(): void {
    this.resetForm();
    this.isEdit.set(false);
    this.isViewMode.set(false);
    this.selectedUser.set(null);
    this.submitted.set(false);
    this.formErrors = {};
    this.userDialogVisible.set(true);
  }

  editUser(user: AdminUser): void {
    this.isEdit.set(true);
    this.isViewMode.set(false);
    this.selectedUser.set(user);
    this.formName = user.name;
    this.formEmail = user.email;
    this.formPhone = user.phone ?? '';
    this.formRole = user.role;
    this.formStatus = user.status;
    this.formPassword = '';
    this.submitted.set(false);
    this.formErrors = {};
    this.userDialogVisible.set(true);
  }

  confirmDeleteUser(user: AdminUser): void {
    this.userToDelete.set(user);
    this.deleteDialogVisible.set(true);
  }

  closeDialog(): void {
    this.userDialogVisible.set(false);
    this.selectedUser.set(null);
    this.isSaving.set(false);
    this.dialogError.set('');
    this.resetForm();
  }

  saveUser(): void {
    this.submitted.set(true);
    this.formErrors = {};
    this.dialogError.set('');

    // Validation
    if (!this.formName.trim()) {
      this.formErrors.name = 'Name is required';
    }
    if (!this.isEdit() && !this.formEmail.trim()) {
      this.formErrors.email = 'Email is required';
    }
    if (!this.isEdit() && !this.formPassword.trim()) {
      this.formErrors.password = 'Password is required';
    }
    if (!this.isEdit() && !this.isViewMode() && this.formPassword && this.formConfirmPassword && this.formPassword !== this.formConfirmPassword) {
      this.formErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(this.formErrors).length > 0) {
      return;
    }

    this.isSaving.set(true);

    if (this.isEdit() && this.selectedUser()) {
      const updates: UpdateAdminUserRequest = {
        name: this.formName,
        role: this.formRole,
        status: this.formStatus,
      };
      this.adminService.updateUser(this.selectedUser()!.id, updates).subscribe({
        next: () => {
          this.store.updateUserInList(this.selectedUser()!.id, updates);
          this.loadAllUsersForStats();
          this.isSaving.set(false);
          this.closeDialog();
        },
        error: (err) => {
          this.store.setError(err.message ?? 'Failed to update user');
          this.dialogError.set(err.message ?? 'Failed to update user');
          this.isSaving.set(false);
        },
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
          this.store.setUsers(
            [...this.store.users(), user],
            this.store.usersTotal() + 1,
            this.store.usersPage(),
          );
          this.loadAllUsersForStats();
          this.isSaving.set(false);
          this.closeDialog();
        },
        error: (err) => {
          this.store.setError(err.message ?? 'Failed to create user');
          this.dialogError.set(err.message ?? 'Failed to create user');
          this.isSaving.set(false);
        },
      });
    }
  }

  deleteUser(): void {
    if (!this.userToDelete()) return;
    const id = this.userToDelete()!.id;
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.store.removeUserFromList(id);
        this.loadAllUsersForStats();
        this.deleteDialogVisible.set(false);
        this.userToDelete.set(null);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to delete user'),
    });
  }

  applyFilter(): void {
    this.loadUsers(true);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.applyFilter();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedRoleFilter.set('');
    this.selectedStatusFilter.set('');
    this.loadUsers(true);
  }

  onRoleFilterChange(value: unknown): void {
    this.selectedRoleFilter.set(value as AdminUserRole | '');
    this.applyFilter();
  }

  onStatusFilterChange(value: unknown): void {
    this.selectedStatusFilter.set(value as AdminUserStatus | '');
    this.applyFilter();
  }

  mapRoleToBadge(role: AdminUserRole): BadgeStatus {
    switch (role) {
      case 'CUSTOMER':
        return 'confirmed';
      case 'ADMIN':
        return 'pending';
      case 'SUPER_ADMIN':
        return 'pending';
      default:
        return 'pending';
    }
  }

  mapStatusToBadge(status: AdminUserStatus): BadgeStatus {
    switch (status) {
      case 'ACTIVE':
        return 'confirmed';
      case 'INACTIVE':
        return 'pending';
      case 'BLOCKED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  // ==========================================
  // Verification Code Methods (T-ADMIN-VERIFY-005)
  // ==========================================

  sendCode(): void {
    this.dialogError.set('');
    this.dialogMessage.set(null);
    const payload: Record<string, string> = { contact_type: this.contactType() };
    if (this.contactType() === ContactType.EMAIL) {
      payload['email'] = this.formEmail;
    } else {
      payload['phone'] = this.formPhone;
    }
    this.adminService.sendCode(payload as any).subscribe({
      next: (resp) => {
        this.maskedContact.set(resp.maskedContact ?? null);
        if (resp.maskedContact) {
          this.dialogMessage.set(`Code sent to ${resp.maskedContact}`);
        } else {
          this.dialogMessage.set('If the contact exists, a verification code has been sent.');
        }
        this.verificationStep.set(2);
        this.startCountdown();
      },
      error: (err) => {
        this.dialogError.set(err.message ?? 'Failed to send code');
      },
    });
  }

  verifyCodeAndProceed(): void {
    this.dialogError.set('');
    this.dialogMessage.set(null);
    // In production, the code is verified by the backend during user creation.
    // We simply advance to step 3 here. The actual verification happens in createUserWithCode.
    this.verificationStep.set(3);
  }

  cancelVerification(): void {
    this.verificationStep.set(1);
    this.verificationCode.set('');
    this.dialogMessage.set(null);
  }

  toggleContactType(): void {
    this.contactType.update((v) =>
      v === ContactType.EMAIL ? ContactType.PHONE : ContactType.EMAIL,
    );
  }

  startCountdown(): void {
    this.countdown.set(60);
    this.countdownInterval = setInterval(() => {
      this.countdown.update((v) => {
        if (v <= 1) {
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  createUserWithCode(): void {
    this.submitted.set(true);
    this.formErrors = {};
    this.dialogError.set('');

    // Validation
    if (!this.formName.trim()) {
      this.formErrors.name = 'Name is required';
    }
    if (!this.formEmail.trim()) {
      this.formErrors.email = 'Email is required';
    }
    if (!this.formPassword.trim()) {
      this.formErrors.password = 'Password is required';
    }
    if (this.formPassword && this.formConfirmPassword && this.formPassword !== this.formConfirmPassword) {
      this.formErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(this.formErrors).length > 0) {
      return;
    }

    this.isSaving.set(true);

    const dto: CreateAdminUserRequest = {
      name: this.formName,
      email: this.formEmail,
      phone: this.formPhone || undefined,
      role: this.formRole,
      password: this.formPassword,
      verification_code: this.verificationCode() || undefined,
    };

    this.adminService.createUser(dto).subscribe({
      next: (user) => {
        this.store.setUsers(
          [...this.store.users(), user],
          this.store.usersTotal() + 1,
          this.store.usersPage(),
        );
        this.loadAllUsersForStats();
        this.isSaving.set(false);
        this.closeDialog();
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to create user');
        this.dialogError.set(err.message ?? 'Failed to create user');
        this.isSaving.set(false);
      },
    });
  }

  private resetForm(): void {
    this.formName = '';
    this.formEmail = '';
    this.formPhone = '';
    this.formRole = 'CUSTOMER';
    this.formStatus = 'ACTIVE';
    this.formPassword = '';
    this.formConfirmPassword = '';
    this.formErrors = {};
    this.dialogError.set('');
    this.verificationStep.set(1);
    this.contactType.set(ContactType.EMAIL);
    this.countdown.set(0);
    this.verificationCode.set('');
    this.maskedContact.set(null);
    this.dialogMessage.set(null);
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
