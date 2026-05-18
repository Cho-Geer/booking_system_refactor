import { ComponentFixture, TestBed, DeferBlockBehavior } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthStore, User } from '../../../stores/auth/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStoreMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiServiceMock: any;
  let socketServiceMock: { connect: jest.Mock };
  let router: Router;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };

  const mockLoginResponse = {
    accessToken: 'jwt-token-123',
    expiresIn: 900,
    tokenType: 'Bearer' as const,
  };

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
      loginPassword: jest.fn(),
      loginSendCode: jest.fn(),
      loginVerifyCode: jest.fn(),
      getUserProfile: jest.fn(),
    };

    socketServiceMock = {
      connect: jest.fn(),
      subscribeToTranslationUpdates: jest.fn(() => of({ type: 'translation_updated', timestamp: new Date().toISOString() })),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: SocketService, useValue: socketServiceMock },
      ],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize the password form with contact and password fields', () => {
      expect(component.passwordForm).toBeTruthy();
      expect(component.passwordForm.get('contact')).toBeTruthy();
      expect(component.passwordForm.get('password')).toBeTruthy();
    });

    it('should initialize the code login form with contact and code fields', () => {
      expect(component.codeLoginForm).toBeTruthy();
      expect(component.codeLoginForm.get('contact')).toBeTruthy();
      expect(component.codeLoginForm.get('code')).toBeTruthy();
    });

    it('should initialize form fields as empty', () => {
      expect(component.passwordForm.get('contact')?.value).toBe('');
      expect(component.passwordForm.get('password')?.value).toBe('');
      expect(component.codeLoginForm.get('contact')?.value).toBe('');
      expect(component.codeLoginForm.get('code')?.value).toBe('');
    });

    it('should reference store isLoading signal', () => {
      expect(component.isLoading).toBe(authStoreMock.isLoading);
    });

    it('should reference store error signal', () => {
      expect(component.error).toBe(authStoreMock.error);
    });
  });

  describe('tab switching', () => {
    it('should start with password tab active', () => {
      expect(component.activeTab()).toBe('password');
    });

    it('should switch to code tab', () => {
      component.switchTab('code');
      expect(component.activeTab()).toBe('code');
    });

    it('should switch back to password tab', () => {
      component.switchTab('code');
      component.switchTab('password');
      expect(component.activeTab()).toBe('password');
    });

    it('should clear error and reset codeLoginStep when switching tabs', () => {
      component.codeLoginStep.set(2);
      authStoreMock.setError.mockClear();
      component.switchTab('code');
      expect(authStoreMock.setError).toHaveBeenCalledWith(null);
      expect(component.codeLoginStep()).toBe(1);
    });
  });

  describe('form validation - password form', () => {
    it('should mark contact as invalid when empty', () => {
      const contactControl = component.passwordForm.get('contact');
      expect(contactControl?.invalid).toBe(true);
      expect(contactControl?.errors?.['required']).toBe(true);
    });

    it('should mark contact as valid when filled', () => {
      const contactControl = component.passwordForm.get('contact');
      contactControl?.setValue('test@example.com');
      expect(contactControl?.valid).toBe(true);
    });

    it('should mark password as invalid when empty', () => {
      const passwordControl = component.passwordForm.get('password');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.errors?.['required']).toBe(true);
    });
  });

  describe('form validation - code login form', () => {
    it('should mark code as invalid when empty', () => {
      const codeControl = component.codeLoginForm.get('code');
      expect(codeControl?.invalid).toBe(true);
      expect(codeControl?.errors?.['required']).toBe(true);
    });

    it('should mark code as invalid when not 6 digits', () => {
      const codeControl = component.codeLoginForm.get('code');
      codeControl?.setValue('123');
      expect(codeControl?.invalid).toBe(true);
    });

    it('should mark code as valid when 6 digits', () => {
      const codeControl = component.codeLoginForm.get('code');
      codeControl?.setValue('123456');
      expect(codeControl?.valid).toBe(true);
    });
  });

  describe('onPasswordLogin()', () => {
    it('should not submit when form is invalid', () => {
      component.onPasswordLogin();

      expect(apiServiceMock.loginPassword).not.toHaveBeenCalled();
      expect(authStoreMock.setLoading).not.toHaveBeenCalled();
    });

    it('should not submit when terms are not accepted', () => {
      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(false);

      component.onPasswordLogin();

      expect(apiServiceMock.loginPassword).not.toHaveBeenCalled();
    });

    it('should call api.loginPassword with credentials when form is valid and terms accepted', () => {
      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockUser));

      component.onPasswordLogin();

      expect(apiServiceMock.loginPassword).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
        password: 'Test@1234',
      });
    });

    it('should set loading state before making API call', () => {
      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockUser));

      component.onPasswordLogin();

      expect(authStoreMock.setLoading).toHaveBeenCalledWith(true);
    });

    it('should call loginSuccess on successful login', () => {
      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockUser));

      component.onPasswordLogin();

      expect(authStoreMock.loginSuccess).toHaveBeenCalledWith('jwt-token-123');
    });

    it('should connect socket service on successful login', () => {
      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockUser));

      component.onPasswordLogin();

      expect(socketServiceMock.connect).toHaveBeenCalled();
    });

    it('should set error on login failure', () => {
      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(
        throwError(() => new Error('Invalid credentials')),
      );

      component.onPasswordLogin();

      expect(authStoreMock.setError).toHaveBeenLastCalledWith('Invalid credentials');
    });
  });

  describe('onSendCode()', () => {
    it('should send verification code when contact is valid', () => {
      component.codeLoginForm.get('contact')?.setValue('test@example.com');
      apiServiceMock.loginSendCode.mockReturnValue(
        of({ maskedContact: 'tes***@example.com', expiresIn: 300 }),
      );

      component.onSendCode();

      expect(apiServiceMock.loginSendCode).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
      });
    });

    it('should not send verification code when contact is invalid', () => {
      component.codeLoginForm.get('contact')?.setValue('');
      component.codeLoginForm.get('contact')?.markAsTouched();

      component.onSendCode();

      expect(apiServiceMock.loginSendCode).not.toHaveBeenCalled();
    });

    it('should start countdown after sending code when maskedContact is present', () => {
      component.codeLoginForm.get('contact')?.setValue('test@example.com');
      apiServiceMock.loginSendCode.mockReturnValue(
        of({ maskedContact: 'tes***@example.com', expiresIn: 300 }),
      );

      component.onSendCode();

      expect(component.countdown()).toBe(60);
    });

    it('should advance to step 2 after sending code when maskedContact is present', () => {
      component.codeLoginForm.get('contact')?.setValue('test@example.com');
      apiServiceMock.loginSendCode.mockReturnValue(
        of({ maskedContact: 'tes***@example.com', expiresIn: 300 }),
      );

      component.onSendCode();

      expect(component.codeLoginStep()).toBe(2);
    });

    it('[RED] should fail: should NOT advance to step 2 when maskedContact is absent (anti-enumeration)', () => {
      component.codeLoginForm.get('contact')?.setValue('nonexistent@example.com');
      apiServiceMock.loginSendCode.mockReturnValue(of({ expiresIn: 300 }));

      component.onSendCode();

      expect(component.codeLoginStep()).toBe(1);
    });

    it('should not send code when countdown is active', () => {
      component.codeLoginForm.get('contact')?.setValue('test@example.com');
      component.countdown.set(30);
      apiServiceMock.loginSendCode.mockReturnValue(of({ expiresIn: 300 }));

      component.onSendCode();

      expect(apiServiceMock.loginSendCode).not.toHaveBeenCalled();
    });
  });

  describe('onVerifyCode()', () => {
    it('should call api.loginVerifyCode when code form is valid', () => {
      component.codeLoginForm.patchValue({
        contact: 'test@example.com',
        code: '123456',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginVerifyCode.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockUser));

      component.onVerifyCode();

      expect(apiServiceMock.loginVerifyCode).toHaveBeenCalledWith({
        contact: 'test@example.com',
        contactType: 'email',
        code: '123456',
      });
    });

    it('should not verify code when form is invalid', () => {
      component.onVerifyCode();

      expect(apiServiceMock.loginVerifyCode).not.toHaveBeenCalled();
    });

    it('should set error on verification failure', () => {
      component.codeLoginForm.patchValue({
        contact: 'test@example.com',
        code: '123456',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginVerifyCode.mockReturnValue(throwError(() => new Error('Invalid code')));

      component.onVerifyCode();

      expect(authStoreMock.setError).toHaveBeenLastCalledWith('Invalid code');
    });

    it('should call loginSuccess on successful verification', () => {
      component.codeLoginForm.patchValue({
        contact: 'test@example.com',
        code: '123456',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginVerifyCode.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockUser));

      component.onVerifyCode();

      expect(authStoreMock.loginSuccess).toHaveBeenCalledWith('jwt-token-123');
    });
  });

  describe('onSubmit()', () => {
    it('should call onPasswordLogin when activeTab is password', () => {
      jest.spyOn(component, 'onPasswordLogin');
      component.activeTab.set('password');

      component.onSubmit();

      expect(component.onPasswordLogin).toHaveBeenCalled();
    });

    it('should call onSendCode when activeTab is code and step 1', () => {
      jest.spyOn(component, 'onSendCode');
      component.activeTab.set('code');
      component.codeLoginStep.set(1);

      component.onSubmit();

      expect(component.onSendCode).toHaveBeenCalled();
    });

    it('should call onVerifyCode when activeTab is code and step 2', () => {
      jest.spyOn(component, 'onVerifyCode');
      component.activeTab.set('code');
      component.codeLoginStep.set(2);

      component.onSubmit();

      expect(component.onVerifyCode).toHaveBeenCalled();
    });
  });

  describe('sendVerifyCode()', () => {
    it('should delegate to onSendCode', () => {
      jest.spyOn(component, 'onSendCode');
      component.sendVerifyCode();
      expect(component.onSendCode).toHaveBeenCalled();
    });
  });

  // ==========================================
  // [FE-ROLE-UNIFY] userType → role rename
  // ==========================================

  describe('[RoleRename] onPasswordLogin with role field', () => {
    it('should use profile.role not profile.userType in setUserProfile [RED] fails because code uses userType', () => {
      // TARGET: onPasswordLogin passes role: profile.role to setUserProfile
      // CURRENT: passes userType: profile.userType on line 178

      // Mock successful password login with role-based profile
      const mockProfileWithRole = {
        id: '1',
        name: 'Test User',
        role: 'CUSTOMER',
        email: 'test@example.com',
        createdAt: '2026-01-01T00:00:00Z',
      };

      component.passwordForm.patchValue({
        contact: 'test@example.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockProfileWithRole));

      component.onPasswordLogin();

      // TARGET: setUserProfile called with role field
      // CURRENT: setUserProfile called with userType field from profile.userType (undefined)
      expect(authStoreMock.setUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'CUSTOMER' }),
      );
    });

    it('should route ADMIN role to /admin/dashboard [RED] fails because code reads userType', () => {
      // TARGET: ADMIN role → getPostLoginRoute('ADMIN') → '/admin/dashboard'
      // CURRENT: profile.userType is undefined → getPostLoginRoute(undefined) → '/booking'
      const navigateSpy = jest.spyOn(router, 'navigate');
      const mockAdminProfileWithRole = {
        id: '2',
        name: 'Admin User',
        role: 'ADMIN',
        email: 'admin@test.com',
        createdAt: '2026-01-01T00:00:00Z',
      };

      component.passwordForm.patchValue({
        contact: 'admin@test.com',
        password: 'Test@1234',
      });
      component.acceptTerms.set(true);
      apiServiceMock.loginPassword.mockReturnValue(of(mockLoginResponse));
      apiServiceMock.getUserProfile.mockReturnValue(of(mockAdminProfileWithRole));

      component.onPasswordLogin();

      expect(navigateSpy).toHaveBeenCalled();
      // TARGET: ADMIN → /admin/dashboard
      // CURRENT: undefined → /booking (fallback) → this FAILS
      expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    });
  });

  describe('template rendering', () => {
    it('should not show error message when error is null', () => {
      authStoreMock.error.mockReturnValue(null);
      fixture.detectChanges();

      const globalError = fixture.nativeElement.querySelector('.border-l-4');
      expect(globalError).toBeFalsy();
    });

    it('should show error message when error has value', () => {
      fixture.destroy();
      fixture = TestBed.createComponent(LoginComponent);
      component = fixture.componentInstance;
      authStoreMock.error.mockReturnValue('Login failed');
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.border-l-4');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Login failed');
    });

    it('should render register link', () => {
      const link = fixture.nativeElement.querySelector('a[routerLink="/auth/register"]');
      expect(link).toBeTruthy();
      expect(link.textContent.trim()).toBe('注册新账号');
    });

    it('[RED] should have gradient-page-bg class on container', () => {
      const container = fixture.nativeElement.querySelector('.login-page');
      expect(container.classList.contains('gradient-page-bg')).toBe(true);
    });

    it('[RED] should have app-card with glass variant', () => {
      const card = fixture.nativeElement.querySelector('app-card');
      expect(card).toBeTruthy();
    });

    it('[RED] should have glass-input class on inputs', () => {
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
  // [PW-TOGGLE-IMPL] Password Visibility Toggle Tests
  // ==========================================
  //
  // These tests PASS in GREEN phase:
  // - `passwordVisible` signal is NOT implemented in LoginComponent
  // - `togglePasswordVisibility()` method is NOT implemented
  // - Template has hardcoded type="password" (not signal-bound)
  // - No .password-toggle-btn element exists in template
  //
  // PW-TOGGLE: TDD GREEN phase — implementation complete

  describe('password visibility toggle', () => {
    it('should have passwordVisible signal default to false', () => {
      expect(component.passwordVisible()).toBe(false);
    });

    it('should toggle passwordVisible from false to true', () => {
      component.passwordVisible.set(false);
      component.togglePasswordVisibility();
      expect(component.passwordVisible()).toBe(true);
    });

    it('should toggle passwordVisible from true to false', () => {
      component.passwordVisible.set(true);
      component.togglePasswordVisibility();
      expect(component.passwordVisible()).toBe(false);
    });

    it('should set password input type to password when passwordVisible is false', () => {
      component.passwordVisible.set(false);
      fixture.detectChanges();
      const passwordInput = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');
    });

    it('should set password input type to text when passwordVisible is true', () => {
      component.passwordVisible.set(true);
      fixture.detectChanges();
      const passwordInput = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
      expect(passwordInput.type).toBe('text');
    });

    it('should have show-password aria-label on toggle button when password is hidden', () => {
      component.passwordVisible.set(false);
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.password-toggle-btn');
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.getAttribute('aria-label')).toBe('{{auth.login.showPassword}}');
    });

    it('should have hide-password aria-label on toggle button when password is visible', () => {
      component.passwordVisible.set(true);
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.password-toggle-btn');
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.getAttribute('aria-label')).toBe('{{auth.login.hidePassword}}');
    });
  });
});
