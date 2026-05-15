import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RegisterSendCodeDto, RegisterCompleteDto, LoginPasswordDto } from '../../features/auth/dto/auth.dto';

/**
 * User interface aligned with PII encryption contract (Scheme C v4).
 * - email and phone fields contain MASKED values only (never plain text)
 * - e.g., email: "us***@example.com", phone: "138****5678"
 */
export interface User {
  id: string;
  name: string;
  role: string;
  email?: string;   // masked value from backend (e.g., "us***@example.com")
  phone?: string;   // masked value from backend (e.g., "138****5678")
  preferredTimezone?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(initialAuthState),
  withComputed(({ user, token }) => ({
    isAuthenticated: computed(() => user() !== null && token() !== null),
    currentUser: computed(() => user()),
    currentToken: computed(() => token()),
  })),
  withMethods((store, apiService = inject(ApiService)) => ({
    /**
     * Login success - store token only (no user object in auth response)
     * refreshToken is handled via HttpOnly cookie — not stored in frontend state
     * User profile should be fetched separately via /users/profile
     */
    loginSuccess(token: string) {
      patchState(store, {
        token,
        isLoading: false,
        error: null,
      });
    },
    /**
     * Set user profile after fetching from /users/profile
     */
    setUserProfile(user: User) {
      patchState(store, { user });
    },
    /**
     * Clear local auth state synchronously (without API call)
     */
    clearAuthState() {
      patchState(store, {
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });
    },
    setLoading(isLoading: boolean) {
      patchState(store, { isLoading });
    },
    setError(error: string | null) {
      patchState(store, { error, isLoading: false });
    },

    // ==========================================
    // Async API methods
    // ==========================================

    /**
     * Register Step 1: Send verification code via API
     */
    async sendRegisterCode(dto: RegisterSendCodeDto) {
      patchState(store, { isLoading: true, error: null });
      try {
        const response = await lastValueFrom(apiService.registerSendCode(dto));
        patchState(store, { isLoading: false });
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send verification code';
        patchState(store, { error: message, isLoading: false });
        throw err;
      }
    },

    /**
     * Register Step 2: Complete registration via API
     * Stores tokens and fetches user profile on success.
     */
    async completeRegistration(dto: RegisterCompleteDto) {
      patchState(store, { isLoading: true, error: null });
      try {
        const authResponse = await lastValueFrom(apiService.registerComplete(dto));
        patchState(store, {
          token: authResponse.accessToken,
          isLoading: false,
          error: null,
        });

        // Fetch user profile after successful registration
        await this.fetchUserProfile();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Login with email/phone and password via API
     * Stores tokens and fetches user profile on success.
     */
    async loginWithPassword(dto: LoginPasswordDto) {
      patchState(store, { isLoading: true, error: null });
      try {
        const authResponse = await lastValueFrom(apiService.loginPassword(dto));
        patchState(store, {
          token: authResponse.accessToken,
          isLoading: false,
          error: null,
        });

        // Fetch user profile after successful login
        await this.fetchUserProfile();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Refresh the access token using HttpOnly cookie (no client-side refresh token needed).
     */
    async refreshAccessToken() {
      patchState(store, { isLoading: true, error: null });
      try {
        const authResponse = await lastValueFrom(apiService.refreshToken());
        patchState(store, {
          token: authResponse.accessToken,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Token refresh failed';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Async logout - calls API to blacklist token, then clears local state.
     * Always clears local state regardless of API success/failure.
     */
    async logout() {
      patchState(store, { isLoading: true });
      try {
        await lastValueFrom(apiService.logout());
      } catch {
        // Always clear local state regardless of API outcome
      } finally {
        this.clearAuthState();
      }
    },

    /**
     * Fetch current user profile from API.
     */
    async fetchUserProfile() {
      patchState(store, { isLoading: true, error: null });
      try {
        const profile = await lastValueFrom(apiService.getUserProfile());
        const user: User = {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          email: profile.email,
          phone: profile.phone,
          preferredTimezone: profile.preferredTimezone,
          createdAt: profile.createdAt,
        };
        patchState(store, { user, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch profile';
        patchState(store, { error: message, isLoading: false });
      }
    },

    /**
     * Restore session on app bootstrap.
     * Calls refreshToken() to get a new access token from the HttpOnly cookie,
     * then fetches the user profile. Returns false silently if no cookie is available.
     */
    async restoreSession(): Promise<boolean> {
      try {
        const response = await lastValueFrom(apiService.refreshToken());
        patchState(store, { token: response.accessToken });
        await this.fetchUserProfile();
        return true;
      } catch {
        // No valid cookie or refresh token — stay in guest state silently
        return false;
      }
    },
  }))
);
