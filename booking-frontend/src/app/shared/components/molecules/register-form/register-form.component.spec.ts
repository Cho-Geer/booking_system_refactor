import { ComponentFixture, TestBed, DeferBlockBehavior, DeferBlockState } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RegisterFormComponent, PasswordRequirements } from './register-form.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

describe('RegisterFormComponent', () => {
  let component: RegisterFormComponent;
  let fixture: ComponentFixture<RegisterFormComponent>;
  let fb: FormBuilder;

  const mockTranslationService = {
    t: jest.fn((domain: string, key: string) => `{{${domain}.${key}}}`),
    locale: jest.fn().mockReturnValue('en'),
    translations: jest.fn().mockReturnValue({}),
  };

  function setInputs(overrides?: {
    step2Form?: ReturnType<FormBuilder['group']>;
    countdown?: number;
    isLoading?: boolean;
    acceptTerms?: boolean;
    passwordRequirements?: PasswordRequirements;
  }) {
    const defaults = {
      step2Form: fb.group({
        code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        name: ['', [Validators.required, Validators.minLength(2)]],
        password: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]],
      }),
      countdown: 0,
      isLoading: false,
      acceptTerms: false,
      passwordRequirements: {
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      } as PasswordRequirements,
    };
    const merged = { ...defaults, ...overrides };
    fixture.componentRef.setInput('step2Form', merged.step2Form);
    fixture.componentRef.setInput('countdown', merged.countdown);
    fixture.componentRef.setInput('isLoading', merged.isLoading);
    fixture.componentRef.setInput('acceptTerms', merged.acceptTerms);
    fixture.componentRef.setInput('passwordRequirements', merged.passwordRequirements);
  }

  beforeEach(async () => {
    fb = new FormBuilder();
    mockTranslationService.t.mockClear();

    await TestBed.configureTestingModule({
      imports: [
        RegisterFormComponent,
        ReactiveFormsModule,
      ],
      providers: [
        provideRouter([]),
        { provide: TranslationService, useValue: mockTranslationService },
      ],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    })
    .overrideComponent(RegisterFormComponent, {
      set: { imports: [ReactiveFormsModule, TranslatePipe] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    setInputs();
    fixture.detectChanges();
  });

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have default countdown of 0', () => {
      expect(component.countdown()).toBe(0);
    });

    it('should have default acceptTerms of false', () => {
      expect(component.acceptTerms()).toBe(false);
    });
  });

  describe('template rendering', () => {
    it('should render verification code input', () => {
      const codeInput = fixture.nativeElement.querySelector('#code');
      expect(codeInput).toBeTruthy();
      expect(codeInput.type).toBe('text');
    });

    it('should render name input', () => {
      const nameInput = fixture.nativeElement.querySelector('#name');
      expect(nameInput).toBeTruthy();
      expect(nameInput.type).toBe('text');
    });

    it('should render password input', () => {
      const passwordInput = fixture.nativeElement.querySelector('#password');
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.type).toBe('password');
    });

    it('should render confirm password input', () => {
      const confirmInput = fixture.nativeElement.querySelector('#confirmPassword');
      expect(confirmInput).toBeTruthy();
      expect(confirmInput.type).toBe('password');
    });

    it('should render resend code button with translated text', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const resendBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.login.resendCode}}')
      );
      expect(resendBtn).toBeTruthy();
    });

    it('should render terms checkbox with links', () => {
      const termsLink = fixture.nativeElement.querySelector('a[routerLink="/legal/terms"]');
      expect(termsLink).toBeTruthy();
    });

    it('should render back button with translated text', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const backBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{global.back}}')
      );
      expect(backBtn).toBeTruthy();
    });

    it('should render submit button with translated text', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.complete}}')
      );
      expect(submitBtn).toBeTruthy();
    });
  });

  describe('event emission', () => {
    it('should emit codeRequested when resend button clicked', () => {
      jest.spyOn(component.codeRequested, 'emit');
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const resendBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.login.resendCode}}')
      ) as HTMLButtonElement;
      resendBtn.click();
      expect(component.codeRequested.emit).toHaveBeenCalled();
    });

    it('should emit backRequested when back button clicked', () => {
      jest.spyOn(component.backRequested, 'emit');
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const backBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{global.back}}')
      ) as HTMLButtonElement;
      backBtn.click();
      expect(component.backRequested.emit).toHaveBeenCalled();
    });

    it('should emit formSubmitted on form submit when valid', () => {
      jest.spyOn(component.formSubmitted, 'emit');
      const validForm = fb.group({
        code: ['123456', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        name: ['Test User', [Validators.required, Validators.minLength(2)]],
        password: ['Pass123!', [Validators.required]],
        confirmPassword: ['Pass123!', [Validators.required]],
      });
      setInputs({ step2Form: validForm, acceptTerms: true });
      fixture.detectChanges();

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));

      expect(component.formSubmitted.emit).toHaveBeenCalled();
    });

    it('should emit termsChanged when checkbox toggled', () => {
      jest.spyOn(component.termsChanged, 'emit');
      const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      expect(component.termsChanged.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('field validation display', () => {
    it('should show error message for invalid code field when touched', () => {
      const form = component.step2Form();
      form.get('code')?.markAsTouched();
      form.get('code')?.setValue('123');
      fixture.detectChanges();

      const errorMsg = fixture.nativeElement.querySelector('.error-message');
      expect(errorMsg).toBeTruthy();
    });

    it('should show password requirements with correct states', async () => {
      setInputs({
        passwordRequirements: {
          hasMinLength: true,
          hasUpperCase: false,
          hasLowerCase: true,
          hasNumber: false,
          hasSpecialChar: false,
        },
      });
      fixture.detectChanges();

      const deferBlocks = await fixture.getDeferBlocks();
      await deferBlocks[0].render(DeferBlockState.Complete);
      fixture.detectChanges();

      const requirementList = fixture.nativeElement.querySelector('.password-requirements');
      expect(requirementList).toBeTruthy();
    });

    it('should display password requirements with translated text', async () => {
      setInputs({
        passwordRequirements: {
          hasMinLength: false,
          hasUpperCase: false,
          hasLowerCase: false,
          hasNumber: false,
          hasSpecialChar: false,
        },
      });
      fixture.detectChanges();

      const deferBlocks = await fixture.getDeferBlocks();
      await deferBlocks[0].render(DeferBlockState.Complete);
      fixture.detectChanges();

      const requirementItems = fixture.nativeElement.querySelectorAll('.password-requirements li span');
      const minLengthItem = Array.from(requirementItems).find(
        (span: HTMLSpanElement) => span.textContent?.includes('{{validation.passwordHasMinLength}}')
      );
      expect(minLengthItem).toBeTruthy();
      expect(minLengthItem!.textContent).toContain('{{validation.passwordHasMinLength}}');
    });
  });

  describe('button states', () => {
    it('should disable submit button when form is invalid', () => {
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.complete}}')
      ) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('should disable submit button when loading', () => {
      setInputs({ isLoading: true });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.registering}}')
      ) as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
      expect(submitBtn.disabled).toBe(true);
    });

    it('should disable submit button when terms not accepted', () => {
      const validForm = fb.group({
        code: ['123456', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        name: ['Test User', [Validators.required, Validators.minLength(2)]],
        password: ['StrongP@ss1', [Validators.required]],
        confirmPassword: ['StrongP@ss1', [Validators.required]],
      });
      setInputs({ step2Form: validForm, acceptTerms: false });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.complete}}')
      ) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('should enable submit button when valid, not loading, and terms accepted', () => {
      const validForm = fb.group({
        code: ['123456', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        name: ['Test User', [Validators.required, Validators.minLength(2)]],
        password: ['StrongP@ss1', [Validators.required]],
        confirmPassword: ['StrongP@ss1', [Validators.required]],
      });
      setInputs({ step2Form: validForm, acceptTerms: true, isLoading: false });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.complete}}')
      ) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(false);
    });

    it('should disable resend button when countdown > 0', () => {
      setInputs({ countdown: 30 });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const resendBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('30s')
      ) as HTMLButtonElement;
      expect(resendBtn.disabled).toBe(true);
    });
  });

  describe('loading state display', () => {
    it('should show registering translation when loading', () => {
      setInputs({ isLoading: true });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.registering}}')
      ) as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
    });

    it('should show complete registration translation when not loading', () => {
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.complete}}')
      ) as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
    });
  });

  describe('glassmorphism CSS classes', () => {
    it('[RED] should have sharp-input class on text inputs', () => {
      const inputs = fixture.nativeElement.querySelectorAll('input[type="text"], input[type="password"]');
      inputs.forEach((input: HTMLElement) => {
        expect(input.classList.contains('sharp-input')).toBe(true);
      });
    });

    it('[RED] should have bg-accent-green class on submit button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{auth.register.complete}}')
      ) as HTMLButtonElement;
      expect(submitBtn.classList.contains('bg-accent-green')).toBe(true);
    });

    it('[RED] should have border-border-color class on back button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const backBtn = Array.from(buttons).find(
        (btn: HTMLButtonElement) => btn.textContent?.includes('{{global.back}}')
      ) as HTMLButtonElement;
      expect(backBtn.classList.contains('border-border-color')).toBe(true);
    });
  });
});
