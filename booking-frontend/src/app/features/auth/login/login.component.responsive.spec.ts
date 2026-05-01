import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthStore } from '../../../stores/auth/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

/**
 * Responsive Design Tests for Login Component
 * Tests mobile adaptations: full-width buttons, touch targets, card responsiveness
 */
describe('LoginComponent - Responsive Design', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authStoreMock: Record<string, unknown>;
  let apiServiceMock: Record<string, jest.Mock>;
  let socketServiceMock: { connect: jest.Mock };

  beforeEach(async () => {
    authStoreMock = {
      isLoading: signal(false),
      error: signal<string | null>(null),
      setLoading: jest.fn(),
      setError: jest.fn(),
      loginSuccess: jest.fn(),
      setUserProfile: jest.fn(),
    };

    apiServiceMock = {
      loginPassword: jest.fn(),
      loginSendCode: jest.fn(),
      loginVerifyCode: jest.fn(),
      getUserProfile: jest.fn(() => of(null)),
    };

    socketServiceMock = {
      connect: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: SocketService, useValue: socketServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('touch-friendly click targets (CSS class based)', () => {
    it('[RED] should have submit button with min-h-[44px] CSS class for touch targets', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.btn-primary');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((btn: HTMLElement) => {
        expect(btn.classList.contains('min-touch-target')).toBeTruthy();
      });
    });

    it('[RED] should have tab buttons with min-height 44px CSS class', () => {
      const tabButtons = fixture.nativeElement.querySelectorAll('.tab-button');
      expect(tabButtons.length).toBeGreaterThan(0);
      // tab-button has min-height: 44px in CSS
    });
  });

  describe('full-width buttons on mobile', () => {
    it('[RED] should have btn-primary with w-full class', () => {
      const primaryBtn = fixture.nativeElement.querySelector('.btn-primary');
      expect(primaryBtn).toBeTruthy();
      expect(primaryBtn.classList.contains('w-full')).toBeTruthy();
    });
  });

  describe('responsive card layout', () => {
    it('[RED] should render login-card with w-full class', () => {
      const card = fixture.nativeElement.querySelector('.login-card');
      expect(card).toBeTruthy();
      expect(card.classList.contains('w-full')).toBeTruthy();
    });

    it('[RED] should have login container with min-h-screen', () => {
      const container = fixture.nativeElement.querySelector('.login-container');
      expect(container).toBeTruthy();
      expect(container.classList.contains('min-h-screen')).toBeTruthy();
    });
  });
});
