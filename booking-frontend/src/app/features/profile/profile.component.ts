import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore, User } from '../../stores/auth/auth.store';
import { ApiService } from '../../core/services/api.service';
import { AppCardComponent } from '../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../shared/components/atoms/app-button/app-button.component';
import { AppModalComponent } from '../../shared/components/atoms/app-modal/app-modal.component';
import { AppBadgeComponent } from '../../shared/components/atoms/app-badge/app-badge.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCardComponent,
    AppButtonComponent,
    AppModalComponent,
    AppBadgeComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private authStore = inject(AuthStore);
  private api = inject(ApiService);

  user = computed<User | null>(() => this.authStore.currentUser());
  isLoading = this.authStore.isLoading;
  error = this.authStore.error;

  // Edit mode
  isEditing = signal(false);
  editName = signal('');
  saveError = signal<string | null>(null);
  isSaving = signal(false);

  // Password dialog
  passwordDialogVisible = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  confirmNewPassword = signal('');
  passwordError = signal<string | null>(null);
  isPasswordSaving = signal(false);
  passwordSuccess = signal(false);

  // Avatar initials
  avatarInitials = computed(() => {
    const u = this.user();
    if (!u?.name) return '?';
    const parts = u.name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return u.name.substring(0, 2).toUpperCase();
  });

  toggleEdit(): void {
    if (this.isEditing()) {
      this.cancelEdit();
    } else {
      this.isEditing.set(true);
      this.editName.set(this.user()?.name || '');
      this.saveError.set(null);
    }
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editName.set(this.user()?.name || '');
    this.saveError.set(null);
  }

  saveProfile(): void {
    const name = this.editName().trim();
    if (!name) return;

    this.isSaving.set(true);
    this.saveError.set(null);

    this.api.updateProfile({ name }).subscribe({
      next: (response) => {
        this.authStore.setUserProfile({
          id: response.user.id,
          name: response.user.name,
          userType: response.user.userType,
          email: response.user.email,
          phone: response.user.phone,
          createdAt: (response.user as { createdAt?: string }).createdAt,
        });
        this.isEditing.set(false);
        this.isSaving.set(false);
      },
      error: (err) => {
        this.saveError.set(err.message || 'Failed to update profile');
        this.isSaving.set(false);
      },
    });
  }

  onPasswordDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closePasswordDialog();
    }
  }

  showPasswordDialog(): void {
    this.passwordDialogVisible.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmNewPassword.set('');
  }

  closePasswordDialog(): void {
    this.passwordDialogVisible.set(false);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
  }

  onChangePassword(): void {
    const current = this.currentPassword();
    const newPw = this.newPassword();
    const confirm = this.confirmNewPassword();

    if (!current || !newPw) {
      this.passwordError.set('Please fill in all fields');
      return;
    }
    if (newPw !== confirm) {
      this.passwordError.set('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      this.passwordError.set('New password must be at least 8 characters');
      return;
    }

    this.isPasswordSaving.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    this.api.updatePassword({ currentPassword: current, newPassword: newPw }).subscribe({
      next: () => {
        this.isPasswordSaving.set(false);
        this.passwordSuccess.set(true);
        setTimeout(() => this.closePasswordDialog(), 1500);
      },
      error: (err) => {
        this.isPasswordSaving.set(false);
        this.passwordError.set(err.message || 'Failed to update password');
      },
    });
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
