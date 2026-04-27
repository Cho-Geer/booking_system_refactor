/**
 * Helper functions for extracting response body data from integration tests.
 *
 * The ResponseInterceptor wraps all successful responses in StandardResponse format:
 * { code, data, message, requestId, success, timestamp }
 *
 * These helpers unwrap the response so tests can access `response.body.data` directly.
 */

export interface StandardResponse<T = any> {
  body: {
    data?: T;
    code?: number;
    success?: boolean;
    message?: string;
    [key: string]: any;
  };
}

/**
 * Extracts the `data` field from a wrapped StandardResponse.
 * Falls back to the full body if `data` is not present (e.g., error responses).
 */
export function extractDataBody<T = any>(response: StandardResponse<T>): T {
  return (response.body.data ?? response.body) as T;
}

/**
 * Convenience alias for chaining assertions.
 * Returns the unwrapped body for direct property access.
 */
export function expectBody<T = any>(response: StandardResponse<T>): T {
  return extractDataBody(response);
}
