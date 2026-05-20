import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AdminUser, StatCard } from '../../dto/admin.dto';
import { of, throwError, Observable } from 'rxjs';

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
      createUser: jest.fn().mockReturnValue(of({ id: '1', name: 'Test', email: 'test@test.com', role: 'CUSTOMER', status: 'ACTIVE', createdAt: new Date().toISOString() })),
      sendCode: jest.fn().mockReturnValue(of({ maskedContact: 'us***@example.com', expiresIn: 300 })),
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

  // ==========================================
  // RED Phase: Admin New User Dialog — missing features
  // These tests MUST FAIL because the features they
  // test (Confirm Password, toggle, in-dialog error,
  // loading state) do not exist yet.
  // GREEN phase will implement them.
  // ==========================================

  describe('[RED] New User Dialog — Confirm Password', () => {
    it('[RED] should display confirm password input when creating new user', () => {
      component.openNew();
      component['verificationStep'].set(3);
      fixture.detectChanges();
      fixture.detectChanges();
      const confirmPasswordInput = fixture.nativeElement.querySelector(
        '[data-testid="confirm-password-input"]',
      );
      // FAILS: No confirm password input exists in the template
      expect(confirmPasswordInput).toBeTruthy();
    });

    it('[RED] should fail validation when confirm password does not match', () => {
      component.openNew();
      component.formPassword = 'password123';
      // formConfirmPassword field does not exist yet — will be added in GREEN
      component['formConfirmPassword'] = 'different456';
      component.saveUser();
      // Password mismatch validation does not exist — formErrors.confirmPassword will be undefined
      const confirmPasswordError = component.formErrors['confirmPassword'];
      expect(confirmPasswordError).toBeDefined();
    });
  });

  describe('[RED] New User Dialog — Password Visibility Toggle', () => {
    it('[RED] should have password visibility toggle button on password field', () => {
      component.openNew();
      component['verificationStep'].set(3);
      fixture.detectChanges();
      fixture.detectChanges();
      // No eye/eye-slash toggle button exists in the template yet
      const toggleBtn = fixture.nativeElement.querySelector(
        '[data-testid="password-toggle-btn"]',
      );
      // FAILS: No password toggle button exists
      expect(toggleBtn).toBeTruthy();
    });
  });

  describe('[RED] New User Dialog — API Error Inside Modal', () => {
    it('[RED] should display API error message inside the dialog when save fails', () => {
      const errorMessage = 'Email already exists';
      mockAdminService.createUser.mockReturnValue(
        throwError(() => new Error(errorMessage)),
      );
      component.openNew();
      component.formName = 'Test User';
      component.formEmail = 'test@test.com';
      component.formPassword = 'password123';
      component.saveUser();
      fixture.detectChanges();

      // Error is currently displayed outside the modal (above table).
      // It should also appear INSIDE the modal dialog.
      const dialogError = fixture.nativeElement.querySelector('.dialog-error');
      // FAILS: No in-dialog error element exists
      expect(dialogError).toBeTruthy();
      expect(dialogError?.textContent).toContain(errorMessage);
    });
  });

  describe('[RED] New User Dialog — Save Loading State', () => {
    it('[RED] should set isSaving signal and disable save button during API call', () => {
      // Return a never-completing observable to simulate in-flight API
      mockAdminService.createUser.mockReturnValue(new Observable<AdminUser>(() => {}));

      component.openNew();
      component['verificationStep'].set(3);
      fixture.detectChanges();
      component.formName = 'Test User';
      component.formEmail = 'test@test.com';
      component.formPassword = 'password123';
      fixture.detectChanges();

      component.saveUser();

      // isSaving signal does not exist yet — will be added in GREEN
      expect(component['isSaving']).toBeDefined();
      expect(component['isSaving']?.()).toBe(true);

      fixture.detectChanges();

      // Save button should have a loading/disabled state
      const saveBtn = fixture.nativeElement.querySelector('[data-testid="save-user-btn"]');
      // FAILS: No loading/disabled state on save button
      expect(saveBtn?.hasAttribute('disabled')).toBe(true);
    });
  });

  // ==========================================
  // [T-ADMIN-VERIFY-004] RED Phase: Verification Code UI Tests
  // These tests MUST FAIL because the verification code UI
  // (step switching, send code interaction, code validation,
  //  anti-enumeration, API calls) does not exist yet.
  // GREEN phase will implement them in the component.
  // ==========================================

  describe('[RED] Verification Code — Step Switching', () => {
    beforeEach(() => {
      component.openNew();
    });

    it('[RED] should start at verificationStep 1 when opening new user dialog', () => {
      // verificationStep signal does not exist yet
      expect(component['verificationStep']).toBeDefined();
      expect(component['verificationStep']()).toBe(1);
    });

    it('[RED] should transition from Step 1 to Step 2 when sendCode succeeds with maskedContact', () => {
      // sendCode() method and verificationStep signal do not exist yet
      component['contactType'].set('EMAIL');
      component['formEmail'] = 'admin@test.com';
      component['sendCode']();
      // FAILS: No sendCode method or verificationStep signal exists
      expect(component['verificationStep']()).toBe(2);
    });

    it('[RED] should transition from Step 2 to Step 3 when verifyCodeAndProceed succeeds', () => {
      // verifyCodeAndProceed() method does not exist yet
      component['verificationStep'].set(2);
      component['verificationCode'].set('123456');
      component['verifyCodeAndProceed']();
      // FAILS: No verifyCodeAndProceed method exists
      expect(component['verificationStep']()).toBe(3);
    });

    it('[RED] should return to Step 1 when cancelVerification is called at Step 2', () => {
      // cancelVerification() method does not exist yet
      component['verificationStep'].set(2);
      component['cancelVerification']();
      // FAILS: No cancelVerification method exists
      expect(component['verificationStep']()).toBe(1);
    });
  });

  describe('[RED] Verification Code — Send Code Interaction', () => {
    beforeEach(() => {
      component.openNew();
    });

    it('[RED] should have contactType signal default to EMAIL', () => {
      // contactType signal does not exist yet
      expect(component['contactType']).toBeDefined();
      expect(component['contactType']()).toBe('EMAIL');
    });

    it('[RED] should toggle contactType from EMAIL to PHONE', () => {
      // contactType signal and toggleContactType method do not exist yet
      expect(component['contactType']).toBeDefined();
      component['contactType'].set('EMAIL');
      component['toggleContactType']();
      // FAILS: No toggleContactType method exists
      expect(component['contactType']()).toBe('PHONE');
    });

    it('[RED] should disable send button when countdown is greater than 0', () => {
      // countdown signal does not exist yet
      expect(component['countdown']).toBeDefined();
      component['countdown'].set(45);
      // FAILS: No countdown signal or isSendDisabled computed exists
      expect(component['isSendDisabled']()).toBe(true);
    });

    it('[RED] should decrement countdown from 60 to 0', () => {
      jest.useFakeTimers();
      component['countdown'].set(60);
      component['startCountdown']();
      jest.advanceTimersByTime(60000);
      expect(component['countdown']()).toBe(0);
      jest.useRealTimers();

    it('[RED] should re-enable send button when countdown reaches 0', () => {
      // isSendDisabled computed does not exist yet
      component['countdown'].set(0);
      // FAILS: No isSendDisabled computed signal exists
      expect(component['isSendDisabled']()).toBe(false);
    });
  });

  describe('[RED] Verification Code — Code Validation', () => {
    beforeEach(() => {
      component.openNew();
      component['verificationStep'].set(2);
    });

    it('[RED] should accept valid 6-digit verification code', () => {
      // verificationCode signal and isCodeValid computed do not exist yet
      expect(component['verificationCode']).toBeDefined();
      component['verificationCode'].set('123456');
      // FAILS: No isCodeValid computed exists
      expect(component['isCodeValid']()).toBe(true);
    });

    it('[RED] should reject non-numeric verification code input', () => {
      // isCodeValid computed does not exist yet
      component['verificationCode'].set('abc123');
      // FAILS: Non-numeric should be rejected
      expect(component['isCodeValid']()).toBe(false);
    });

    it('[RED] should reject verification code with less than 6 digits', () => {
      component['verificationCode'].set('12345');
      expect(component['isCodeValid']()).toBe(false);
    });

    it('[RED] should reject verification code with more than 6 digits', () => {
      component['verificationCode'].set('1234567');
      expect(component['isCodeValid']()).toBe(false);
    });
  });

  describe('[RED] Verification Code — Anti-Enumeration', () => {
    beforeEach(() => {
      component.openNew();
    });

    it('[RED] should show generic success message when sendCode returns no maskedContact (anti-enumeration)', () => {
      // maskedContact signal does not exist yet; dialogMessage signal does not exist yet
      component['contactType'].set('EMAIL');
      component['formEmail'] = 'unknown@test.com';
      component['sendCode']();
      // FAILS: No dialogMessage signal exists to show generic message
      expect(component['dialogMessage']).toBeDefined();
      expect(component['dialogMessage']()).toContain('sent');
    });
  });

  describe('[RED] Verification Code — API Call Verification', () => {
    beforeEach(() => {
      component.openNew();
    });

    it('[RED] should call adminService.sendCode with correct contact type and email payload', () => {
      // adminService.sendCode does not exist yet
      component['contactType'].set('EMAIL');
      component['formEmail'] = 'admin@test.com';
      component['sendCode']();
      // FAILS: adminService.sendCode is not a function
      expect(mockAdminService['sendCode']).toHaveBeenCalledWith({
        contact_type: 'EMAIL',
        email: 'admin@test.com',
      });
    });

    it('[RED] should call adminService.createUser with verification_code in request body', () => {
      // createUserWithCode method does not exist yet — passes verificationCode in body
      component['verificationStep'].set(3);
      component['formName'] = 'New User';
      component['formEmail'] = 'new@test.com';
      component['formRole'] = 'CUSTOMER';
      component['formPassword'] = 'Pass1234';
      component['verificationCode'].set('654321');
      component['createUserWithCode']();
      // FAILS: createUserWithCode method and verification_code in body do not exist
      expect(mockAdminService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New User',
          email: 'new@test.com',
          verification_code: '654321',
        }),
      );
    });
  });
});
