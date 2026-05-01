import { TestBed } from '@angular/core/testing';
import { AuthStore, User } from './auth.store';
import { ApiService } from '../../core/services/api.service';
import {
  ContactType,
  RegisterSendCodeDto,
  LoginPasswordDto,
  RegisterCompleteDto,
} from '../../features/auth/dto/auth.dto';
import { of, throwError } from 'rxjs';

describe('AuthStore', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;
  let apiServiceMock: jest.Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock = {
      registerSendCode: jest.fn(),
      registerComplete: jest.fn(),
      loginPassword: jest.fn(),
      loginSendCode: jest.fn(),
      loginVerifyCode: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      getUserProfile: jest.fn(),
    } as unknown as jest.Mocked<ApiService>;

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: ApiService, useValue: apiServiceMock },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('should initialize with null user', () => {
    expect(store.user()).toBeNull();
  });

  it('should initialize with null token', () => {
    expect(store.token()).toBeNull();
  });

  it('should initialize with null refreshToken', () => {
    expect(store.refreshToken()).toBeNull();
  });

  it('should initialize with isLoading false', () => {
    expect(store.isLoading()).toBe(false);
  });

  it('should initialize with null error', () => {
    expect(store.error()).toBeNull();
  });

  it('should expose isAuthenticated computed signal that is false initially', () => {
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should set token and refreshToken on login success', () => {
    const mockToken = 'jwt-token-123';
    const mockRefreshToken = 'jwt-refresh-token-456';

    // LoginSuccess stores tokens only (user is set separately via setUserProfile)
    // isAuthenticated requires both user AND token, so it stays false until setUserProfile
    store.loginSuccess(mockToken, mockRefreshToken);

    expect(store.token()).toBe(mockToken);
    expect(store.refreshToken()).toBe(mockRefreshToken);
    expect(store.isAuthenticated()).toBe(false); // user not yet set
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

    it('should set user via setUserProfile', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      userType: 'user',
    };

    store.loginSuccess('jwt-token-123', 'jwt-refresh-token-456');
    store.setUserProfile(mockUser);

    expect(store.user()).toEqual(mockUser);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('should handle loginSuccess without refreshToken (backward compatible)', () => {
    const mockToken = 'jwt-token-123';

    store.loginSuccess(mockToken);

    expect(store.token()).toBe(mockToken);
    expect(store.refreshToken()).toBeNull();
    expect(store.isAuthenticated()).toBe(false); // user not yet set
  });

  it('should clear user and tokens on clearAuthState', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      userType: 'user',
    };

    store.loginSuccess('jwt-token-123', 'jwt-refresh-token-456');
    store.setUserProfile(mockUser);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()).toEqual(mockUser);

    store.clearAuthState();

    expect(store.user()).toBeNull();
    expect(store.token()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

  it('should set loading state', () => {
    store.setLoading(true);
    expect(store.isLoading()).toBe(true);

    store.setLoading(false);
    expect(store.isLoading()).toBe(false);
  });

  it('should set error state and clear loading', () => {
    store.setLoading(true);
    store.setError('Login failed');

    expect(store.error()).toBe('Login failed');
    expect(store.isLoading()).toBe(false);
  });

  it('should expose currentUser computed signal', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      userType: 'user',
    };

    expect(store.currentUser()).toBeNull();

    store.loginSuccess('jwt-token-123', 'refresh-token');
    store.setUserProfile(mockUser);

    expect(store.currentUser()).toEqual(mockUser);
  });

  it('should expose currentToken computed signal', () => {
    const mockToken = 'jwt-token-123';

    expect(store.currentToken()).toBeNull();

    store.loginSuccess(mockToken, 'refresh-token');

    expect(store.currentToken()).toBe(mockToken);
  });

  it('should expose currentRefreshToken computed signal', () => {
    const mockRefreshToken = 'jwt-refresh-token-456';

    expect(store.currentRefreshToken()).toBeNull();

    store.loginSuccess('jwt-token-123', mockRefreshToken);

    expect(store.currentRefreshToken()).toBe(mockRefreshToken);
  });

  // ==========================================
  // RED PHASE: Wire AuthStore to real API calls
  // ==========================================

  describe('[RED] sendRegisterCode()', () => {
    it('[RED] should fail: sendRegisterCode is not yet defined', () => {
      expect(store.sendRegisterCode).toBeDefined();
    });

    it('[RED] should fail: should call apiService.registerSendCode with correct dto', async () => {
      const dto: RegisterSendCodeDto = {
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
      };
      apiServiceMock.registerSendCode.mockReturnValue(
        of({ maskedContact: 'tes***@example.com', expiresIn: 300 })
      );

      await store.sendRegisterCode(dto);

      expect(apiServiceMock.registerSendCode).toHaveBeenCalledWith(dto);
    });

    it('[RED] should fail: should return RegisterSendCodeResponse on success', async () => {
      apiServiceMock.registerSendCode.mockReturnValue(
        of({ maskedContact: 'tes***@example.com', expiresIn: 300 })
      );

      const result = await store.sendRegisterCode({
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
      });

      expect(result.maskedContact).toBe('tes***@example.com');
      expect(result.expiresIn).toBe(300);
    });

    it('[RED] should fail: should set loading state during API call', async () => {
      apiServiceMock.registerSendCode.mockReturnValue(
        of({ maskedContact: 'tes***@example.com', expiresIn: 300 })
      );

      const promise = store.sendRegisterCode({
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
      });

      expect(store.isLoading()).toBe(true);
      await promise;
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('[RED] completeRegistration()', () => {
    const mockDto: RegisterCompleteDto = {
      contact: 'test@example.com',
      contactType: ContactType.EMAIL,
      code: '123456',
      password: 'Str0ng!Pass',
      name: 'Test User',
    };

    it('[RED] should fail: completeRegistration is not yet defined', () => {
      expect(store.completeRegistration).toBeDefined();
    });

    it('[RED] should fail: should call apiService.registerComplete and store tokens', async () => {
      apiServiceMock.registerComplete.mockReturnValue(
        of({
          accessToken: 'jwt-token',
          refreshToken: 'jwt-refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          userType: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.completeRegistration(mockDto);

      expect(apiServiceMock.registerComplete).toHaveBeenCalledWith(mockDto);
      expect(store.token()).toBe('jwt-token');
      expect(store.refreshToken()).toBe('jwt-refresh');
    });

    it('[RED] should fail: should fetch user profile after registration', async () => {
      apiServiceMock.registerComplete.mockReturnValue(
        of({
          accessToken: 'jwt-token',
          refreshToken: 'jwt-refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          userType: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.completeRegistration(mockDto);

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Test User', userType: 'CUSTOMER' })
      );
    });

    it('[RED] should fail: should handle API error during registration', async () => {
      apiServiceMock.registerComplete.mockReturnValue(
        throwError(() => new Error('Registration failed'))
      );

      await store.completeRegistration(mockDto);

      expect(store.error()).toBe('Registration failed');
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('[RED] loginWithPassword()', () => {
    const mockDto: LoginPasswordDto = {
      contact: 'test@example.com',
      contactType: ContactType.EMAIL,
      password: 'mypassword',
    };

    it('[RED] should fail: loginWithPassword is not yet defined', () => {
      expect(store.loginWithPassword).toBeDefined();
    });

    it('[RED] should fail: should call apiService.loginPassword and store tokens', async () => {
      apiServiceMock.loginPassword.mockReturnValue(
        of({
          accessToken: 'jwt-token',
          refreshToken: 'jwt-refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          userType: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.loginWithPassword(mockDto);

      expect(apiServiceMock.loginPassword).toHaveBeenCalledWith(mockDto);
      expect(store.token()).toBe('jwt-token');
      expect(store.refreshToken()).toBe('jwt-refresh');
      expect(store.isAuthenticated()).toBe(true);
    });

    it('[RED] should fail: should fetch user profile after login', async () => {
      apiServiceMock.loginPassword.mockReturnValue(
        of({
          accessToken: 'jwt-token',
          refreshToken: 'jwt-refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          userType: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.loginWithPassword(mockDto);

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Test User', userType: 'CUSTOMER' })
      );
    });

    it('[RED] should fail: should handle API error during login', async () => {
      apiServiceMock.loginPassword.mockReturnValue(
        throwError(() => new Error('Invalid credentials'))
      );

      await store.loginWithPassword(mockDto);

      expect(store.error()).toBe('Invalid credentials');
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('[RED] refreshAccessToken()', () => {
    it('[RED] should fail: refreshAccessToken is not yet defined', () => {
      expect(store.refreshAccessToken).toBeDefined();
    });

    it('[RED] should fail: should call apiService.refreshToken with stored refreshToken', async () => {
      store.loginSuccess('old-token', 'stored-refresh-token');
      apiServiceMock.refreshToken.mockReturnValue(
        of({
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );

      await store.refreshAccessToken();

      expect(apiServiceMock.refreshToken).toHaveBeenCalledWith(
        'stored-refresh-token'
      );
      expect(store.token()).toBe('new-token');
      expect(store.refreshToken()).toBe('new-refresh');
    });

    it('[RED] should fail: should set error when no refresh token available', async () => {
      await store.refreshAccessToken();

      expect(store.error()).toBeTruthy();
    });
  });

  describe('[RED] logout()', () => {
    it('[RED] should fail: async logout is not yet defined', () => {
      expect(store.logout).toBeDefined();
    });

    it('[RED] should fail: should call apiService.logout and clear state', async () => {
      const mockUser: User = {
        id: '1',
        email: 'tes***@example.com',
        name: 'Test User',
        userType: 'CUSTOMER',
      };
      store.loginSuccess('jwt-token', 'jwt-refresh');
      store.setUserProfile(mockUser);
      apiServiceMock.logout.mockReturnValue(of({ message: 'Logged out' }));

      await store.logout();

      expect(apiServiceMock.logout).toHaveBeenCalled();
      expect(store.user()).toBeNull();
      expect(store.token()).toBeNull();
      expect(store.refreshToken()).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
    });

    it('[RED] should fail: should clear state even if API call fails', async () => {
      store.loginSuccess('jwt-token', 'jwt-refresh');
      apiServiceMock.logout.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await store.logout();

      // State should still be cleared on logout even if API fails
      expect(store.token()).toBeNull();
      expect(store.refreshToken()).toBeNull();
    });
  });

  describe('[RED] fetchUserProfile()', () => {
    it('[RED] should fail: fetchUserProfile is not yet defined', () => {
      expect(store.fetchUserProfile).toBeDefined();
    });

    it('[RED] should fail: should call apiService.getUserProfile and set user', async () => {
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          userType: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.fetchUserProfile();

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Test User', userType: 'CUSTOMER' })
      );
    });

    it('[RED] should fail: should set error on API failure', async () => {
      apiServiceMock.getUserProfile.mockReturnValue(
        throwError(() => new Error('Profile fetch failed'))
      );

      await store.fetchUserProfile();

      expect(store.error()).toBe('Profile fetch failed');
    });
  });
});
