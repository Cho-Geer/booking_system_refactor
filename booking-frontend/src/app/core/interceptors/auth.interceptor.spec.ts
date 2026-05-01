import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from '../../stores/auth/auth.store';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStore: any;

  const mockToken = 'test-access-token';
  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    userType: 'USER',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([authInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    // Flush any pending POST /api/auth/logout requests (from logout())
    try {
      const logoutReqs = httpMock.match((req) => req.url === '/api/auth/logout');
      logoutReqs.forEach(req => req.flush({ message: 'Logged out' }));
    } catch {
      // ignore
    }
    httpMock.verify();
  });

  it('should NOT add Authorization header when user is not authenticated', () => {
    // Use clearAuthState to avoid triggering the async logout API call
    authStore.clearAuthState();

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should add Authorization header when user is authenticated', () => {
    authStore.loginSuccess(mockToken, 'test-refresh-token');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('should stop adding header after user state is cleared', () => {
    authStore.loginSuccess(mockToken, 'test-refresh-token');
    // Use synchronous clearAuthState (unlike async logout()) for test simplicity
    authStore.clearAuthState();

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  // ==========================================
  // [RED] Token Refresh - Profile Fetch Tests
  // ==========================================
  // [RED] Token Refresh - Profile Fetch Tests
  // ==========================================

  it('[GREEN] should fetch user profile after successful token refresh and retry request', () => {
    // Arrange: set up authenticated state
    authStore.loginSuccess(mockToken, 'test-refresh-token');

    // Spy on fetchUserProfile to verify it's called
    const fetchSpy = jest.spyOn(authStore, 'fetchUserProfile');

    // Act: make an authenticated request
    httpClient.get('/api/test').subscribe();

    // Initial request should have the Authorization header
    const initialReq = httpMock.expectOne('/api/test');
    expect(initialReq.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);

    // Flush 401 to trigger refresh
    initialReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Expect refresh token API call
    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    });

    // Verify fetchUserProfile was called (fire-and-forget)
    expect(fetchSpy).toHaveBeenCalled();

    // The original request is retried immediately with the new token
    const retriedReq = httpMock.expectOne('/api/test');
    expect(retriedReq.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    retriedReq.flush({});

    // Flush the fire-and-forget profile request created by fetchUserProfile()
    const profileReq = httpMock.expectOne('/api/users/profile');
    profileReq.flush({
      success: true,
      data: {
        id: 'user-1',
        name: 'Test User',
        userType: 'USER',
        createdAt: '2024-01-01',
      },
    });
  });

  it('[GREEN] should call fetchUserProfile after successful token refresh', () => {
    // Arrange: set up authenticated state
    authStore.loginSuccess(mockToken, 'test-refresh-token');
    const fetchSpy = jest.spyOn(authStore, 'fetchUserProfile');

    // Act: make an authenticated request
    httpClient.get('/api/test').subscribe();

    // Initial request should have the Authorization header
    const initialReq = httpMock.expectOne('/api/test');
    expect(initialReq.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);

    // Flush 401 to trigger refresh
    initialReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Expect refresh token API call
    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    });

    // Verify fetchUserProfile was called (fire-and-forget)
    expect(fetchSpy).toHaveBeenCalled();

    // The original request is retried immediately
    const retriedReq = httpMock.expectOne('/api/test');
    retriedReq.flush({});

    // Flush the fire-and-forget profile request created by fetchUserProfile()
    const profileReq = httpMock.expectOne('/api/users/profile');
    profileReq.flush({
      success: true,
      data: {
        id: 'user-1',
        name: 'Test User',
        userType: 'USER',
        createdAt: '2024-01-01',
      },
    });
  });
});
