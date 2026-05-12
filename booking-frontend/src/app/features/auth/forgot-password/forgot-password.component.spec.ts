import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthStore } from '../../../stores/auth/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { of, throwError } from 'rxjs';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStoreMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    authStoreMock = {
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      setLoading: jest.fn(),
      setError: jest.fn(),
    };

    apiServiceMock = {
      resetPasswordSendCode: jest.fn(),
      resetPasswordVerify: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordComponent,
        ReactiveFormsModule,
      ],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize step1 form with contact field', () => {
      expect(component.step1Form).toBeTruthy();
      expect(component.step1Form.get('contact')).toBeTruthy();
    });

    it('should initialize step2 form with code, newPassword, confirmPassword fields', () => {
      expect(component.step2Form).toBeTruthy();
      expect(component.step2Form.get('code')).toBeTruthy();
      expect(component.step2Form.get('newPassword')).toBeTruthy();
      expect(component.step2Form.get('confirmPassword')).toBeTruthy();
    });

    it('should initialize form fields as empty', () => {
      expect(component.step1Form.get('contact')?.value).toBe('');
      expect(component.step2Form.get('code')?.value).toBe('');
      expect(component.step2Form.get('newPassword')?.value).toBe('');
      expect(component.step2Form.get('confirmPassword')?.value).toBe('');
    });

    it('should reference store isLoading signal', () => {
      expect(component.isLoading).toBe(authStoreMock.isLoading);
    });

    it('should reference store error signal', () => {
      expect(component.error).toBe(authStoreMock.error);
    });

    it('should start on step 1', () => {
      expect(component.currentStep()).toBe(1);
    });

    it('should initialize resetSuccess as false', () => {
      expect(component.resetSuccess()).toBe(false);
    });

    it('should initialize maskedContact as null', () => {
      expect(component.maskedContact()).toBeNull();
    });

    it('should initialize showAntiEnumMessage as false', () => {
      expect(component.showAntiEnumMessage()).toBe(false);
    });
  });

  describe('form validation - step1', () => {
    it('should mark contact as invalid when empty', () => {
      const contactControl = component.step1Form.get('contact');
      expect(contactControl?.invalid).toBe(true);
      expect(contactControl?.errors?.['required']).toBe(true);
    });

    it('should mark contact as valid when filled with email', () => {
      const contactControl = component.step1Form.get('contact');
      contactControl?.setValue('test@example.com');
      expect(contactControl?.valid).toBe(true);
    });
  });

  describe('form validation - step2', () => {
    it('should mark code as invalid when empty', () => {
      const codeControl = component.step2Form.get('code');
      expect(codeControl?.invalid).toBe(true);
      expect(codeControl?.errors?.['required']).toBe(true);
    });

    it('should mark code as invalid when not 6 digits', () => {
      const codeControl = component.step2Form.get('code');
      codeControl?.setValue('123');
      expect(codeControl?.invalid).toBe(true);
    });

    it('should mark code as valid when 6 digits', () => {
      const codeControl = component.step2Form.get('code');
      codeControl?.setValue('123456');
      expect(codeControl?.valid).toBe(true);
    });

    it('should mark newPassword as invalid when empty', () => {
      const passwordControl = component.step2Form.get('newPassword');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.errors?.['required']).toBe(true);
    });

    it('should mark newPassword as invalid when not meeting strength requirements', () => {
      const passwordControl = component.step2Form.get('newPassword');
      passwordControl?.setValue('weak');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.errors?.['passwordStrength']).toBeTruthy();
    });

    it('should mark newPassword as valid when meeting all strength requirements', () => {
      const passwordControl = component.step2Form.get('newPassword');
      passwordControl?.setValue('StrongP@ss1word');
      expect(passwordControl?.valid).toBe(true);
    });
  });

  describe('passwordMatchValidator', () => {
    it('should return passwordMismatch error when passwords do not match', () => {
      component.step2Form.patchValue({
        newPassword: 'StrongP@ss1word',
        confirmPassword: 'different',
      });

      const error = component.passwordMatchValidator(component.step2Form);
      expect(error).toEqual({ passwordMismatch: true });
    });

    it('should return null when passwords match', () => {
      component.step2Form.patchValue({
        newPassword: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
      });

      const error = component.passwordMatchValidator(component.step2Form);
      expect(error).toBeNull();
    });

    it('should return null when both passwords are empty', () => {
      component.step2Form.patchValue({
        newPassword: '',
        confirmPassword: '',
      });

      const error = component.passwordMatchValidator(component.step2Form);
      expect(error).toBeNull();
    });
  });

  describe('onSendCode()', () => {
    it('should not send code when form is invalid', () => {
      component.onSendCode();

      expect(apiServiceMock.resetPasswordSendCode).not.toHaveBeenCalled();
      expect(authStoreMock.setLoading).not.toHaveBeenCalled();
    });

    it('should send verification code when contact is valid', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.resetPasswordSendCode.mockReturnValue(of({ maskedContact: 'te***@example.com', expiresIn: 300 }));

      component.onSendCode();

      expect(apiServiceMock.resetPasswordSendCode).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
      });
    });

    it('should set loading state before making API call', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.resetPasswordSendCode.mockReturnValue(of({ maskedContact: 'te***@example.com', expiresIn: 300 }));

      component.onSendCode();

      expect(authStoreMock.setLoading).toHaveBeenCalledWith(true);
    });

    it('should advance to step 2 on successful send with maskedContact', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.resetPasswordSendCode.mockReturnValue(of({ maskedContact: 'te***@example.com', expiresIn: 300 }));

      component.onSendCode();

      expect(component.currentStep()).toBe(2);
      expect(component.maskedContact()).toBe('te***@example.com');
    });

    it('should start countdown after sending code', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.resetPasswordSendCode.mockReturnValue(of({ maskedContact: 'te***@example.com', expiresIn: 300 }));

      component.onSendCode();

      expect(component.countdown()).toBe(60);
    });

    it('should show anti-enum message when no maskedContact returned', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.resetPasswordSendCode.mockReturnValue(of({ expiresIn: 300 }));

      component.onSendCode();

      expect(component.showAntiEnumMessage()).toBe(true);
      expect(component.currentStep()).toBe(1);
    });

    it('should not send code when countdown is active', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.countdown.set(30);
      apiServiceMock.resetPasswordSendCode.mockReturnValue(of({ maskedContact: 'te***@example.com', expiresIn: 300 }));

      component.onSendCode();

      expect(apiServiceMock.resetPasswordSendCode).not.toHaveBeenCalled();
    });
  });

  describe('onResetPassword()', () => {
    it('should not reset password when step2 form is invalid', () => {
      component.onResetPassword();

      expect(apiServiceMock.resetPasswordVerify).not.toHaveBeenCalled();
      expect(authStoreMock.setLoading).not.toHaveBeenCalled();
    });

    it('should call api.resetPasswordVerify with correct data', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        newPassword: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
      });
      apiServiceMock.resetPasswordVerify.mockReturnValue(of({ message: 'Password reset successful' }));

      component.onResetPassword();

      expect(apiServiceMock.resetPasswordVerify).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
        code: '123456',
        newPassword: 'StrongP@ss1word',
      });
    });

    it('should set resetSuccess to true on successful reset', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        newPassword: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
      });
      apiServiceMock.resetPasswordVerify.mockReturnValue(of({ message: 'Password reset successful' }));

      component.onResetPassword();

      expect(component.resetSuccess()).toBe(true);
    });

    it('should set error on reset failure', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        newPassword: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
      });
      apiServiceMock.resetPasswordVerify.mockReturnValue(throwError(() => new Error('Invalid or expired code')));

      component.onResetPassword();

      expect(authStoreMock.setError).toHaveBeenLastCalledWith('Invalid or expired code');
    });
  });

  describe('goToStep1()', () => {
    it('should reset to step 1 and clear error', () => {
      component.currentStep.set(2);
      component.countdown.set(30);
      component.goToStep1();

      expect(component.currentStep()).toBe(1);
      expect(authStoreMock.setError).toHaveBeenCalledWith(null);
      expect(component.countdown()).toBe(0);
    });
  });

  describe('goToLogin()', () => {
    it('should navigate to /auth/login', () => {
      jest.spyOn(router, 'navigate');
      component.goToLogin();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('template rendering', () => {
    it('should render step 1 by default', () => {
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeTruthy();
    });

    it('should render contact input field', () => {
      const contactInput = fixture.nativeElement.querySelector('#contact');
      expect(contactInput).toBeTruthy();
      expect(contactInput.type).toBe('email');
    });

    it('should not show error message when error is null', () => {
      const globalError = fixture.nativeElement.querySelector('.border-l-4');
      expect(globalError).toBeFalsy();
    });

    it('should show error message when error has value', () => {
      fixture.destroy();
      fixture = TestBed.createComponent(ForgotPasswordComponent);
      component = fixture.componentInstance;
      router = TestBed.inject(Router);
      authStoreMock.error.mockReturnValue('Reset failed');
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.border-l-4');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Reset failed');
    });

    it('should show login link', () => {
      const link = fixture.nativeElement.querySelector('a[routerLink="/auth/login"]');
      expect(link).toBeTruthy();
      expect(link.textContent.trim()).toBe('登录');
    });

    it('should show success state when resetSuccess is true', () => {
      fixture.destroy();
      fixture = TestBed.createComponent(ForgotPasswordComponent);
      component = fixture.componentInstance;
      router = TestBed.inject(Router);
      component.resetSuccess.set(true);
      fixture.detectChanges();

      const successEl = fixture.nativeElement.querySelector('.success-state');
      expect(successEl).toBeTruthy();
      expect(successEl.textContent).toContain('密码重置成功');
    });

    it('should have gradient-page-bg class on container', () => {
      const container = fixture.nativeElement.querySelector('.forgot-password-page');
      expect(container.classList.contains('gradient-page-bg')).toBe(true);
    });

    it('should have app-card element', () => {
      const card = fixture.nativeElement.querySelector('app-card');
      expect(card).toBeTruthy();
    });

    it('should have app-button for submit', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
