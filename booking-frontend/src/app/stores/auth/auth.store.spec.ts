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

  it('should initialize with isLoading false', () => {
    expect(store.isLoading()).toBe(false);
  });

  it('should initialize with null error', () => {
    expect(store.error()).toBeNull();
  });

  it('should expose isAuthenticated computed signal that is false initially', () => {
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should set token on login success', () => {
    const mockToken = 'jwt-token-123';

    // LoginSuccess stores token only (user is set separately via setUserProfile)
    // isAuthenticated requires both user AND token, so it stays false until setUserProfile
    store.loginSuccess(mockToken);

    expect(store.token()).toBe(mockToken);
    expect(store.isAuthenticated()).toBe(false); // user not yet set
    expect(store.error()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

    it('should set user via setUserProfile', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    store.loginSuccess('jwt-token-123');
    store.setUserProfile(mockUser);

    expect(store.user()).toEqual(mockUser);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('should clear user and tokens on clearAuthState', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    store.loginSuccess('jwt-token-123');
    store.setUserProfile(mockUser);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()).toEqual(mockUser);

    store.clearAuthState();

    expect(store.user()).toBeNull();
    expect(store.token()).toBeNull();
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
      role: 'user',
    };

    expect(store.currentUser()).toBeNull();

    store.loginSuccess('jwt-token-123');
    store.setUserProfile(mockUser);

    expect(store.currentUser()).toEqual(mockUser);
  });

  it('should expose currentToken computed signal', () => {
    const mockToken = 'jwt-token-123';

    expect(store.currentToken()).toBeNull();

    store.loginSuccess(mockToken);

    expect(store.currentToken()).toBe(mockToken);
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
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.completeRegistration(mockDto);

      expect(apiServiceMock.registerComplete).toHaveBeenCalledWith(mockDto);
      expect(store.token()).toBe('jwt-token');
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
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.completeRegistration(mockDto);

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Test User', role: 'CUSTOMER' })
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
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.loginWithPassword(mockDto);

      expect(apiServiceMock.loginPassword).toHaveBeenCalledWith(mockDto);
      expect(store.token()).toBe('jwt-token');
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
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.loginWithPassword(mockDto);

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Test User', role: 'CUSTOMER' })
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

    it('[GREEN] should call apiService.refreshToken (no params) and update token', async () => {
      store.loginSuccess('old-token');
      apiServiceMock.refreshToken.mockReturnValue(
        of({
          accessToken: 'new-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );

      await store.refreshAccessToken();

      expect(apiServiceMock.refreshToken).toHaveBeenCalledWith();
      expect(store.token()).toBe('new-token');
    });

    it('[GREEN] should set error when refresh call fails', async () => {
      apiServiceMock.refreshToken.mockReturnValue(
        throwError(() => new Error('Refresh failed'))
      );

      await store.refreshAccessToken();

      expect(store.error()).toBe('Refresh failed');
    });
  });

  describe('[GREEN] restoreSession()', () => {
    it('[GREEN] should fail: restoreSession is not yet defined', () => {
      expect(store.restoreSession).toBeDefined();
    });

    it('[GREEN] should call apiService.refreshToken and fetch user profile on success', async () => {
      apiServiceMock.refreshToken.mockReturnValue(
        of({
          accessToken: 'session-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Session User',
          email: 'ses***@example.com',
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      const result = await store.restoreSession();

      expect(apiServiceMock.refreshToken).toHaveBeenCalledWith();
      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.token()).toBe('session-token');
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Session User' })
      );
      expect(result).toBe(true);
    });

    it('[GREEN] should return false when refresh fails (no cookie or expired)', async () => {
      apiServiceMock.refreshToken.mockReturnValue(
        throwError(() => new Error('No refresh token cookie'))
      );

      const result = await store.restoreSession();

      expect(result).toBe(false);
      expect(store.token()).toBeNull();
      expect(store.user()).toBeNull();
    });

    it('[GREEN] should set token but continue when profile fetch fails', async () => {
      apiServiceMock.refreshToken.mockReturnValue(
        of({
          accessToken: 'session-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        })
      );
      apiServiceMock.getUserProfile.mockReturnValue(
        throwError(() => new Error('Profile fetch failed'))
      );

      const result = await store.restoreSession();

      expect(result).toBe(true);
      expect(store.token()).toBe('session-token');
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
        role: 'CUSTOMER',
      };
      store.loginSuccess('jwt-token');
      store.setUserProfile(mockUser);
      apiServiceMock.logout.mockReturnValue(of({ message: 'Logged out' }));

      await store.logout();

      expect(apiServiceMock.logout).toHaveBeenCalled();
      expect(store.user()).toBeNull();
      expect(store.token()).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
    });

    it('[RED] should fail: should clear state even if API call fails', async () => {
      store.loginSuccess('jwt-token');
      apiServiceMock.logout.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await store.logout();

      // State should still be cleared on logout even if API fails
      expect(store.token()).toBeNull();
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
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.fetchUserProfile();

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      expect(store.user()).toEqual(
        expect.objectContaining({ id: '1', name: 'Test User', role: 'CUSTOMER' })
      );
    });

    it('[RED] should fail: should set error on API failure', async () => {
      apiServiceMock.getUserProfile.mockReturnValue(
        throwError(() => new Error('Profile fetch failed'))
      );

      await store.fetchUserProfile();

      expect(store.error()).toBe('Profile fetch failed');
    });

    // ============================================================
    // [RED] Test: preferredTimezone mapping in fetchUserProfile
    // Backend returns preferredTimezone but the store mapping
    // doesn't include it. This test WILL FAIL until the mapping
    // is added to auth.store.ts fetchUserProfile().
    // ============================================================

    it('[RED] should fail: fetchUserProfile should map preferredTimezone from API response', async () => {
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          role: 'CUSTOMER',
          preferredTimezone: 'Asia/Shanghai',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.fetchUserProfile();

      const storedUser = store.user();
      expect(storedUser).not.toBeNull();
      // TARGET: preferredTimezone should be 'Asia/Shanghai'
      // CURRENT: fetchUserProfile() doesn't map preferredTimezone → this assertion FAILS
      expect(storedUser).toEqual(
        expect.objectContaining({ preferredTimezone: 'Asia/Shanghai' })
      );
    });
  });

  // ==========================================
  // [FE-ROLE-UNIFY] userType → role rename validation
  // ==========================================

  describe('[RoleRename] userType → role in AuthStore', () => {
    it('fetchUserProfile should map role from API [RED] fails because code maps userType', async () => {
      // TARGET: API returns role field, store maps it to user.role
      // CURRENT: store.fetchUserProfile maps userType: profile.userType
      // When profile has `role` instead of `userType`:
      //   - profile.userType → undefined
      //   - profile.role → 'CUSTOMER' (but NOT mapped)
      // So user.role is undefined → this assertion FAILS
      apiServiceMock.getUserProfile.mockReturnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'tes***@example.com',
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
        })
      );

      await store.fetchUserProfile();

      expect(apiServiceMock.getUserProfile).toHaveBeenCalled();
      const storedUser = store.user();
      expect(storedUser).not.toBeNull();
      // TARGET: user.role should be 'CUSTOMER'
      // CURRENT: role is undefined because mapping uses profile.userType
      expect(storedUser).toEqual(
        expect.objectContaining({ role: 'CUSTOMER' })
      );
    });

    it('User interface in source should use role not userType [RED] fails because source uses userType', () => {
      // TARGET: auth.store.ts User interface has `role: string`
      // CURRENT: auth.store.ts User interface has `userType: string`
      // Read source file to verify
      const fs = require('fs');
      const path = require('path');
      const storePath = path.resolve(__dirname, '../../stores/auth/auth.store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // Extract the User interface
      const userIfaceMatch = content.match(/export interface User \{[\s\S]*?^\}/m);
      expect(userIfaceMatch).not.toBeNull();
      if (userIfaceMatch) {
        const iface = userIfaceMatch[0];
        // TARGET: interface has role, not userType
        // CURRENT: has userType: string → this assertion FAILS
        expect(iface).not.toContain('userType');
      }
    });
  });
});
