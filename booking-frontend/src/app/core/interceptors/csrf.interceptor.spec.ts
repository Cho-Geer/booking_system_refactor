import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { csrfInterceptor } from './csrf.interceptor';
import { CsrfService } from '../services/csrf.service';

describe('CsrfInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let csrfServiceMock: {
    fetchToken: jest.Mock;
    getToken: jest.Mock;
    clearToken: jest.Mock;
    ensureToken: jest.Mock;
  };

  const mockToken = 'test-csrf-token-value';

  beforeEach(() => {
    csrfServiceMock = {
      fetchToken: jest.fn(),
      getToken: jest.fn(),
      clearToken: jest.fn(),
      ensureToken: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
        { provide: CsrfService, useValue: csrfServiceMock },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add X-CSRF-Token header to POST requests', () => {
    csrfServiceMock.getToken.mockReturnValue(mockToken);

    httpClient.post('/api/data', { name: 'test' }).subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('X-CSRF-Token')).toBe(mockToken);
    req.flush({});
  });

  it('should add X-CSRF-Token header to PATCH requests', () => {
    csrfServiceMock.getToken.mockReturnValue(mockToken);

    httpClient.patch('/api/data/1', { name: 'updated' }).subscribe();

    const req = httpMock.expectOne('/api/data/1');
    expect(req.request.headers.get('X-CSRF-Token')).toBe(mockToken);
    req.flush({});
  });

  it('should add X-CSRF-Token header to DELETE requests', () => {
    csrfServiceMock.getToken.mockReturnValue(mockToken);

    httpClient.delete('/api/data/1').subscribe();

    const req = httpMock.expectOne('/api/data/1');
    expect(req.request.headers.get('X-CSRF-Token')).toBe(mockToken);
    req.flush({});
  });

  it('should NOT add X-CSRF-Token header to GET requests', () => {
    csrfServiceMock.getToken.mockReturnValue(mockToken);

    httpClient.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush({});
  });

  it('should call ensureToken when token is null and attach header', () => {
    csrfServiceMock.getToken.mockReturnValue(null);
    csrfServiceMock.ensureToken.mockReturnValue(of(mockToken));

    httpClient.post('/api/data', { name: 'test' }).subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(csrfServiceMock.ensureToken).toHaveBeenCalled();
    expect(req.request.headers.get('X-CSRF-Token')).toBe(mockToken);
    req.flush({});
  });

  it('should fall through without CSRF header when ensureToken errors', () => {
    csrfServiceMock.getToken.mockReturnValue(null);
    csrfServiceMock.ensureToken.mockReturnValue(
      throwError(() => new Error('fetch failed')),
    );

    httpClient.post('/api/data', { name: 'test' }).subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush({});
  });

  it('should not modify request body', () => {
    csrfServiceMock.getToken.mockReturnValue(mockToken);
    const testBody = { key: 'value', num: 42 };

    httpClient.post('/api/data', testBody).subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.body).toEqual(testBody);
    expect(req.request.headers.get('X-CSRF-Token')).toBe(mockToken);
    req.flush({});
  });
});
