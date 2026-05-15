import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { ApiService } from '../../core/services/api.service';
import { AuthStore, User } from '../../stores/auth/auth.store';
import { of, throwError } from 'rxjs';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStoreMock: any;

  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'tes***@example.com',
    phone: '138****5678',
    role: 'CUSTOMER',
    createdAt: '2026-01-15T08:00:00Z',
  };

  beforeEach(async () => {
    apiServiceMock = {
      updateProfile: jest.fn(),
    };

    authStoreMock = {
      user: jest.fn(() => mockUser),
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      currentUser: jest.fn(() => mockUser),
      setUserProfile: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AuthStore, useValue: authStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('initialization', () => {
    it('[RED] should fail: should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('[RED] should fail: should display user data from store', () => {
      expect(component.user()).toEqual(mockUser);
    });

    it('[RED] should fail: should not be in edit mode by default', () => {
      expect(component.isEditing()).toBe(false);
    });
  });

  describe('edit mode', () => {
    it('[RED] should fail: should enter edit mode', () => {
      component.toggleEdit();
      expect(component.isEditing()).toBe(true);
    });

    it('[RED] should fail: should pre-fill edit form with user name', () => {
      component.toggleEdit();
      expect(component.editName()).toBe('Test User');
    });

    it('[RED] should fail: should exit edit mode without saving', () => {
      component.toggleEdit();
      component.editName.set('Changed Name');
      component.cancelEdit();

      expect(component.isEditing()).toBe(false);
      expect(component.editName()).toBe('Test User');
    });
  });

  describe('save profile', () => {
    it('[GREEN] should call updateProfile and update store on save with flat response', () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      // Backend now returns flat object (no { user: ... } wrapper)
      const updateResponse = { ...updatedUser, _message: '资料已更新' };
      apiServiceMock.updateProfile.mockReturnValue(of(updateResponse));

      component.toggleEdit();
      component.editName.set('Updated Name');
      component.saveProfile();

      expect(apiServiceMock.updateProfile).toHaveBeenCalledWith({ name: 'Updated Name' });
      // Must read from flat response: response.name, NOT response.user.name
      expect(authStoreMock.setUserProfile).toHaveBeenCalledWith({
        id: updatedUser.id,
        name: 'Updated Name',
        role: updatedUser.role,
        email: updatedUser.email,
        phone: updatedUser.phone,
        createdAt: updatedUser.createdAt,
      });
      expect(component.isEditing()).toBe(false);
    });

    it('[GREEN] should NOT pass user wrapper to setUserProfile (regression: must read flat)', () => {
      // Simulate backend flat response: { id, name, role, ... } NOT { user: { ... } }
      const flatResponse = { ...mockUser, name: 'Admin Name', _message: '资料已更新' };
      apiServiceMock.updateProfile.mockReturnValue(of(flatResponse));

      component.toggleEdit();
      component.editName.set('Admin Name');
      component.saveProfile();

      // Verify setUserProfile is called with flat data, NOT { user: { ... } }
      const callArgs = authStoreMock.setUserProfile.mock.calls[0][0];
      expect(callArgs.id).toBe(mockUser.id);
      // Must read response.name directly (flat), NOT response.user.name
      expect(callArgs.name).toBe('Admin Name');
      expect(callArgs.role).toBe(mockUser.role);
      // Must NOT have .user wrapper — critical regression check
      expect(callArgs.user).toBeUndefined();
    });

    it('[RED] should fail: should not save when name is empty', () => {
      component.toggleEdit();
      component.editName.set('');
      component.saveProfile();

      expect(apiServiceMock.updateProfile).not.toHaveBeenCalled();
    });

    it('[RED] should fail: should handle save error', () => {
      apiServiceMock.updateProfile.mockReturnValue(throwError(() => new Error('Update failed')));

      component.toggleEdit();
      component.editName.set('New Name');
      component.saveProfile();

      expect(component.saveError()).toBe('Update failed');
      expect(component.isEditing()).toBe(true); // stay in edit mode on error
    });
  });

  describe('change password dialog', () => {
    it('[RED] should fail: should show password dialog', () => {
      component.showPasswordDialog();
      expect(component.passwordDialogVisible()).toBe(true);
    });

    it('[RED] should fail: should hide password dialog', () => {
      component.showPasswordDialog();
      component.closePasswordDialog();
      expect(component.passwordDialogVisible()).toBe(false);
    });
  });

  describe('template rendering', () => {
    it('[RED] should fail: should display user name', () => {
      const nameEl = fixture.nativeElement.querySelector('[data-testid="user-name"]');
      expect(nameEl).toBeTruthy();
      expect(nameEl.textContent).toContain('Test User');
    });

    it('[RED] should fail: should display masked email', () => {
      const emailEl = fixture.nativeElement.querySelector('[data-testid="user-email"]');
      expect(emailEl).toBeTruthy();
      expect(emailEl.textContent).toContain('tes***@example.com');
    });

    it('[RED] should fail: should display masked phone', () => {
      const phoneEl = fixture.nativeElement.querySelector('[data-testid="user-phone"]');
      expect(phoneEl).toBeTruthy();
      expect(phoneEl.textContent).toContain('138****5678');
    });

    it('[RED] should fail: should show edit button when not editing', () => {
      const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-button"]');
      expect(editBtn).toBeTruthy();
    });

    it('[RED] should fail: should show save/cancel buttons when editing', () => {
      component.toggleEdit();
      fixture.detectChanges();

      const saveBtn = fixture.nativeElement.querySelector('[data-testid="save-button"]');
      const cancelBtn = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(saveBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
    });
  });

  // ==========================================
  // [FE-ROLE-UNIFY] userType → role rename
  // ==========================================

  describe('[RoleRename] profile uses role not userType', () => {
    it('template should use u.role not u.userType [RED] fails because template uses userType', () => {
      const fs = require('fs');
      const path = require('path');
      const templatePath = path.resolve(__dirname, './profile.component.html');
      const content = fs.readFileSync(templatePath, 'utf-8');

      // TARGET: template references u.role
      // CURRENT: template references u.userType on lines 23 and 89 → this FAILS
      expect(content).not.toContain('u.userType');
    });

    it('template badge should reference u.role [RED] fails because template uses u.userType ===', () => {
      const fs = require('fs');
      const path = require('path');
      const templatePath = path.resolve(__dirname, './profile.component.html');
      const content = fs.readFileSync(templatePath, 'utf-8');

      // TARGET: badge uses u.role === 'CUSTOMER'
      // CURRENT: uses u.userType === 'CUSTOMER' on line 23 → this FAILS
      expect(content).not.toContain("u.userType === 'CUSTOMER'");
    });

    it('saveProfile should use response.user.role not response.user.userType [RED]', () => {
      const fs = require('fs');
      const path = require('path');
      const profilePath = path.resolve(__dirname, './profile.component.ts');
      const content = fs.readFileSync(profilePath, 'utf-8');

      // TARGET: saveProfile maps response.user.role
      // CURRENT: maps response.user.userType on line 85 → this FAILS
      expect(content).not.toContain('response.user.userType');
    });
  });
});
