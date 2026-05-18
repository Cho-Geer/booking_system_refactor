import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminUser, StatCard } from '../../dto/admin.dto';
import { of } from 'rxjs';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn().mockReturnValue(
        of({
          totalBookings: {
            value: 100,
            changePercentage: 0,
            isPositive: true,
            target: 1000,
            progressPercentage: 10,
          },
          todayBookings: {
            value: 10,
            changePercentage: 0,
            isPositive: true,
            target: 100,
            progressPercentage: 10,
          },
          pendingBookings: {
            value: 0,
            changePercentage: 0,
            isPositive: true,
            target: 50,
            progressPercentage: 0,
          },
          activeUsers: {
            value: 50,
            changePercentage: 0,
            isPositive: true,
            target: 1500,
            progressPercentage: 3,
          },
          totalRevenue: {
            value: 5000,
            changePercentage: 0,
            isPositive: true,
            target: 10000,
            progressPercentage: 50,
          },
          bookingTrend: [],
          servicePopularity: [],
        }),
      ),
      getUsers: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 10 })),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminServices: jest.fn(),
      createAdminService: jest.fn(),
      updateAdminService: jest.fn(),
      deleteAdminService: jest.fn(),
      getAdminAppointments: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [AdminStore, { provide: AdminService, useValue: mockAdminService }],
    });

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(AdminStore);
    // First detectChanges triggers ngOnInit, which calls loadUsers with mock empty data
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty users', () => {
    expect(component.vm().users.length).toBe(0);
  });

  it('should display users from store', () => {
    const users: AdminUser[] = [
      {
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    store.setUsers(users, 1, 1);

    expect(component.vm().users.length).toBe(1);
    expect(component.vm().users[0].name).toBe('Alice');
  });

  it('should open user dialog for creating new user', () => {
    component.openNew();
    expect(component.userDialogVisible()).toBe(true);
    expect(component.selectedUser()).toBeNull();
  });

  it('should open user dialog for editing existing user', () => {
    const user: AdminUser = {
      id: '1',
      name: 'Alice',
      email: 'alice@test.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };

    component.editUser(user);
    expect(component.userDialogVisible()).toBe(true);
    expect(component.selectedUser()?.id).toBe('1');
  });

  it('should close user dialog', () => {
    component.openNew();
    component.closeDialog();
    expect(component.userDialogVisible()).toBe(false);
    expect(component.selectedUser()).toBeNull();
  });

  it('should load users on init', () => {
    expect(mockAdminService.getUsers).toHaveBeenCalled();
  });

  // ==========================================
  // Enhanced tests for redesigned features
  // ==========================================

  it('should compute stats from users list', () => {
    const users: AdminUser[] = [
      {
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: '2026-05-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-04-01T00:00:00Z',
      },
      {
        id: '3',
        name: 'Carol',
        email: 'carol@test.com',
        role: 'CUSTOMER',
        status: 'INACTIVE',
        createdAt: '2026-05-02T00:00:00Z',
      },
    ];
    store.setUsers(users, 3, 1);
    store.setAllUsersForStats(users);

    expect(component.totalUsers()).toBe(3);
    expect(component.activeUsers()).toBe(2);
    expect(component.newThisWeek()).toBeGreaterThanOrEqual(2);
  });

  it('should clear all filters when clearFilters is called', () => {
    component.searchQuery.set('Alice');
    component.selectedRoleFilter.set('ADMIN');
    component.selectedStatusFilter.set('ACTIVE');

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedRoleFilter()).toBe('');
    expect(component.selectedStatusFilter()).toBe('');
  });

  it('should validate form on save with empty name', () => {
    component.formName = '';
    component.formEmail = '';
    component.openNew();
    component.saveUser();

    expect(component.submitted()).toBe(true);
    expect(component.formErrors.name).toBe('Name is required');
  });

  it('should map role to badge status correctly', () => {
    expect(component.mapRoleToBadge('CUSTOMER')).toBe('confirmed');
    expect(component.mapRoleToBadge('ADMIN')).toBe('pending');
    expect(component.mapRoleToBadge('SUPER_ADMIN')).toBe('pending');
  });

  it('should map status to badge correctly', () => {
    expect(component.mapStatusToBadge('ACTIVE')).toBe('confirmed');
    expect(component.mapStatusToBadge('INACTIVE')).toBe('pending');
    expect(component.mapStatusToBadge('BLOCKED')).toBe('cancelled');
  });

  it('should show confirm delete dialog and delete user', () => {
    const user: AdminUser = {
      id: '1',
      name: 'Alice',
      email: 'alice@test.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockAdminService.deleteUser.mockReturnValue(of(null));

    component.confirmDeleteUser(user);
    expect(component.deleteDialogVisible()).toBe(true);
    expect(component.userToDelete()?.id).toBe('1');

    component.deleteUser();
    expect(mockAdminService.deleteUser).toHaveBeenCalledWith('1');
  });
});
