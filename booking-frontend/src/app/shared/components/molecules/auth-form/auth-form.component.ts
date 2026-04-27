import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactType } from '../../../../features/auth/dto/auth.dto';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, CommonModule, FormsModule],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss',
})
export class AuthFormComponent {
  @Input() activeTab: 'password' | 'code' = 'password';
  @Input() contactType: ContactType = ContactType.EMAIL;
  @Input() codeLoginStep: number = 1;
  @Input() acceptTerms: boolean = false;
  @Input() isLoading: boolean = false;
  @Input() countdown: number = 0;
  @Input() passwordForm!: FormGroup;
  @Input() codeLoginForm!: FormGroup;

  @Output() tabSwitch = new EventEmitter<'password' | 'code'>();
  @Output() formSubmit = new EventEmitter<void>();
  @Output() sendCode = new EventEmitter<void>();
  @Output() contactTypeChange = new EventEmitter<ContactType>();
  @Output() acceptTermsChange = new EventEmitter<boolean>();
  @Output() stepChange = new EventEmitter<number>();

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
    const field = this.passwordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isCodeFieldInvalid(fieldName: string): boolean {
    const field = this.codeLoginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
