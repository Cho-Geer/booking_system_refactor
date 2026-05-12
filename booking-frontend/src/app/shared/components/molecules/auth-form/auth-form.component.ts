import { Component, input, output, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactType } from '../../../../features/auth/dto/auth.dto';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, FormsModule],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss',
})
export class AuthFormComponent {
  activeTab = input<'password' | 'code'>('password');
  contactType = input(ContactType.EMAIL);
  codeLoginStep = input(1);
  acceptTerms = input(false);
  isLoading = input(false);
  countdown = input(0);
  passwordForm = input.required<FormGroup>();
  codeLoginForm = input.required<FormGroup>();

  tabSwitch = output<'password' | 'code'>();
  formSubmit = output<void>();
  sendCode = output<void>();
  contactTypeChange = output<ContactType>();
  acceptTermsChange = output<boolean>();
  stepChange = output<number>();

  ContactType = ContactType;

  onTabSwitch(tab: 'password' | 'code'): void {
    this.tabSwitch.emit(tab);
  }

  onFormSubmit(): void {
    this.formSubmit.emit();
  }

  onSendCode(): void {
    this.sendCode.emit();
  }

  onContactTypeChange(type: ContactType): void {
    this.contactTypeChange.emit(type);
  }

  onAcceptTermsChange(value: boolean): void {
    this.acceptTermsChange.emit(value);
  }

  onStepChange(step: number): void {
    this.stepChange.emit(step);
  }

  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm().get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isCodeFieldInvalid(fieldName: string): boolean {
    const field = this.codeLoginForm().get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
