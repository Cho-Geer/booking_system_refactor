import { Component, inject, OnDestroy, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  ValidatorFn,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../stores/auth/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { RouteResolver } from '../../../core/services/route-resolver.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContactType,
  LoginPasswordDto,
  LoginSendCodeDto,
  LoginVerifyCodeDto,
} from '../dto/auth.dto';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../shared/components/atoms/app-button/app-button.component';

// Password strength validator matching backend requirements
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

const passwordStrengthValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (!value) return null;

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialChar = /[@$!%*?&]/.test(value);
  const isValidLength = value.length >= 8;

  const valid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isValidLength;

  return valid ? null : {
    passwordStrength: {
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isValidLength,
    },
  };
};

function contactFormatValidator(type: ContactType): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    if (type === ContactType.EMAIL) {
      return EMAIL_REGEX.test(value) ? null : { emailFormat: true };
    }
    return PHONE_REGEX.test(value) ? null : { phoneFormat: true };
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CommonModule,
    FormsModule,
    AppCardComponent,
    AppButtonComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private api = inject(ApiService);
  private socketService = inject(SocketService);
  private router = inject(Router);

  // Tab state: 'password' = password login, 'code' = verification code login
  activeTab = signal<'password' | 'code'>('password');

  // Contact type for code login
  contactType = signal(ContactType.EMAIL);
  ContactType = ContactType; // Expose enum to template

  // Terms acceptance
  acceptTerms = signal(false);

  // Countdown state
  countdown = signal(0);
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  // Code login step: 1 = send code, 2 = verify code
  codeLoginStep = signal(1);

  // Anti-enumeration: generic message for non-existent users (no PII leakage)
  showAntiEnumMessage = signal(false);

  // Password Login Form
  passwordForm = this.fb.group({
    contact: ['', [Validators.required]],
    password: ['', [Validators.required, passwordStrengthValidator]],
  });

  // Code Login Form
  codeLoginForm = this.fb.group({
    contact: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // Signal references from store
  isLoading = this.authStore.isLoading;
  error = this.authStore.error;

  constructor() {
    this.updateContactValidators();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  setContactType(type: ContactType): void {
    this.contactType.set(type);
    this.updateContactValidators();
  }

  private updateContactValidators(): void {
    const type = this.contactType();
    const formatValidator = contactFormatValidator(type);
    this.passwordForm.get('contact')?.setValidators([Validators.required, formatValidator]);
    this.passwordForm.get('contact')?.updateValueAndValidity({ emitEvent: false });
    const codeContact = this.codeLoginForm.get('contact');
    codeContact?.setValidators([Validators.required, formatValidator]);
    codeContact?.updateValueAndValidity({ emitEvent: false });
  }

  switchTab(tab: 'password' | 'code'): void {
    this.activeTab.set(tab);
    this.authStore.setError(null);
    this.clearCountdown();
    this.codeLoginStep.set(1);
    this.showAntiEnumMessage.set(false);
  }

  // Password Login
  onPasswordLogin(): void {
    if (this.authStore.isLoading() || this.passwordForm.invalid || !this.acceptTerms()) return;

    const { contact, password } = this.passwordForm.value;
    if (!contact || !password) return;

    this.authStore.setLoading(true);
    this.authStore.setError(null);

    const dto: LoginPasswordDto = {
      contact: contact.trim(),
      contactType: this.contactType(),
      password,
    };

    this.api.loginPassword(dto).subscribe({
      next: (response) => {
        this.authStore.loginSuccess(response.accessToken);

        this.api.getUserProfile().subscribe({
          next: (profile) => {
            this.authStore.setUserProfile({
              id: profile.id,
              name: profile.name,
              userType: profile.userType,
              email: profile.email,
              phone: profile.phone,
              createdAt: profile.createdAt,
            });

            this.socketService.connect();
            this.router.navigate([RouteResolver.getPostLoginRoute(profile.userType)]);
          },
          error: () => {
            this.socketService.connect();
            this.router.navigate(['/']);
          },
        });
      },
      error: (err) => {
        this.authStore.setError(err.message || 'Login failed. Please check your credentials and try again.');
      },
    });
  }

  // Code Login Step 1: Send verification code
  onSendCode(): void {
    if (this.countdown() > 0) return;

    const contactControl = this.codeLoginForm.get('contact');
    if (contactControl?.invalid) {
      contactControl.markAsTouched();
      return;
    }

    const contact = contactControl?.value;
    if (!contact) return;

    this.authStore.setLoading(true);
    this.authStore.setError(null);

    const dto: LoginSendCodeDto = {
      contact: contact.trim(),
      contactType: this.contactType(),
    };

    this.api.loginSendCode(dto).subscribe({
      next: (response) => {
        this.authStore.setLoading(false);
        if (response?.maskedContact) {
          this.codeLoginStep.set(2);
          this.startCountdown();
        } else {
          this.showAntiEnumMessage.set(true);
        }
      },
      error: (err) => {
        this.authStore.setLoading(false);
        this.authStore.setError(err.message || 'Failed to send verification code. Please try again later.');
      },
    });
  }

  // Code Login Step 2: Verify code and login
  onVerifyCode(): void {
    if (this.authStore.isLoading() || this.codeLoginForm.invalid || !this.acceptTerms()) return;

    const contact = this.codeLoginForm.get('contact')?.value;
    const code = this.codeLoginForm.get('code')?.value;
    if (!contact || !code) return;

    this.authStore.setLoading(true);
    this.authStore.setError(null);

    const dto: LoginVerifyCodeDto = {
      contact: contact.trim(),
      contactType: this.contactType(),
      code,
    };

    this.api.loginVerifyCode(dto).subscribe({
      next: (response) => {
        this.authStore.loginSuccess(response.accessToken);

        this.api.getUserProfile().subscribe({
          next: (profile) => {
            this.authStore.setUserProfile({
              id: profile.id,
              name: profile.name,
              userType: profile.userType,
              email: profile.email,
              phone: profile.phone,
              createdAt: profile.createdAt,
            });

            this.socketService.connect();
            this.router.navigate([RouteResolver.getPostLoginRoute(profile.userType)]);
          },
          error: () => {
            this.socketService.connect();
            this.router.navigate(['/']);
          },
        });
      },
      error: (err) => {
        this.authStore.setError(err.message || 'Verification failed. Please check your code and try again.');
      },
    });
  }

  onSubmit(): void {
    if (this.activeTab() === 'password') {
      this.onPasswordLogin();
    } else {
      if (this.codeLoginStep() === 1) {
        this.onSendCode();
      } else {
        this.onVerifyCode();
      }
    }
  }

  sendVerifyCode(): void {
    this.onSendCode();
  }

  startCountdown(): void {
    this.countdown.set(60);
    this.countdownTimer = setInterval(() => {
      this.countdown.update(c => c - 1);
      if (this.countdown() <= 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdown.set(0);
  }

  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isCodeFieldInvalid(fieldName: string): boolean {
    const field = this.codeLoginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getPasswordStrengthError(key: string): boolean {
    const errors = this.passwordForm.get('password')?.errors?.['passwordStrength'];
    return errors?.[key] === false;
  }
}
