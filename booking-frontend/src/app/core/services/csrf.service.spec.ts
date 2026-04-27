import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  let service: CsrfService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CsrfService],
    });

    service = TestBed.inject(CsrfService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return null initially for getToken()', () => {
    expect(service.getToken()).toBeNull();
  });

  it('should send GET request to /api/csrf/token on fetchToken()', () => {
    const mockResponse = { token: 'abc123def456' };

    service.fetchToken().subscribe();

    const req = httpMock.expectOne('/api/csrf/token');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should cache token after fetchToken() so getToken() returns it', () => {
    const mockToken = 'abc123def456';

    service.fetchToken().subscribe(() => {
      expect(service.getToken()).toBe(mockToken);
    });

    const req = httpMock.expectOne('/api/csrf/token');
    req.flush({ token: mockToken });
  });

  it('should return null after clearToken()', () => {
    const mockToken = 'abc123def456';

    service.fetchToken().subscribe(() => {
      service.clearToken();
      expect(service.getToken()).toBeNull();
    });

    const req = httpMock.expectOne('/api/csrf/token');
    req.flush({ token: mockToken });
  });

  it('should throw error when fetchToken() HTTP request fails', () => {
    service.fetchToken().subscribe({
      next: () => fail('expected error to be thrown'),
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne('/api/csrf/token');
    req.flush(
      { message: 'Internal server error' },
      { status: 500, statusText: 'Internal Server Error' },
    );
  });

  it('ensureToken() should return cached token synchronously', () => {
    const mockToken = 'cached-token';

    service.fetchToken().subscribe();
    const fetchReq = httpMock.expectOne('/api/csrf/token');
    fetchReq.flush({ token: mockToken });
    expect(service.getToken()).toBe(mockToken);

    let emitted = false;
    service.ensureToken().subscribe((token) => {
      expect(token).toBe(mockToken);
      emitted = true;
    });
    expect(emitted).toBe(true);
  });

  it('ensureToken() should fetch token when not cached', () => {
    const mockToken = 'abc123def456';

    service.ensureToken().subscribe((token) => {
      expect(token).toBe(mockToken);
      expect(service.getToken()).toBe(mockToken);
    });

    const req = httpMock.expectOne('/api/csrf/token');
    expect(req.request.method).toBe('GET');
    req.flush({ token: mockToken });
  });

  it('ensureToken() should share a single in-flight request among multiple subscribers', () => {
    const mockToken = 'shared-token';
    let completedCount = 0;

    service.ensureToken().subscribe((token) => {
      expect(token).toBe(mockToken);
      completedCount++;
    });
    service.ensureToken().subscribe((token) => {
      expect(token).toBe(mockToken);
      completedCount++;
    });

    const req = httpMock.expectOne('/api/csrf/token');
    expect(req.request.method).toBe('GET');
    req.flush({ token: mockToken });
    expect(completedCount).toBe(2);
  });
});
