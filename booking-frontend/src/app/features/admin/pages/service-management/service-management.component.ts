import { Component, inject, OnInit, signal } from '@angular/core';
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
import { Tag } from 'primeng/tag';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import {
  AdminServiceItem,
  CreateAdminServiceRequest,
  UpdateAdminServiceRequest,
} from '../../dto/admin.dto';

@Component({
  selector: 'app-service-management',
  standalone: true,
  imports: [
    TableModule, Dialog, ButtonModule, InputTextModule, InputNumberModule,
    Textarea, SelectModule, ToggleSwitch, FormsModule, Tag, CurrencyPipe,
  ],
  templateUrl: './service-management.component.html',
  styleUrl: './service-management.component.scss',
})
export class ServiceManagementComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;

  // Dialog state
  readonly serviceDialogVisible = signal(false);
  readonly deleteDialogVisible = signal(false);
  readonly selectedService = signal<AdminServiceItem | null>(null);
  readonly serviceToDelete = signal<AdminServiceItem | null>(null);
  readonly isEdit = signal(false);
  readonly submitted = signal(false);

  // Search/filter
  readonly searchQuery = signal('');
  readonly activeFilter = signal<boolean | undefined>(undefined);

  // Form model
  formName = '';
  formDescription = '';
  formDuration: number | null = null;
  formPrice: number | null = null;
  formActive = true;
  formImageUrl = '';

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.store.setLoading(true);
    this.adminService.getAdminServices({
      page: 1,
      limit: 10,
      search: this.searchQuery() || undefined,
      active: this.activeFilter(),
    }).subscribe({
      next: (response) => {
        this.store.setServices(response.items, response.total, response.page);
        this.store.setLoading(false);
      },
      error: (err) => this.store.setError(err.message ?? 'Failed to load services'),
    });
  }

  openNew(): void {
    this.resetForm();
    this.isEdit.set(false);
    this.selectedService.set(null);
    this.submitted.set(false);
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

  getActiveSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  private resetForm(): void {
    this.formName = '';
    this.formDescription = '';
    this.formDuration = null;
    this.formPrice = null;
    this.formActive = true;
    this.formImageUrl = '';
  }
}
