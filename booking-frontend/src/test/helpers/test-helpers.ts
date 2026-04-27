/**
 * Test helpers for booking-frontend.
 *
 * Common utilities and helper functions used across test files.
 */

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

/**
 * Configure the HttpClientTestingModule and return the HttpTestingController.
 *
 * Usage:
 *   let httpMock: HttpTestingController;
 *
 *   beforeEach(() => {
 *     ({ httpMock } = setupHttpTesting());
 *   });
 */
export function setupHttpTesting() {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
  });

  const httpMock = TestBed.inject(HttpTestingController);
  return { httpMock };
}

/**
 * Verify that there are no outstanding HTTP requests.
 * Should be called in afterEach() to ensure all requests were handled.
 */
export function verifyNoOutstandingRequests(httpMock: HttpTestingController) {
  httpMock.verify();
}

/**
 * Create a mock HTTP response handler for a specific URL.
 *
 * Usage:
 *   const handler = mockHttpResponse('/api/services');
 *   handler.expect(mockServices);
 */
export function mockHttpResponse(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') {
  return {
    expect: <T>(body: T, status: number = 200) => {
      const req = httpMockInstance.expectOne(url);
      expect(req.request.method).toBe(method);
      req.flush(body, { status });
    },
    expectWithCallback: <T>(body: T, callback: (req: any) => void, status: number = 200) => {
      const req = httpMockInstance.expectOne(url);
      callback(req);
      req.flush(body, { status });
    },
  };
}

// Internal reference to HttpTestingController instance
let httpMockInstance: HttpTestingController;

/**
 * Initialize the httpMockInstance for use with mockHttpResponse.
 * Call this once in your test setup.
 */
export function initHttpMock(httpMock: HttpTestingController) {
  httpMockInstance = httpMock;
}

/**
 * Generate a random string for test data.
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a future date string (ISO 8601).
 * @param daysAhead - How many days in the future (default: 1-30 random)
 */
export function futureDate(daysAhead?: number): string {
  const d = new Date();
  d.setDate(d.getDate() + (daysAhead ?? Math.floor(Math.random() * 30) + 1));
  return d.toISOString();
}

/**
 * Create a spy object with all methods mocked to return undefined.
 *
 * Usage:
 *   const mockService = createSpyObject<MyService>(['method1', 'method2']);
 */
export function createSpyObject<T>(methods: string[]): Record<string, jest.Mock> {
  const spyObj: Record<string, jest.Mock> = {};
  methods.forEach((method) => {
    spyObj[method] = jest.fn();
  });
  return spyObj;
}

/**
 * Wait for a promise to resolve in a test.
 * Useful for testing async operations.
 */
export async function tick(): Promise<void> {
  await Promise.resolve();
}

/**
 * Wait for multiple ticks.
 */
export async function ticks(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await tick();
  }
}
