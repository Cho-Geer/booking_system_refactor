import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import {
  AdminServiceItem,
  CreateAdminServiceRequest,
  UpdateAdminServiceRequest,
} from '../../dto/admin.dto';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';
import { AppBadgeComponent, BadgeStatus } from '../../../../shared/components/atoms/app-badge/app-badge.component';
import { AppInputComponent } from '../../../../shared/components/atoms/app-input/app-input.component';
import { AppDropdownComponent } from '../../../../shared/components/atoms/app-dropdown/app-dropdown.component';
import { AppSpinnerComponent } from '../../../../shared/components/atoms/app-spinner/app-spinner.component';

export type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-service-management',
  standalone: true,
  imports: [
    TableModule, Dialog, ButtonModule, InputTextModule, InputNumberModule,
    Textarea, SelectModule, ToggleSwitch, FormsModule, CurrencyPipe,
    AppCardComponent, AppButtonComponent, AppBadgeComponent,
    AppInputComponent, AppDropdownComponent, AppSpinnerComponent,
  ],
  templateUrl: './service-management.component.html',
  styleUrl: './service-management.component.scss',
})
export class ServiceManagementComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;

  // View mode
  readonly viewMode = signal<ViewMode>('list');

  // Dialog state
  readonly serviceDialogVisible = signal(false);
  readonly deleteDialogVisible = signal(false);
  readonly selectedService = signal<AdminServiceItem | null>(null);
  readonly serviceToDelete = signal<AdminServiceItem | null>(null);
  readonly isEdit = signal(false);
  readonly submitted = signal(false);

  // Search/filter
  readonly searchQuery = signal('');
  readonly categoryFilter = signal('');
  readonly statusFilter = signal<string>('');

  // Form model
  formName = '';
  formDescription = '';
  formDuration: number | null = null;
  formPrice: number | null = null;
  formActive = true;
  formImageUrl = '';

  // Form validation
  formErrors: { name?: string; duration?: string } = {};

  // Stats computed from services list
  readonly totalServices = computed(() => this.vm().services.length);
  readonly activeServicesCount = computed(() => this.vm().services.filter(s => s.active).length);
  readonly averagePrice = computed(() => {
    const services = this.vm().services;
    if (services.length === 0) return 0;
    const total = services.reduce((sum, s) => sum + s.price, 0);
    return Math.round(total / services.length * 100) / 100;
  });

  readonly filterStatusOptions = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  readonly categoryOptions = [
    { label: 'All Categories', value: '' },
    { label: 'Category A', value: 'Category A' },
    { label: 'Category B', value: 'Category B' },
  ];

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.store.setLoading(true);
    this.adminService.getAdminServices({
      page: 1,
      limit: 10,
      search: this.searchQuery() || undefined,
      active: this.statusFilter() === 'active' ? true :
              this.statusFilter() === 'inactive' ? false :
              undefined,
    }).subscribe({
      next: (response) => {
        this.store.setServices(response.items, response.total, response.page);
        this.store.setLoading(false);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to load services'),
    });
  }

  toggleView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  openNew(): void {
    this.resetForm();
    this.isEdit.set(false);
    this.selectedService.set(null);
    this.submitted.set(false);
    this.formErrors = {};
    this.serviceDialogVisible.set(true);
  }

  editService(svc: AdminServiceItem): void {
    this.isEdit.set(true);
    this.selectedService.set(svc);
    this.formName = svc.name;
    this.formDescription = svc.description;
    this.formDuration = svc.duration;
    this.formPrice = svc.price;
    this.formActive = svc.active;
    this.formImageUrl = svc.imageUrl ?? '';
    this.submitted.set(false);
    this.formErrors = {};
    this.serviceDialogVisible.set(true);
  }

  confirmDeleteService(svc: AdminServiceItem): void {
    this.serviceToDelete.set(svc);
    this.deleteDialogVisible.set(true);
  }

  closeDialog(): void {
    this.serviceDialogVisible.set(false);
    this.selectedService.set(null);
    this.resetForm();
  }

  saveService(): void {
    this.submitted.set(true);
    this.formErrors = {};

    // Validation
    if (!this.formName.trim()) {
      this.formErrors.name = 'Service name is required';
    }
    if (this.formDuration === null || this.formDuration <= 0) {
      this.formErrors.duration = 'Duration is required and must be positive';
    }

    if (Object.keys(this.formErrors).length > 0) {
      return;
    }

    if (this.isEdit() && this.selectedService()) {
      const updates: UpdateAdminServiceRequest = {
        name: this.formName,
        description: this.formDescription || undefined,
        duration: this.formDuration ?? undefined,
        price: this.formPrice ?? undefined,
        active: this.formActive,
        imageUrl: this.formImageUrl || undefined,
      };
      this.adminService.updateAdminService(this.selectedService()!.id, updates).subscribe({
        next: () => {
          this.store.updateServiceInList(this.selectedService()!.id, updates);
          this.closeDialog();
        },
        error: (err) => this.store.setError(err.message ?? 'Failed to update service'),
      });
    } else {
      const dto: CreateAdminServiceRequest = {
        name: this.formName,
        description: this.formDescription || undefined,
        duration: this.formDuration!,
        price: this.formPrice ?? undefined,
        active: this.formActive,
        imageUrl: this.formImageUrl || undefined,
      };
      this.adminService.createAdminService(dto).subscribe({
        next: (svc) => {
          this.store.setServices([...this.store.services(), svc], this.store.servicesTotal() + 1, this.store.servicesPage());
          this.closeDialog();
        },
        error: (err) => this.store.setError(err.message ?? 'Failed to create service'),
      });
    }
  }

  deleteService(): void {
    if (!this.serviceToDelete()) return;
    const id = this.serviceToDelete()!.id;
    this.adminService.deleteAdminService(id).subscribe({
      next: () => {
        this.store.removeServiceFromList(id);
        this.deleteDialogVisible.set(false);
        this.serviceToDelete.set(null);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to delete service'),
    });
  }

  applyFilter(): void {
    this.loadServices();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.categoryFilter.set('');
    this.statusFilter.set('');
    this.loadServices();
  }

  onCategoryFilterChange(value: unknown): void {
    this.categoryFilter.set(value as string);
    this.applyFilter();
  }

  onStatusFilterChange(value: unknown): void {
    this.statusFilter.set(value as string);
    this.applyFilter();
  }

  getActiveSeverity(active: boolean): BadgeStatus {
    return active ? 'confirmed' : 'expired';
  }

  private resetForm(): void {
    this.formName = '';
    this.formDescription = '';
    this.formDuration = null;
    this.formPrice = null;
    this.formActive = true;
    this.formImageUrl = '';
    this.formErrors = {};
  }
}
