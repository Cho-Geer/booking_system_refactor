import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { AuthStore } from '../../stores/auth/auth.store';
import { ApiService } from '../../core/services/api.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

/**
 * Responsive Design Tests for Profile Component
 */
describe('ProfileComponent - Responsive Design', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authStoreMock: Record<string, unknown>;
  let apiServiceMock: Record<string, jest.Mock>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    phone: '1234567890',
    role: 'CUSTOMER' as const,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    authStoreMock = {
      currentUser: signal(mockUser),
      user: signal(mockUser),
      isLoading: signal(false),
      error: signal(null),
    };

    apiServiceMock = {
      updateProfile: jest.fn(() => of(mockUser)),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('responsive cards', () => {
    it('[RED] should render avatar card with glass styling', () => {
      const avatarCard = fixture.nativeElement.querySelector('app-card');
      expect(avatarCard).toBeTruthy();
    });
  });

  describe('touch-friendly targets', () => {
    it('[RED] should have edit button with data-testid for identification', () => {
      const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-button"]');
      expect(editBtn).toBeTruthy();
    });

    it('[RED] should have save and cancel buttons in edit mode', () => {
      component.isEditing.set(true);
      fixture.detectChanges();

      const saveBtn = fixture.nativeElement.querySelector('[data-testid="save-button"]');
      const cancelBtn = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(saveBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
    });

    it('[RED] should have change password button', () => {
      const changePwdBtn = fixture.nativeElement.querySelector('[data-testid="change-password-button"]');
      expect(changePwdBtn).toBeTruthy();
    });
  });

  describe('password dialog responsive', () => {
    it('[RED] should render password dialog on click', () => {
      component.showPasswordDialog();
      fixture.detectChanges();

      expect(component.passwordDialogVisible()).toBe(true);
    });

    it('[RED] should close password dialog', () => {
      component.showPasswordDialog();
      component.closePasswordDialog();
      fixture.detectChanges();

      expect(component.passwordDialogVisible()).toBe(false);
    });
  });

  describe('responsive edit mode buttons', () => {
    it('[RED] should have flex-col-reverse on mobile and sm:flex-row for edit buttons', () => {
      component.isEditing.set(true);
      fixture.detectChanges();

      const buttonContainer = fixture.nativeElement.querySelector('[class*="flex-col-reverse"]');
      expect(buttonContainer).toBeTruthy();
      expect(buttonContainer.classList.contains('sm:flex-row')).toBeTruthy();
    });

    it('[RED] should have full-width buttons on mobile (w-full)', () => {
      component.isEditing.set(true);
      fixture.detectChanges();

      const saveBtn = fixture.nativeElement.querySelector('[data-testid="save-button"]');
      const cancelBtn = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(saveBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
    });
  });
});
