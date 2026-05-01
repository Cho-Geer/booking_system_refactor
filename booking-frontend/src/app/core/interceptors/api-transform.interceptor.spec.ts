import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiTransformInterceptor } from './api-transform.interceptor';

describe('ApiTransformInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([apiTransformInterceptor]),
        ),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Request body transformation', () => {
    it('should convert camelCase request body to snake_case for non-auth endpoints', () => {
      const body = { timeSlotId: 1, userId: 'user-abc' };

      httpClient.post('/api/bookings', body).subscribe();

      const req = httpMock.expectOne('/api/bookings');
      expect(req.request.body).toEqual({
        time_slot_id: 1,
        user_id: 'user-abc',
      });
      req.flush({});
    });

    it('should NOT convert camelCase request body for /auth/ register endpoint', () => {
      const body = {
        contactType: 'email',
        email: 'test@example.com',
        passwordHash: 'hashed-value',
      };

      httpClient.post('/api/auth/register', body).subscribe();

      const req = httpMock.expectOne('/api/auth/register');
      // contactType and email stay as camelCase (not converted to snake_case)
      expect(req.request.body).toEqual({
        contactType: 'email',
        email: 'test@example.com',
        passwordHash: 'hashed-value',
      });
      req.flush({});
    });

    it('should NOT convert camelCase request body for /auth/ login endpoint', () => {
      const body = { email: 'user@test.com', password: 'secret123' };

      httpClient.post('/api/auth/login/password', body).subscribe();

      const req = httpMock.expectOne('/api/auth/login/password');
      expect(req.request.body).toEqual({
        email: 'user@test.com',
        password: 'secret123',
      });
      req.flush({});
    });

    it('should preserve PII fields like passwordHash in non-auth requests', () => {
      const body = {
        timeSlotId: 5,
        passwordHash: 'should-stay-as-is',
      };

      httpClient.post('/api/bookings', body).subscribe();

      const req = httpMock.expectOne('/api/bookings');
      expect(req.request.body).toEqual({
        time_slot_id: 5,
        passwordHash: 'should-stay-as-is',
      });
      req.flush({});
    });

    it('should pass through GET requests without body', () => {
      httpClient.get('/api/bookings').subscribe();

      const req = httpMock.expectOne('/api/bookings');
      expect(req.request.body).toBeNull();
      req.flush({});
    });

    it('should NOT transform FormData request body', () => {
      const formData = new FormData();
      formData.append('file', 'test');

      httpClient.post('/api/upload', formData).subscribe();

      const req = httpMock.expectOne('/api/upload');
      expect(req.request.body).toBe(formData);
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({});
    });

    it('should convert nested camelCase objects in non-auth requests', () => {
      const body = {
        userId: 'abc',
        addressInfo: {
          streetName: 'Main St',
          zipCode: '12345',
        },
      };

      httpClient.post('/api/bookings', body).subscribe();

      const req = httpMock.expectOne('/api/bookings');
      expect(req.request.body).toEqual({
        user_id: 'abc',
        address_info: {
          street_name: 'Main St',
          zip_code: '12345',
        },
      });
      req.flush({});
    });
  });

  describe('Response body transformation', () => {
    it('should convert snake_case response body to camelCase', (done) => {
      const snakeResponse = {
        time_slot_id: 1,
        user_id: 'abc',
        service_name: 'Consultation',
      };

      httpClient.get('/api/bookings').subscribe((data) => {
        expect(data).toEqual({
          timeSlotId: 1,
          userId: 'abc',
          serviceName: 'Consultation',
        });
        done();
      });

      const req = httpMock.expectOne('/api/bookings');
      req.flush(snakeResponse);
    });

    it('should convert nested snake_case response to camelCase', (done) => {
      const snakeResponse = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe',
          contact_details: {
            phone_number: '123-456',
          },
        },
      };

      httpClient.get('/api/users').subscribe((data) => {
        expect(data).toEqual({
          userInfo: {
            firstName: 'John',
            lastName: 'Doe',
            contactDetails: {
              phoneNumber: '123-456',
            },
          },
        });
        done();
      });

      const req = httpMock.expectOne('/api/users');
      req.flush(snakeResponse);
    });

    it('should convert snake_case items in array response to camelCase', (done) => {
      const snakeResponse = [
        { service_id: 1, service_name: 'Consultation' },
        { service_id: 2, service_name: 'Follow-up' },
      ];

      httpClient.get('/api/services').subscribe((data) => {
        expect(data).toEqual([
          { serviceId: 1, serviceName: 'Consultation' },
          { serviceId: 2, serviceName: 'Follow-up' },
        ]);
        done();
      });

      const req = httpMock.expectOne('/api/services');
      req.flush(snakeResponse);
    });

    it('should still camelCase response from auth endpoints', (done) => {
      // Response transformation applies regardless of URL
      const snakeResponse = {
        access_token: 'tok_123',
        refresh_token: 'ref_456',
      };

      httpClient.post('/api/auth/login/password', {}).subscribe((data) => {
        expect(data).toEqual({
          accessToken: 'tok_123',
          refreshToken: 'ref_456',
        });
        done();
      });

      const req = httpMock.expectOne('/api/auth/login/password');
      req.flush(snakeResponse);
    });

    it('should handle null response body gracefully', (done) => {
      httpClient.get('/api/health').subscribe((data) => {
        expect(data).toBeNull();
        done();
      });

      const req = httpMock.expectOne('/api/health');
      req.flush(null);
    });
  });
});
