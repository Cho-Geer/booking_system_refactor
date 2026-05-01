import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { AuthStore } from '../../stores/auth/auth.store';
import { ApiService } from '../../core/services/api.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

/**
 * Responsive Design Tests for Profile Component
 * Tests: avatar card responsiveness, full-width buttons on mobile
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

  describe('responsive avatar card', () => {
    it('[RED] should render avatar card with glass styling', () => {
      const avatarCard = fixture.nativeElement.querySelector('.glass-level-2');
      expect(avatarCard).toBeTruthy();
      // Full width on mobile (w-full is on the card by default)
    });
  });

  describe('touch-friendly targets', () => {
    it('[RED] should have edit button with data-testid for identification', () => {
      const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-button"]');
      expect(editBtn).toBeTruthy();
      // Touch target size min-h-[44px] is applied via Tailwind class
    });

    it('[RED] should have save and cancel buttons in edit mode', () => {
      component.isEditing.set(true);
      fixture.detectChanges();

      const saveBtn = fixture.nativeElement.querySelector('[data-testid="save-button"]');
      const cancelBtn = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(saveBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
      // Touch target min-h-[44px] and w-full classes applied via Tailwind
    });

    it('[RED] should have change password button', () => {
      const changePwdBtn = fixture.nativeElement.querySelector('[data-testid="change-password-button"]');
      expect(changePwdBtn).toBeTruthy();
    });
  });

  describe('password dialog responsive', () => {
    it('[RED] should render password dialog overlay on click', () => {
      component.showPasswordDialog();
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.glass-overlay');
      expect(overlay).toBeTruthy();
    });

    it('[RED] should have responsive dialog that is full-screen on mobile', () => {
      component.showPasswordDialog();
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('.glass-level-3');
      expect(dialog).toBeTruthy();
      // Should have rounded-none on mobile (sm:rounded-2xl for larger)
      expect(dialog.classList.contains('rounded-none')).toBeTruthy();
      expect(dialog.classList.contains('sm:rounded-2xl')).toBeTruthy();
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
      expect(saveBtn.classList.contains('w-full')).toBeTruthy();
      expect(cancelBtn.classList.contains('w-full')).toBeTruthy();
    });
  });
});
