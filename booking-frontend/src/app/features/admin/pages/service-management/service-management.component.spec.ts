import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceManagementComponent } from './service-management.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminServiceItem } from '../../dto/admin.dto';
import { of } from 'rxjs';

describe('ServiceManagementComponent', () => {
  let component: ServiceManagementComponent;
  let fixture: ComponentFixture<ServiceManagementComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn(),
      getUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 10 })),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    TestBed.configureTestingModule({
      imports: [ServiceManagementComponent],
      providers: [
        AdminStore,
        { provide: AdminService, useValue: mockAdminService },
      ],
    });

    fixture = TestBed.createComponent(ServiceManagementComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(AdminStore);
    // First detectChanges triggers ngOnInit
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty services', () => {
    expect(component.vm().services.length).toBe(0);
  });

  it('should display services from store', () => {
    const services: AdminServiceItem[] = [
      { id: '1', name: 'Haircut', description: 'Standard cut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    store.setServices(services, 1, 1);

    expect(component.vm().services.length).toBe(1);
    expect(component.vm().services[0].name).toBe('Haircut');
  });

  it('should open service dialog for creating new service', () => {
    component.openNew();
    expect(component.serviceDialogVisible()).toBe(true);
    expect(component.selectedService()).toBeNull();
  });

  it('should open service dialog for editing existing service', () => {
    const svc: AdminServiceItem = {
      id: '1', name: 'Haircut', description: 'Standard cut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T00:00:00Z',
    };

    component.editService(svc);
    expect(component.serviceDialogVisible()).toBe(true);
    expect(component.selectedService()?.id).toBe('1');
  });

  it('should close service dialog', () => {
    component.openNew();
    component.closeDialog();
    expect(component.serviceDialogVisible()).toBe(false);
    expect(component.selectedService()).toBeNull();
  });

  it('should load services on init', () => {
    expect(mockAdminService.getAdminServices).toHaveBeenCalled();
  });

  // ==========================================
  // [RED] Enhanced tests for redesigned features
  // ==========================================

  it('[RED] should compute stats from services list', () => {
    const services: AdminServiceItem[] = [
      { id: '1', name: 'Haircut', description: 'Cut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: '2', name: 'Massage', description: 'Massage', duration: 60, price: 50, active: true, createdAt: '2026-01-02T00:00:00Z' },
      { id: '3', name: 'Old Service', description: 'Old', duration: 45, price: 40, active: false, createdAt: '2026-01-03T00:00:00Z' },
    ];
    store.setServices(services, 3, 1);

    expect(component.totalServices()).toBe(3);
    expect(component.activeServicesCount()).toBe(2);
    expect(component.averagePrice()).toBeCloseTo(38.33, 1);
  });

  it('[RED] should toggle view mode between grid and list', () => {
    expect(component.viewMode()).toBe('list');

    component.toggleView('grid');
    expect(component.viewMode()).toBe('grid');

    component.toggleView('list');
    expect(component.viewMode()).toBe('list');
  });

  it('[RED] should clear filters when clearFilters is called', () => {
    component.searchQuery.set('Haircut');
    component.categoryFilter.set('Category A');
    component.statusFilter.set('active');

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.categoryFilter()).toBe('');
    expect(component.statusFilter()).toBe('');
  });

  it('[RED] should validate form on save with empty name', () => {
    component.formName = '';
    component.formDuration = null;
    component.openNew();
    component.saveService();

    expect(component.submitted()).toBe(true);
    expect(component.formErrors.name).toBe('Service name is required');
  });

  it('[RED] should show confirm delete dialog and delete service', () => {
    const svc: AdminServiceItem = {
      id: '1', name: 'Haircut', description: 'Cut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T00:00:00Z',
    };
    mockAdminService.deleteAdminService.mockReturnValue(of(null));

    component.confirmDeleteService(svc);
    expect(component.deleteDialogVisible()).toBe(true);
    expect(component.serviceToDelete()?.id).toBe('1');

    component.deleteService();
    expect(mockAdminService.deleteAdminService).toHaveBeenCalledWith('1');
  });
});
