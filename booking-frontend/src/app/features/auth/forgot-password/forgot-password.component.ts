import { Component, inject, OnDestroy, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../stores/auth/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContactType,
  ResetPasswordSendCodeDto,
  ResetPasswordVerifyDto,
} from '../dto/auth.dto';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { AppButtonComponent } from '../../../shared/components/atoms/app-button/app-button.component';

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
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CommonModule,
    FormsModule,
    AppCardComponent,
    AppButtonComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private api = inject(ApiService);
  private router = inject(Router);

  currentStep = signal<1 | 2>(1);

  contactType = signal(ContactType.EMAIL);
  ContactType = ContactType;

  countdown = signal(0);
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  maskedContact = signal<string | null>(null);
  resetSuccess = signal(false);
  showAntiEnumMessage = signal(false);

  isLoading = this.authStore.isLoading;
  error = this.authStore.error;

  step1Form = this.fb.group({
    contact: ['', [Validators.required]],
  });

  step2Form = this.fb.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

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
    this.step1Form.get('contact')?.setValidators([Validators.required, formatValidator]);
    this.step1Form.get('contact')?.updateValueAndValidity({ emitEvent: false });
  }

  onSendCode(): void {
    if (this.countdown() > 0) return;

    const contactControl = this.step1Form.get('contact');
    if (contactControl?.invalid) {
      contactControl.markAsTouched();
      return;
    }

    const contact = contactControl?.value;
    if (!contact) return;

    this.authStore.setLoading(true);
    this.authStore.setError(null);
    this.showAntiEnumMessage.set(false);

    const dto: ResetPasswordSendCodeDto = {
      contact: contact.trim(),
      contactType: this.contactType(),
    };

    this.api.resetPasswordSendCode(dto).subscribe({
      next: (response) => {
        this.authStore.setLoading(false);
        if (response?.maskedContact) {
          this.maskedContact.set(response.maskedContact);
          this.currentStep.set(2);
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

  onResetPassword(): void {
    if (this.authStore.isLoading() || this.step2Form.invalid) return;

    const contact = this.step1Form.get('contact')?.value;
    if (!contact) return;

    const { code, newPassword } = this.step2Form.value;
    if (!code || !newPassword) return;

    this.authStore.setLoading(true);
    this.authStore.setError(null);

    const dto: ResetPasswordVerifyDto = {
      contact: contact.trim(),
      contactType: this.contactType(),
      code,
      newPassword,
    };

    this.api.resetPasswordVerify(dto).subscribe({
      next: () => {
        this.authStore.setLoading(false);
        this.resetSuccess.set(true);
      },
      error: (err) => {
        this.authStore.setError(err.message || 'Password reset failed. Please check your code and try again.');
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToStep1(): void {
    this.currentStep.set(1);
    this.authStore.setError(null);
    this.clearCountdown();
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

  passwordMatchValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (newPassword && newPassword !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  isStep1FieldInvalid(fieldName: string): boolean {
    const field = this.step1Form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isStep2FieldInvalid(fieldName: string): boolean {
    const field = this.step2Form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  get passwordRequirements() {
    const val = this.step2Form.get('newPassword')?.value || '';
    return {
      hasMinLength: val.length >= 8,
      hasUpperCase: /[A-Z]/.test(val),
      hasLowerCase: /[a-z]/.test(val),
      hasNumber: /\d/.test(val),
      hasSpecialChar: /[@$!%*?&]/.test(val),
    };
  }
}
