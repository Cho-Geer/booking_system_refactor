import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PasswordRequirements {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, FormsModule],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
})
export class RegisterFormComponent {
  // Inputs
  step2Form = input.required<FormGroup>();
  countdown = input.required<number>();
  isLoading = input.required<boolean>();
  acceptTerms = input.required<boolean>();
  passwordRequirements = input.required<PasswordRequirements>();

  // Outputs
  codeRequested = output<void>();
  formSubmitted = output<void>();
  backRequested = output<void>();
  termsChanged = output<boolean>();

  // Expose methods for template
  isFieldInvalid(fieldName: string): boolean {
    const form = this.step2Form();
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Event handlers
  onResendCode(): void {
    this.codeRequested.emit();
  }

  onSubmit(): void {
    this.formSubmitted.emit();
  }

  onBack(): void {
    this.backRequested.emit();
  }

  onTermsChange(checked: boolean): void {
    this.termsChanged.emit(checked);
  }
}
