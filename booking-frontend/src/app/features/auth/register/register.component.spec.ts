import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthStore } from '../../../stores/auth/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStoreMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiServiceMock: any;
  let socketServiceMock: { connect: jest.Mock };
  let router: Router;

  beforeEach(async () => {
    authStoreMock = {
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      setLoading: jest.fn(),
      setError: jest.fn(),
      loginSuccess: jest.fn(),
      setUserProfile: jest.fn(),
    };

    apiServiceMock = {
      registerSendCode: jest.fn(),
      registerComplete: jest.fn(),
      getUserProfile: jest.fn(),
    };

    socketServiceMock = {
      connect: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        ReactiveFormsModule,
      ],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: SocketService, useValue: socketServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
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

    it('should initialize step2 form with code, password, confirmPassword, name fields', () => {
      expect(component.step2Form).toBeTruthy();
      expect(component.step2Form.get('code')).toBeTruthy();
      expect(component.step2Form.get('password')).toBeTruthy();
      expect(component.step2Form.get('confirmPassword')).toBeTruthy();
      expect(component.step2Form.get('name')).toBeTruthy();
    });

    it('should initialize form fields as empty', () => {
      expect(component.step1Form.get('contact')?.value).toBe('');
      expect(component.step2Form.get('code')?.value).toBe('');
      expect(component.step2Form.get('password')?.value).toBe('');
      expect(component.step2Form.get('confirmPassword')?.value).toBe('');
      expect(component.step2Form.get('name')?.value).toBe('');
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
  });

  describe('form validation - step1', () => {
    it('should mark contact as invalid when empty', () => {
      const contactControl = component.step1Form.get('contact');
      expect(contactControl?.invalid).toBe(true);
      expect(contactControl?.errors?.['required']).toBe(true);
    });

    it('should mark contact as valid when filled', () => {
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

    it('should mark name as invalid when empty', () => {
      const nameControl = component.step2Form.get('name');
      expect(nameControl?.invalid).toBe(true);
      expect(nameControl?.errors?.['required']).toBe(true);
    });

    it('should mark name as valid when filled', () => {
      const nameControl = component.step2Form.get('name');
      nameControl?.setValue('John Doe');
      expect(nameControl?.valid).toBe(true);
    });

    it('should mark password as invalid when empty', () => {
      const passwordControl = component.step2Form.get('password');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.errors?.['required']).toBe(true);
    });

    it('should mark password as invalid when not meeting strength requirements', () => {
      const passwordControl = component.step2Form.get('password');
      passwordControl?.setValue('weak');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.errors?.['passwordStrength']).toBeTruthy();
    });

    it('should mark password as valid when meeting all strength requirements', () => {
      const passwordControl = component.step2Form.get('password');
      passwordControl?.setValue('StrongP@ss1word');
      expect(passwordControl?.valid).toBe(true);
    });
  });

  describe('passwordMatchValidator', () => {
    it('should return passwordMismatch error when passwords do not match', () => {
      component.step2Form.patchValue({
        password: 'StrongP@ss1word',
        confirmPassword: 'different',
      });

      const error = component.passwordMatchValidator(component.step2Form);
      expect(error).toEqual({ passwordMismatch: true });
    });

    it('should return null when passwords match', () => {
      component.step2Form.patchValue({
        password: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
      });

      const error = component.passwordMatchValidator(component.step2Form);
      expect(error).toBeNull();
    });

    it('should return null when both passwords are empty', () => {
      component.step2Form.patchValue({
        password: '',
        confirmPassword: '',
      });

      const error = component.passwordMatchValidator(component.step2Form);
      expect(error).toBeNull();
    });
  });

  describe('onSendCode()', () => {
    it('should not send code when form is invalid', () => {
      component.onSendCode();

      expect(apiServiceMock.registerSendCode).not.toHaveBeenCalled();
      expect(authStoreMock.setLoading).not.toHaveBeenCalled();
    });

    it('should send verification code when contact is valid', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.registerSendCode.mockReturnValue(of({ success: true }));

      component.onSendCode();

      expect(apiServiceMock.registerSendCode).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
      });
    });

    it('should set loading state before making API call', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.registerSendCode.mockReturnValue(of({ success: true }));

      component.onSendCode();

      expect(authStoreMock.setLoading).toHaveBeenCalledWith(true);
    });

    it('should advance to step 2 on successful send', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.registerSendCode.mockReturnValue(of({ success: true }));

      component.onSendCode();

      expect(component.currentStep()).toBe(2);
    });

    it('should start countdown after sending code', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      apiServiceMock.registerSendCode.mockReturnValue(of({ success: true }));

      component.onSendCode();

      expect(component.countdown()).toBe(60);
    });

    it('should not send code when countdown is active', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.countdown.set(30);
      apiServiceMock.registerSendCode.mockReturnValue(of({ success: true }));

      component.onSendCode();

      expect(apiServiceMock.registerSendCode).not.toHaveBeenCalled();
    });
  });

  describe('onCompleteRegistration()', () => {
    it('should not complete registration when step2 form is invalid', () => {
      component.onCompleteRegistration();

      expect(apiServiceMock.registerComplete).not.toHaveBeenCalled();
      expect(authStoreMock.setLoading).not.toHaveBeenCalled();
    });

    it('should not complete registration when terms are not accepted', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        password: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
        name: 'Test User',
      });
      component.acceptTerms.set(false);

      component.onCompleteRegistration();

      expect(apiServiceMock.registerComplete).not.toHaveBeenCalled();
    });

    it('should call api.registerComplete with registration data when form is valid and terms accepted', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        password: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
        name: 'Test User',
      });
      component.acceptTerms.set(true);
      apiServiceMock.registerComplete.mockReturnValue(of({ accessToken: 'token' }));
      apiServiceMock.getUserProfile.mockReturnValue(of(null));

      component.onCompleteRegistration();

      expect(apiServiceMock.registerComplete).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
        code: '123456',
        password: 'StrongP@ss1word',
        name: 'Test User',
      });
    });

    it('should navigate to /booking on successful registration', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        password: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
        name: 'Test User',
      });
      component.acceptTerms.set(true);
      apiServiceMock.registerComplete.mockReturnValue(of({ accessToken: 'token' }));
      apiServiceMock.getUserProfile.mockReturnValue(of(null));
      jest.spyOn(router, 'navigate');

      component.onCompleteRegistration();

      expect(router.navigate).toHaveBeenCalledWith(['/booking']);
    });

    it('should call loginSuccess with tokens on successful registration', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        password: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
        name: 'Test User',
      });
      component.acceptTerms.set(true);
      apiServiceMock.registerComplete.mockReturnValue(of({ accessToken: 'token' }));
      apiServiceMock.getUserProfile.mockReturnValue(of(null));

      component.onCompleteRegistration();

      expect(authStoreMock.loginSuccess).toHaveBeenCalledWith('token');
    });

    it('should set error on registration failure', () => {
      component.step1Form.get('contact')?.setValue('test@example.com');
      component.step2Form.patchValue({
        code: '123456',
        password: 'StrongP@ss1word',
        confirmPassword: 'StrongP@ss1word',
        name: 'Test User',
      });
      component.acceptTerms.set(true);
      apiServiceMock.registerComplete.mockReturnValue(throwError(() => new Error('Email already exists')));

      component.onCompleteRegistration();

      expect(authStoreMock.setError).toHaveBeenLastCalledWith('Email already exists');
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
      fixture = TestBed.createComponent(RegisterComponent);
      component = fixture.componentInstance;
      router = TestBed.inject(Router);
      authStoreMock.error.mockReturnValue('Registration failed');
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.border-l-4');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Registration failed');
    });

    it('should show login link', () => {
      const link = fixture.nativeElement.querySelector('a[routerLink="/auth/login"]');
      expect(link).toBeTruthy();
      expect(link.textContent.trim()).toBe('登录');
    });

    it('[RED] should have gradient-page-bg class on register container', () => {
      const container = fixture.nativeElement.querySelector('.register-page');
      expect(container.classList.contains('gradient-page-bg')).toBe(true);
    });

    it('[RED] should have app-card with glass variant', () => {
      const card = fixture.nativeElement.querySelector('app-card');
      expect(card).toBeTruthy();
    });

    it('[RED] should have glass-input class on inputs in step 1', () => {
      const inputs = fixture.nativeElement.querySelectorAll('input:not([type="checkbox"])');
      inputs.forEach((input: HTMLElement) => {
        expect(input.classList.contains('glass-input')).toBe(true);
      });
    });

    it('[RED] should have app-button for submit', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // [FE-ROLE-UNIFY] userType → role rename
  // ==========================================

  describe('[RoleRename] register uses role not userType', () => {
    it('onCompleteRegistration should pass role to setUserProfile [RED] fails because code uses userType', () => {
      // TARGET: register sends role: profile.role to setUserProfile
      // CURRENT: sends userType: profile.userType (undefined)
      const mockProfileWithRole = {
        id: '1',
        name: 'New User',
        role: 'CUSTOMER',
        email: 'new@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      };

      // Fill step 1
      component.step1Form.get('contact')?.setValue('new@test.com');
      component.currentStep.set(2);
      component.onSendCode = jest.fn(); // prevent actual API call

      // Fill step 2
      component.step2Form.patchValue({
        code: '123456',
        password: 'Str0ng!Pass',
        name: 'New User',
      });
      component.acceptTerms.set(true);

      apiServiceMock.registerComplete.mockReturnValue(of({
        accessToken: 'jwt-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      }));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockProfileWithRole));

      component.onCompleteRegistration();

      // TARGET: setUserProfile called with role field
      // CURRENT: setUserProfile called with userType field (undefined) → this FAILS
      expect(authStoreMock.setUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'CUSTOMER' })
      );
    });

    it('onCompleteRegistration should navigate based on role [RED] fails because code reads userType', () => {
      // TARGET: ADMIN role → /admin/dashboard
      // CURRENT: userType undefined → /booking (fallback)
      const navigateSpy = jest.spyOn(router, 'navigate');
      const mockAdminProfile = {
        id: '2',
        name: 'Admin User',
        role: 'ADMIN',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      };

      component.step1Form.get('contact')?.setValue('admin@test.com');
      component.currentStep.set(2);
      component.onSendCode = jest.fn();

      component.step2Form.patchValue({
        code: '123456',
        password: 'Str0ng!Pass',
        name: 'Admin User',
      });
      component.acceptTerms.set(true);

      apiServiceMock.registerComplete.mockReturnValue(of({
        accessToken: 'jwt-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      }));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockAdminProfile));

      component.onCompleteRegistration();

      // TARGET: ADMIN → /admin/dashboard
      // CURRENT: undefined → /booking (fallback) → this FAILS
      expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    });
  });
});
