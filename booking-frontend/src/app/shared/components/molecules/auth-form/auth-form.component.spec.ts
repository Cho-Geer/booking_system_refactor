import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { AuthFormComponent } from './auth-form.component';
import { ContactType } from '../../../../features/auth/dto/auth.dto';

describe('AuthFormComponent', () => {
  let component: AuthFormComponent;
  let fixture: ComponentFixture<AuthFormComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuthFormComponent,
        ReactiveFormsModule,
      ],
      providers: [
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthFormComponent);
    component = fixture.componentInstance;
    fb = TestBed.inject(FormBuilder);

    // Initialize required forms
    component.passwordForm = fb.group({
      contact: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    component.codeLoginForm = fb.group({
      contact: ['', [Validators.required]],
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.activeTab).toBe('password');
    expect(component.contactType).toBe(ContactType.EMAIL);
    expect(component.codeLoginStep).toBe(1);
    expect(component.acceptTerms).toBe(false);
    expect(component.isLoading).toBe(false);
    expect(component.countdown).toBe(0);
  });

  it('should emit tabSwitch event on tab change', () => {
    jest.spyOn(component.tabSwitch, 'emit');
    component.onTabSwitch('code');
    expect(component.tabSwitch.emit).toHaveBeenCalledWith('code');
  });

  it('should emit formSubmit event on form submit', () => {
    jest.spyOn(component.formSubmit, 'emit');
    component.onFormSubmit();
    expect(component.formSubmit.emit).toHaveBeenCalled();
  });

  it('should emit sendCode event', () => {
    jest.spyOn(component.sendCode, 'emit');
    component.onSendCode();
    expect(component.sendCode.emit).toHaveBeenCalled();
  });

  it('should emit contactTypeChange event', () => {
    jest.spyOn(component.contactTypeChange, 'emit');
    component.onContactTypeChange(ContactType.PHONE);
    expect(component.contactTypeChange.emit).toHaveBeenCalledWith(ContactType.PHONE);
  });

  it('should emit acceptTermsChange event', () => {
    jest.spyOn(component.acceptTermsChange, 'emit');
    component.onAcceptTermsChange(true);
    expect(component.acceptTermsChange.emit).toHaveBeenCalledWith(true);
  });

  it('should emit stepChange event', () => {
    jest.spyOn(component.stepChange, 'emit');
    component.onStepChange(2);
    expect(component.stepChange.emit).toHaveBeenCalledWith(2);
  });

  it('should return true when password field is invalid and touched', () => {
    component.passwordForm.get('contact')?.markAsTouched();
    expect(component.isPasswordFieldInvalid('contact')).toBe(true);
  });

  it('should return false when password field is valid', () => {
    component.passwordForm.get('contact')?.setValue('test@example.com');
    expect(component.isPasswordFieldInvalid('contact')).toBe(false);
  });

  it('should return true when code field is invalid and touched', () => {
    component.codeLoginForm.get('code')?.markAsTouched();
    expect(component.isCodeFieldInvalid('code')).toBe(true);
  });

  it('should expose ContactType enum to template', () => {
    expect(component.ContactType).toBe(ContactType);
  });
});
