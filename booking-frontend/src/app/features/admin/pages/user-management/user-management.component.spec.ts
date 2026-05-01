import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminUser } from '../../dto/admin.dto';
import { of } from 'rxjs';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let store: InstanceType<typeof AdminStore>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn(),
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
      providers: [
        AdminStore,
        { provide: AdminService, useValue: mockAdminService },
      ],
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
      { id: '1', name: 'Alice', email: 'al***@test.com', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' },
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
      id: '1', name: 'Alice', email: 'al***@test.com', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z',
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
});
