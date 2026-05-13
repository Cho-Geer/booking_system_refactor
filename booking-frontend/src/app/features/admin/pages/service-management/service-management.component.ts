import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
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
import { AppSearchInputComponent } from '../../../../shared/components/atoms/app-search-input/app-search-input.component';
import { AppDropdownComponent } from '../../../../shared/components/atoms/app-dropdown/app-dropdown.component';
import { AppSpinnerComponent } from '../../../../shared/components/atoms/app-spinner/app-spinner.component';
import { AppFilterBarComponent } from '../../../../shared/components/molecules/app-filter-bar/app-filter-bar.component';
import { AppTableWrapperComponent } from '../../../../shared/components/molecules/app-table-wrapper/app-table-wrapper.component';
import { AppModalComponent } from '../../../../shared/components/atoms/app-modal/app-modal.component';
import { Subscription, interval } from 'rxjs';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

export type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-service-management',
  standalone: true,
  imports: [
    TableModule, ButtonModule, InputTextModule, InputNumberModule,
    Textarea, SelectModule, ToggleSwitch, FormsModule, CurrencyPipe,
    AppCardComponent, AppButtonComponent, AppBadgeComponent,
    AppSearchInputComponent, AppDropdownComponent, AppSpinnerComponent,
    AppFilterBarComponent, AppTableWrapperComponent, AppModalComponent, TranslatePipe,
  ],
  templateUrl: './service-management.component.html',
  styleUrl: './service-management.component.scss',
})
export class ServiceManagementComponent implements OnInit, OnDestroy {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);
  private statsPollInterval?: Subscription;

  readonly vm = this.store.vm;

  // View mode
  readonly viewMode = signal<ViewMode>('list');

  // Dialog state
  readonly serviceDialogVisible = signal(false);
  readonly deleteDialogVisible = signal(false);
  readonly selectedService = signal<AdminServiceItem | null>(null);
  readonly serviceToDelete = signal<AdminServiceItem | null>(null);
  readonly isEdit = signal(false);
  readonly isViewMode = signal(false);
  readonly submitted = signal(false);

  // Search/filter
  readonly searchQuery = signal('');
  readonly isFiltering = signal(false);
  readonly categoryFilter = signal('');
  readonly statusFilter = signal<string>('');

  // Form model
  formName = '';
  formDescription = '';
  formDuration: number | null = null;
  formPrice: number | null = null;
  formActive = true;
  formImageUrl = '';
  formPricePerMinute: number | null = null;
  formTaxRate: number | null = null;

  // Image upload
  readonly selectedFile = signal<File | null>(null);
  readonly imageUploading = signal(false);

  // Form validation
  formErrors: { name?: string; duration?: string; price?: string } = {};

  // Stats computed from full dataset (not paginated page)
  readonly computedPricePerMinute = (): number | null => {
    const p = this.formPrice;
    const d = this.formDuration;
    return p !== null && d !== null && d > 0 ? p / d : null;
  };

  readonly totalServices = computed(() => this.vm().servicesSummary?.total ?? this.vm().servicesTotal);
  readonly activeServicesCount = computed(() => this.vm().servicesSummary?.active ?? this.vm().allServicesForStats.filter(s => s.active).length);
  readonly averagePrice = computed(() => {
    const summary = this.vm().servicesSummary;
    if (summary) return summary.averagePrice;
    const services = this.vm().allServicesForStats;
    if (services.length === 0) return 0;
    const total = services.reduce((sum, s) => sum + s.price, 0);
    return Math.round(total / services.length * 100) / 100;
  });

  readonly searchSuggestions = computed(() =>
    this.vm().allServicesForStats.map(s => ({ label: s.name, value: s.id }))
  );

  readonly filterStatusOptions = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  readonly categoryOptions = computed(() => {
    const categories = [...new Set(this.vm().allServicesForStats.map(s => s.category).filter(Boolean))] as string[];
    return [
      { label: 'All Categories', value: '' },
      ...categories.map(c => ({ label: c, value: c })),
    ];
  });

  ngOnInit(): void {
    this.store.clearError();
    this.loadServices();
    this.loadAllServicesForStats();
    this.setupStatsPolling();
  }

  ngOnDestroy(): void {
    this.statsPollInterval?.unsubscribe();
  }

  loadServices(isFilterOperation = false): void {
    if (isFilterOperation) {
      this.isFiltering.set(true);
    } else {
      this.store.setLoading(true);
    }
    this.adminService.getAdminServices({
      page: 1,
      limit: 10,
      search: this.searchQuery() || undefined,
      active: this.statusFilter() === 'active' ? true :
              this.statusFilter() === 'inactive' ? false :
              undefined,
      category: this.categoryFilter() || undefined,
    }).subscribe({
      next: (response) => {
        this.store.setServices(response.items, response.meta.total, response.meta.page);
        if (isFilterOperation) {
          this.isFiltering.set(false);
        } else {
          this.store.setLoading(false);
        }
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to load services'),
    });
  }

  private loadAllServicesForStats(): void {
    this.adminService.getServicesSummary().subscribe({
      next: summary => {
        this.store.setServicesSummary(summary);
      },
      error: () => {},
    });
  }

  private setupStatsPolling(): void {
    this.statsPollInterval = interval(60000).subscribe(() => {
      this.loadAllServicesForStats();
    });
  }

  toggleView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  viewService(svc: AdminServiceItem): void {
    this.isViewMode.set(true);
    this.isEdit.set(false);
    this.selectedService.set(svc);
    this.formName = svc.name;
    this.formDescription = svc.description;
    this.formDuration = svc.duration;
    this.formPrice = svc.price;
    this.formActive = svc.active;
    this.formImageUrl = svc.imageUrl ?? '';
    this.formPricePerMinute = svc.pricePerMinute ?? null;
    this.formTaxRate = svc.taxRate ?? null;
    this.submitted.set(false);
    this.formErrors = {};
    this.serviceDialogVisible.set(true);
  }

  openNew(): void {
    this.resetForm();
    this.isEdit.set(false);
    this.isViewMode.set(false);
    this.selectedService.set(null);
    this.submitted.set(false);
    this.formErrors = {};
    this.serviceDialogVisible.set(true);
  }

  editService(svc: AdminServiceItem): void {
    this.isEdit.set(true);
    this.isViewMode.set(false);
    this.selectedService.set(svc);
    this.formName = svc.name;
    this.formDescription = svc.description;
    this.formDuration = svc.duration;
    this.formPrice = svc.price;
    this.formActive = svc.active;
    this.formImageUrl = svc.imageUrl ?? '';
    this.formPricePerMinute = svc.pricePerMinute ?? null;
    this.formTaxRate = svc.taxRate ?? null;
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
    if (this.formPrice === null || this.formPrice <= 0) {
      this.formErrors.price = 'Price is required and must be positive';
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
        taxRate: this.formTaxRate ?? undefined,
      };
      this.adminService.updateAdminService(this.selectedService()!.id, updates).subscribe({
        next: () => {
          this.store.updateServiceInList(this.selectedService()!.id, updates);
          this.loadAllServicesForStats();
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
        taxRate: this.formTaxRate ?? undefined,
      };
      this.adminService.createAdminService(dto).subscribe({
        next: (svc) => {
          this.store.setServices([...this.store.services(), svc], this.store.servicesTotal() + 1, this.store.servicesPage());
          this.loadAllServicesForStats();
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
        this.loadAllServicesForStats();
        this.deleteDialogVisible.set(false);
        this.serviceToDelete.set(null);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to delete service'),
    });
  }

  applyFilter(): void {
    this.loadServices(true);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.applyFilter();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.categoryFilter.set('');
    this.statusFilter.set('');
    this.loadServices(true);
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.selectedFile.set(file);
    this.imageUploading.set(true);

    const id = this.selectedService()?.id;
    if (!id) {
      this.imageUploading.set(false);
      return;
    }

    this.adminService.uploadServiceImage(id, file).subscribe({
      next: (result) => {
        this.formImageUrl = result.imageUrl;
        this.selectedFile.set(null);
        this.imageUploading.set(false);
      },
      error: () => {
        this.imageUploading.set(false);
      },
    });
  }

  private resetForm(): void {
    this.formName = '';
    this.formDescription = '';
    this.formDuration = null;
    this.formPrice = null;
    this.formActive = true;
    this.formImageUrl = '';
    this.formPricePerMinute = null;
    this.formTaxRate = null;
    this.selectedFile.set(null);
    this.formErrors = {};
  }
}
