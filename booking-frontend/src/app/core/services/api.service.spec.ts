import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService, ApiResponse } from './api.service';
import {
  LoginPasswordDto,
  RegisterCompleteDto,
  RegisterSendCodeDto,
  LoginSendCodeDto,
  LoginVerifyCodeDto,
  ContactType,
  AuthResponseDto,
  RegisterSendCodeResponse,
  LoginSendCodeResponse,
  LogoutResponse,
} from '../../features/auth/dto/auth.dto';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loginPassword()', () => {
    it('[RED] should fail: loginPassword should unwrap ApiResponse envelope', () => {
      const mockCredentials: LoginPasswordDto = {
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
        password: 'password123',
      };
      const mockData: AuthResponseDto = {
        accessToken: 'jwt-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 900,
        tokenType: 'Bearer',
      };
      const wrappedResponse: ApiResponse<AuthResponseDto> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.loginPassword(mockCredentials).subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login/password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCredentials);
      req.flush(wrappedResponse);

      // [RED] received is the full envelope (not unwrapped), so accessToken is undefined
      // This assertion FAILS → proves RED state
      expect(received.accessToken).toBe('jwt-token-123');
    });

    it('should handle login error', () => {
      const mockCredentials: LoginPasswordDto = {
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
        password: 'wrong',
      };

      service.loginPassword(mockCredentials).subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login/password`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('registerComplete()', () => {
    it('[RED] should fail: registerComplete should unwrap ApiResponse envelope', () => {
      const mockDto: RegisterCompleteDto = {
        contact: 'new@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'password123',
        name: 'New User',
      };
      const mockData: AuthResponseDto = {
        accessToken: 'jwt-token-456',
        refreshToken: 'refresh-token-456',
        expiresIn: 900,
        tokenType: 'Bearer',
      };
      const wrappedResponse: ApiResponse<AuthResponseDto> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.registerComplete(mockDto).subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register/complete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockDto);
      req.flush(wrappedResponse);

      // [RED] received is the full envelope (not unwrapped), so accessToken is undefined
      // This assertion FAILS → proves RED state
      expect(received.accessToken).toBe('jwt-token-456');
    });

    it('should handle registration error', () => {
      const mockData: RegisterCompleteDto = {
        contact: 'duplicate@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
        password: 'password123',
        name: 'Duplicate',
      };

      service.registerComplete(mockData).subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register/complete`);
      req.flush({ message: 'Email already exists' }, { status: 409, statusText: 'Conflict' });
    });
  });

  // ============================================================
  // [RED] Tests: Auth methods need ApiResponse.data unwrapping
  // All these tests WILL FAIL until the unwrap logic is added.
  // ============================================================

  describe('registerSendCode() [RED - needs unwrap]', () => {
    it('[RED] should fail: registerSendCode should unwrap ApiResponse envelope', () => {
      const mockDto: RegisterSendCodeDto = {
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
      };
      const mockData: RegisterSendCodeResponse = {
        maskedContact: 'tes***@example.com',
        expiresIn: 300,
      };
      const wrappedResponse: ApiResponse<RegisterSendCodeResponse> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.registerSendCode(mockDto).subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register/send-code`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockDto);
      req.flush(wrappedResponse);

      // [RED] received is full envelope → maskedContact is undefined → FAILS
      expect(received.maskedContact).toBe('tes***@example.com');
    });
  });

  describe('loginSendCode() [RED - needs unwrap]', () => {
    it('[RED] should fail: loginSendCode should unwrap ApiResponse envelope', () => {
      const mockDto: LoginSendCodeDto = {
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
      };
      const mockData: LoginSendCodeResponse = {
        expiresIn: 300,
      };
      const wrappedResponse: ApiResponse<LoginSendCodeResponse> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.loginSendCode(mockDto).subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login/send-code`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockDto);
      req.flush(wrappedResponse);

      // [RED] received is full envelope → accessToken undefined → FAILS
      expect(received.expiresIn).toBe(300);
    });
  });

  describe('loginVerifyCode() [RED - needs unwrap]', () => {
    it('[RED] should fail: loginVerifyCode should unwrap ApiResponse envelope', () => {
      const mockDto: LoginVerifyCodeDto = {
        contact: 'test@example.com',
        contactType: ContactType.EMAIL,
        code: '123456',
      };
      const mockData: AuthResponseDto = {
        accessToken: 'jwt-token-789',
        refreshToken: 'refresh-token-789',
        expiresIn: 900,
        tokenType: 'Bearer',
      };
      const wrappedResponse: ApiResponse<AuthResponseDto> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.loginVerifyCode(mockDto).subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login/verify-code`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockDto);
      req.flush(wrappedResponse);

      // [RED] received is full envelope → accessToken undefined → FAILS
      expect(received.accessToken).toBe('jwt-token-789');
    });
  });

  describe('refreshToken() [RED - needs unwrap]', () => {
    it('[RED] should fail: refreshToken should unwrap ApiResponse envelope', () => {
      const mockData: AuthResponseDto = {
        accessToken: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };
      const wrappedResponse: ApiResponse<AuthResponseDto> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.refreshToken('old-refresh-token').subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'old-refresh-token' });
      req.flush(wrappedResponse);

      // [RED] received is full envelope → accessToken undefined → FAILS
      expect(received.accessToken).toBe('new-jwt-token');
    });
  });

  describe('logout() [RED - needs unwrap]', () => {
    it('[RED] should fail: logout should unwrap ApiResponse envelope', () => {
      const mockData: LogoutResponse = {
        message: 'Logged out successfully',
      };
      const wrappedResponse: ApiResponse<LogoutResponse> = {
        statusCode: 200,
        message: 'OK',
        data: mockData,
        timestamp: '2026-04-27T00:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      let received: any = null;
      service.logout().subscribe({
        next: (r) => { received = r; },
        error: (err) => fail(err),
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush(wrappedResponse);

      // [RED] received is full envelope → message undefined → FAILS
      expect(received.message).toBe('Logged out successfully');
    });
  });

  describe('getServices()', () => {
    const mockServices = [
      { id: '1', name: 'Haircut', description: 'Standard haircut', durationMinutes: 30, price: 25 },
      { id: '2', name: 'Coloring', description: 'Hair coloring', durationMinutes: 60, price: 50 },
    ];

    it('should send GET request to /api/services and unwrap ApiResponse', (done) => {
      const wrappedResponse: ApiResponse<typeof mockServices> = {
        statusCode: 200,
        message: 'OK',
        data: mockServices,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      service.getServices().subscribe({
        next: (services) => {
          try {
            expect(services.length).toBe(2);
            expect(services[0].name).toBe('Haircut');
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error: ' + err),
      });

      const req = httpMock.expectOne(`${apiUrl}/services`);
      expect(req.request.method).toBe('GET');
      req.flush(wrappedResponse);
    });

    it('should retry failed requests up to 2 times', () => {
      service.getServices().subscribe({
        next: () => fail('expected error after retries'),
        error: () => {
          // Expected after 3 total attempts (1 original + 2 retries)
        },
      });

      // retry(2) means 3 total requests: original + 2 retries
      const req1 = httpMock.expectOne(`${apiUrl}/services`);
      req1.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

      const req2 = httpMock.expectOne(`${apiUrl}/services`);
      req2.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

      const req3 = httpMock.expectOne(`${apiUrl}/services`);
      req3.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network error on getServices', () => {
      service.getServices().subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      // retry(2) means 3 total requests
      const req1 = httpMock.expectOne(`${apiUrl}/services`);
      req1.flush({ message: 'Network error' }, { status: 500, statusText: 'Internal Server Error' });

      const req2 = httpMock.expectOne(`${apiUrl}/services`);
      req2.flush({ message: 'Network error' }, { status: 500, statusText: 'Internal Server Error' });

      const req3 = httpMock.expectOne(`${apiUrl}/services`);
      req3.flush({ message: 'Network error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    // ============================================================
    // [RED] Tests: API Response Unwrapping (ResponseInterceptor)
    // These prove that the current code does NOT unwrap response.data
    // and will FAIL until the unwrap logic is added to ApiService.
    // ============================================================

    it('[GREEN] should unwrap ApiResponse envelope from backend for getServices', (done) => {
      // Simulate the actual backend ResponseInterceptor response format
      const wrappedResponse: ApiResponse<typeof mockServices> = {
        statusCode: 200,
        message: 'OK',
        data: mockServices,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };
      service.getServices().subscribe({
        next: (services) => {
          try {
            // With unwrapping, services is the data array, not the envelope
            expect(Array.isArray(services)).toBe(true);
            expect(services.length).toBe(2);
            expect(services[0].name).toBe('Haircut');
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error on successful response: ' + err),
      });

      const req = httpMock.expectOne(`${apiUrl}/services`);
      expect(req.request.method).toBe('GET');
      req.flush(wrappedResponse);
    });

    it('[GREEN] should return actual data array from wrapped response for getServices', (done) => {
      const wrappedResponse: ApiResponse<typeof mockServices> = {
        statusCode: 200,
        message: 'OK',
        data: mockServices,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      service.getServices().subscribe({
        next: (services) => {
          try {
            // With unwrapping, services is the data array
            expect(Array.isArray(services)).toBe(true);
            const names = services.map(s => s.name);
            expect(names).toEqual(['Haircut', 'Coloring']);
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error: ' + err),
      });

      const req = httpMock.expectOne(`${apiUrl}/services`);
      req.flush(wrappedResponse);
    });
  });

  describe('getAvailableSlots()', () => {
    const mockSlots = [
      { id: 'slot-1', date: '2026-04-20', time: '09:00', isActive: true },
      { id: 'slot-2', date: '2026-04-20', time: '10:00', isActive: true },
    ];

    it('should send GET request to /api/time-slots/available with serviceId param', () => {
      service.getAvailableSlots('svc-1').subscribe((slots) => {
        expect(slots.length).toBe(2);
        expect(slots[0].id).toBe('slot-1');
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/time-slots/available` &&
          request.params.get('serviceId') === 'svc-1'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockSlots);
    });

    it('should retry on failure', () => {
      service.getAvailableSlots('svc-1').subscribe({
        next: () => fail('expected error'),
        error: () => {},
      });

      // retry(2) means 3 total requests
      const req1 = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/time-slots/available` &&
          request.params.get('serviceId') === 'svc-1'
        );
      });
      req1.flush({ message: 'Error' }, { status: 500, statusText: 'Error' });

      const req2 = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/time-slots/available` &&
          request.params.get('serviceId') === 'svc-1'
        );
      });
      req2.flush({ message: 'Error' }, { status: 500, statusText: 'Error' });

      const req3 = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/time-slots/available` &&
          request.params.get('serviceId') === 'svc-1'
        );
      });
      req3.flush({ message: 'Error' }, { status: 500, statusText: 'Error' });
    });

    // ============================================================
    // [RED] Test: getAvailableSlots API Response Unwrapping
    // ============================================================

    it('[GREEN] should unwrap ApiResponse envelope for getAvailableSlots', (done) => {
      const wrappedResponse: ApiResponse<typeof mockSlots> = {
        statusCode: 200,
        message: 'OK',
        data: mockSlots,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      service.getAvailableSlots('svc-1').subscribe({
        next: (slots) => {
          try {
            expect(Array.isArray(slots)).toBe(true);
            expect(slots.length).toBe(2);
            expect(slots[0].id).toBe('slot-1');
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error: ' + err),
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/time-slots/available` &&
          request.params.get('serviceId') === 'svc-1'
        );
      });
      req.flush(wrappedResponse);
    });
  });

  // ============================================================
  // [RED] Tests: New ResponseInterceptor format (statusCode)
  // These tests use the NEW { statusCode, message, data, timestamp, requestId }
  // format and will FAIL because ApiResponse<T> still expects { success, code }.
  // After GREEN, these should pass with the updated ApiResponse interface.
  // ============================================================

  describe('new ResponseInterceptor statusCode format', () => {
    const mockServices = [
      { id: '1', name: 'Haircut', description: 'Standard haircut', durationMinutes: 30, price: 25 },
      { id: '2', name: 'Coloring', description: 'Hair coloring', durationMinutes: 60, price: 50 },
    ];

    it('[RED] should parse new statusCode format for getServices', (done) => {
      // New backend format: { statusCode, message, data, timestamp, requestId }
      const newFormatResponse: ApiResponse<typeof mockServices> = {
        statusCode: 200,
        message: 'OK',
        data: mockServices,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      service.getServices().subscribe({
        next: (services) => {
          try {
            expect(Array.isArray(services)).toBe(true);
            expect(services.length).toBe(2);
            expect(services[0].name).toBe('Haircut');
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error: ' + err),
      });

      const req = httpMock.expectOne(`${apiUrl}/services`);
      req.flush(newFormatResponse);
    });

    it('[RED] should parse new statusCode format for getAvailableSlots', (done) => {
      const mockSlots = [
        { id: 'slot-1', date: '2026-04-20', time: '09:00', isActive: true },
        { id: 'slot-2', date: '2026-04-20', time: '10:00', isActive: true },
      ];

      const newFormatResponse: ApiResponse<typeof mockSlots> = {
        statusCode: 200,
        message: 'OK',
        data: mockSlots,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      service.getAvailableSlots('svc-1').subscribe({
        next: (slots) => {
          try {
            expect(Array.isArray(slots)).toBe(true);
            expect(slots.length).toBe(2);
            expect(slots[0].id).toBe('slot-1');
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error: ' + err),
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/time-slots/available` &&
          request.params.get('serviceId') === 'svc-1'
        );
      });
      req.flush(newFormatResponse);
    });

    it('[RED] should parse new statusCode format for getUserProfile', (done) => {
      const mockProfile = {
        id: 'user-1',
        name: 'Test User',
        email: 'us***@example.com',
        role: 'CUSTOMER',
        created_at: '2026-01-01T00:00:00.000Z',
      };

      const newFormatResponse: ApiResponse<typeof mockProfile> = {
        statusCode: 200,
        message: 'OK',
        data: mockProfile,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-test-uuid',
      };

      service.getUserProfile().subscribe({
        next: (profile) => {
          try {
            expect(profile.name).toBe('Test User');
            expect(profile.role).toBe('CUSTOMER');
            done();
          } catch (e) {
            done(e);
          }
        },
        error: (err) => done('should not error: ' + err),
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      req.flush(newFormatResponse);
    });

    it('[RED] should handle ApiResponse with statusCode indicating failure', (done) => {
      const errorResponse: ApiResponse<null> = {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
        timestamp: '2026-04-24T10:00:00.000Z',
        requestId: 'req-error-uuid',
      };

      service.getServices().subscribe({
        next: () => done('should have errored'),
        error: (error) => {
          try {
            expect(error).toBeTruthy();
            done();
          } catch (e) {
            done(e);
          }
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/services`);
      req.flush(errorResponse);
    });
  });

  describe('createAppointment()', () => {
    it('[RED] should fail: createAppointment should send POST to /api/appointments', () => {
      const mockResponse = {
        status: 'SUCCESS' as const,
        slot: { id: 'slot-1', date: '2026-04-20', time: '09:00', isActive: false },
      };

      service.createAppointment({
        timeSlotId: 'slot-1',
        appointmentDate: '2026-04-20T09:00:00Z',
        notes: 'Test appointment',
      }).subscribe((response) => {
        expect(response.status).toBe('SUCCESS');
      });

      const req = httpMock.expectOne(`${apiUrl}/appointments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        timeSlotId: 'slot-1',
        appointmentDate: '2026-04-20T09:00:00Z',
        notes: 'Test appointment',
      });
      req.flush(mockResponse);
    });

    it('[RED] should fail: createAppointment should handle API error', () => {
      service.createAppointment({
        timeSlotId: 'slot-1',
        appointmentDate: '2026-04-20T09:00:00Z',
      }).subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/appointments`);
      req.flush({ message: 'Time slot not available' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('reserveSlot()', () => {
    it('should send POST request to /api/slots/:id/reserve with preferSeq', () => {
      const mockResponse = {
        status: 'SUCCESS' as const,
        slot: { id: 'slot-1', date: '2026-04-20', time: '09:00', isActive: false },
      };

      service.reserveSlot('slot-1', 5).subscribe((response) => {
        expect(response.status).toBe('SUCCESS');
      });

      const req = httpMock.expectOne(`${apiUrl}/slots/slot-1/reserve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ preferSeq: 5 });
      expect(req.request.headers.has('X-Idempotency-Key')).toBe(false);
      req.flush(mockResponse);
    });

    it('should include X-Idempotency-Key header when provided', () => {
      service.reserveSlot('slot-1', 3, 'key-123').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/slots/slot-1/reserve`);
      expect(req.request.headers.get('X-Idempotency-Key')).toBe('key-123');
      req.flush({ status: 'SUCCESS', slot: {} });
    });

    it('should handle reservation failure', () => {
      service.reserveSlot('slot-1', 5).subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/slots/slot-1/reserve`);
      req.flush({ message: 'Slot no longer available' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('cancelBooking()', () => {
    it('should send DELETE request to /api/appointments/:id', () => {
      service.cancelBooking('booking-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/appointments/booking-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle cancel error', () => {
      service.cancelBooking('booking-1').subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/appointments/booking-1`);
      req.flush({ message: 'Booking not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('error handling', () => {
    it('should return Error with message from HTTP error response', () => {
      service.getServices().subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Service unavailable');
        },
      });

      // retry(2) means 3 total requests
      const req1 = httpMock.expectOne(`${apiUrl}/services`);
      req1.flush({ message: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });

      const req2 = httpMock.expectOne(`${apiUrl}/services`);
      req2.flush({ message: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });

      const req3 = httpMock.expectOne(`${apiUrl}/services`);
      req3.flush({ message: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    });

    it('should handle network errors gracefully', () => {
      service.loginPassword({
        contact: 'test@test.com',
        contactType: ContactType.EMAIL,
        password: 'test',
      }).subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('An error occurred. Please try again.');
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login/password`);
      req.error(new ProgressEvent('Network error'));
    });
  });
});
