/**
 * k6 Performance Test Configuration
 *
 * Environment configuration for booking-backend load testing.
 * Override values via environment variables or .env file.
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 test/performance/booking-create-load-test.js
 *   k6 run --env VUS=100 --env DURATION=2m test/performance/booking-create-load-test.js
 */

// ─────────────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────────────

/**
 * Base URL of the backend API.
 * Default: http://localhost:3000
 */
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * API version prefix.
 * Per 接口设计规范文档: /api/v1/
 */
export const API_PREFIX = __ENV.API_PREFIX || '/api/v1';

// ─────────────────────────────────────────────────────
// Auth Configuration
// ─────────────────────────────────────────────────────

/**
 * Email domain used for generating unique test users.
 * Each VU gets a unique email like: k6-perf-{vuId}-{timestamp}@loadtest.local
 */
export const TEST_EMAIL_DOMAIN = __ENV.TEST_EMAIL_DOMAIN || 'loadtest.local';

/**
 * Default password for all test users.
 * Must satisfy backend password policy:
 *   - Min 8 chars
 *   - At least one uppercase, one lowercase, one number, one special char
 */
export const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'PerfTest2024!';

/**
 * Base name for generated test users.
 */
export const TEST_USER_NAME_PREFIX = __ENV.TEST_USER_NAME_PREFIX || 'K6 Load Test User';

// ─────────────────────────────────────────────────────
// Test Data Configuration
// ─────────────────────────────────────────────────────

/**
 * Fixed service ID to use for appointment booking.
 * Should be pre-seeded in the database before running tests.
 */
export const DEFAULT_SERVICE_ID = __ENV.DEFAULT_SERVICE_ID || 'service-001';

/**
 * Fixed time slot ID to use for appointment booking.
 * Should be pre-seeded and have sufficient capacity.
 */
export const DEFAULT_TIME_SLOT_ID = __ENV.DEFAULT_TIME_SLOT_ID || 'slot-001';

/**
 * Customer name template for appointments.
 */
export const CUSTOMER_NAME_TEMPLATE = __ENV.CUSTOMER_NAME_TEMPLATE || 'Performance Test Customer';

// ─────────────────────────────────────────────────────
// Load Profile Configuration
// ─────────────────────────────────────────────────────

/**
 * Ramp-up duration: time to go from 0 to target VUs.
 * Default: 30s
 */
export const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || '30s';

/**
 * Target VUs for ramp-up phase.
 * Default: 50
 */
export const RAMP_UP_VUS = parseInt(__ENV.RAMP_UP_VUS || '50', 10);

/**
 * Sustain (plateau) duration at peak load.
 * Default: 1m
 */
export const SUSTAIN_DURATION = __ENV.SUSTAIN_DURATION || '1m';

/**
 * Peak VUs during sustain phase.
 * Default: 100
 */
export const PEAK_VUS = parseInt(__ENV.PEAK_VUS || '100', 10);

/**
 * Ramp-down duration: time to go from peak VUs to 0.
 * Default: 30s
 */
export const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || '30s';

// ─────────────────────────────────────────────────────
// Performance Thresholds
 * Per 接口设计规范文档 Section 10.2:
 *   - 普通接口响应时间: < 500ms
 *   - 系统可用性: > 99.9%
 *   - 并发处理能力: > 1000 requests/minute
 * ─────────────────────────────────────────────────────

/**
 * P95 response time threshold in milliseconds.
 * Per spec: 普通接口响应时间 < 500ms
 */
export const P95_THRESHOLD_MS = parseInt(__ENV.P95_THRESHOLD_MS || '500', 10);

/**
 * P99 response time threshold in milliseconds.
 * Stricter bound for tail latency monitoring.
 */
export const P99_THRESHOLD_MS = parseInt(__ENV.P99_THRESHOLD_MS || '1000', 10);

/**
 * Minimum success rate percentage.
 * Per spec: 可用性 > 99.9%, but we use 95% as load test threshold.
 */
export const MIN_SUCCESS_RATE = parseFloat(__ENV.MIN_SUCCESS_RATE || '95');

/**
 * Maximum error rate percentage.
 */
export const MAX_ERROR_RATE = parseFloat(__ENV.MAX_ERROR_RATE || '5');

/**
 * Minimum requests per minute (throughput).
 * Per spec: 并发处理能力 > 1000 requests/minute
 */
export const MIN_REQ_PER_MINUTE = parseInt(__ENV.MIN_REQ_PER_MINUTE || '1000', 10);

// ─────────────────────────────────────────────────────
// HTTP Configuration
// ─────────────────────────────────────────────────────

/**
 * Request timeout in milliseconds.
 */
export const HTTP_TIMEOUT = __ENV.HTTP_TIMEOUT || '10000';

/**
 * Whether to include response bodies in check results (for debugging).
 * Set to 'true' in development, 'false' in CI.
 */
export const DEBUG_RESPONSES = (__ENV.DEBUG_RESPONSES || 'false').toLowerCase() === 'true';

// ─────────────────────────────────────────────────────
// Export consolidated config object
// ─────────────────────────────────────────────────────

export const config = {
  // Server
  BASE_URL,
  API_PREFIX,

  // Auth
  TEST_EMAIL_DOMAIN,
  TEST_USER_PASSWORD,
  TEST_USER_NAME_PREFIX,

  // Test Data
  DEFAULT_SERVICE_ID,
  DEFAULT_TIME_SLOT_ID,
  CUSTOMER_NAME_TEMPLATE,

  // Load Profile
  RAMP_UP_DURATION,
  RAMP_UP_VUS,
  SUSTAIN_DURATION,
  PEAK_VUS,
  RAMP_DOWN_DURATION,

  // Thresholds
  P95_THRESHOLD_MS,
  P99_THRESHOLD_MS,
  MIN_SUCCESS_RATE,
  MAX_ERROR_RATE,
  MIN_REQ_PER_MINUTE,

  // HTTP
  HTTP_TIMEOUT,
  DEBUG_RESPONSES,

  // Computed URLs
  get AUTH_REGISTER_URL() {
    return `${this.BASE_URL}${this.API_PREFIX}/auth/register`;
  },
  get AUTH_LOGIN_URL() {
    return `${this.BASE_URL}${this.API_PREFIX}/auth/login`;
  },
  get APPOINTMENTS_CREATE_URL() {
    return `${this.BASE_URL}${this.API_PREFIX}/appointments`;
  },
  get TIME_SLOTS_URL() {
    return `${this.BASE_URL}${this.API_PREFIX}/time-slots`;
  },
};
