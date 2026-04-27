/**
 * k6 Performance Load Test: Appointment Creation
 *
 * Tests the POST /api/v1/appointments endpoint under realistic load conditions.
 *
 * Load Profile:
 *   Ramp up:    0 → 50 VUs over 30s
 *   Sustain:    100 VUs for 1 minute
 *   Ramp down:  100 → 0 VUs over 30s
 *
 * Performance Thresholds (per 接口设计规范文档 Section 10.2):
 *   - P95 response time < 500ms
 *   - Success rate > 95%
 *   - Error rate < 5%
 *
 * Test Flow per VU:
 *   1. Register a new unique user (POST /api/v1/auth/register)
 *   2. Login to obtain JWT token (POST /api/v1/auth/login)
 *   3. Create an appointment (POST /api/v1/appointments)
 *
 * Usage:
 *   k6 run test/performance/booking-create-load-test.js
 *   k6 run --env BASE_URL=http://staging.example.com test/performance/booking-create-load-test.js
 *   k6 run --out json=results.json test/performance/booking-create-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─────────────────────────────────────────────────────
// Import Configuration
// ─────────────────────────────────────────────────────

import {
  config,
  RAMP_UP_DURATION,
  RAMP_UP_VUS,
  SUSTAIN_DURATION,
  PEAK_VUS,
  RAMP_DOWN_DURATION,
  P95_THRESHOLD_MS,
  P99_THRESHOLD_MS,
  MIN_SUCCESS_RATE,
  MAX_ERROR_RATE,
  TEST_EMAIL_DOMAIN,
  TEST_USER_PASSWORD,
  TEST_USER_NAME_PREFIX,
  DEFAULT_SERVICE_ID,
  DEFAULT_TIME_SLOT_ID,
  CUSTOMER_NAME_TEMPLATE,
  HTTP_TIMEOUT,
} from './config.js';

// ─────────────────────────────────────────────────────
// Custom Metrics
// ─────────────────────────────────────────────────────

/**
 * Tracks the rate of failed appointment creations (4xx/5xx responses).
 */
export const appointmentFailureRate = new Rate('appointment_failures');

/**
 * Tracks authentication flow latency (register + login combined).
 */
export const authFlowDuration = new Trend('auth_flow_duration');

/**
 * Tracks appointment creation latency specifically.
 */
export const appointmentCreationDuration = new Trend('appointment_creation_duration');

/**
 * Tracks total end-to-end flow duration per VU iteration.
 */
export const totalFlowDuration = new Trend('total_flow_duration');

// ─────────────────────────────────────────────────────
// k6 Options
// ─────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: RAMP_UP_DURATION, target: RAMP_UP_VUS },
    { duration: SUSTAIN_DURATION, target: PEAK_VUS },
    { duration: RAMP_DOWN_DURATION, target: 0 },
  ],

  thresholds: {
    // Global HTTP thresholds
    http_req_duration: [
      `p(95)<${P95_THRESHOLD_MS}`,
      `p(99)<${P99_THRESHOLD_MS}`,
    ],
    http_req_failed: [
      `rate<${MAX_ERROR_RATE / 100}`,
    ],

    // Appointment-specific thresholds
    appointment_failures: [
      `rate<${MAX_ERROR_RATE / 100}`,
    ],

    // Custom metric thresholds
    auth_flow_duration: [
      `p(95)<${P95_THRESHOLD_MS}`,
    ],
    appointment_creation_duration: [
      `p(95)<${P95_THRESHOLD_MS}`,
    ],
  },

  // HTTP settings
  httpOpts: {
    timeout: HTTP_TIMEOUT,
  },

  // Summary output
  summaryTrendStats: [
    'avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count',
  ],
};

// ─────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────

/**
 * Generate a unique email for this VU to avoid conflicts.
 * Each VU creates its own user account.
 *
 * @param {number} vuId - Virtual user ID from __VU
 * @param {number} iter - Iteration number from __ITER
 * @returns {string} Unique email address
 */
function generateUniqueEmail(vuId, iter) {
  const timestamp = Date.now();
  return `k6-perf-${vuId}-${iter}-${timestamp}@${TEST_EMAIL_DOMAIN}`;
}

/**
 * Generate a unique user name for this VU.
 *
 * @param {number} vuId - Virtual user ID
 * @returns {string} User name
 */
function generateUserName(vuId) {
  return `${TEST_USER_NAME_PREFIX} #${vuId}`;
}

/**
 * Register a new user account.
 *
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} password - User password
 * @returns {object} HTTP response
 */
function registerUser(email, name, password) {
  const payload = JSON.stringify({
    name: name,
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: HTTP_TIMEOUT,
  };

  return http.post(config.AUTH_REGISTER_URL, payload, params);
}

/**
 * Login with credentials and extract JWT token.
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} HTTP response
 */
function loginUser(email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: HTTP_TIMEOUT,
  };

  return http.post(config.AUTH_LOGIN_URL, payload, params);
}

/**
 * Create an appointment using the provided JWT token.
 *
 * @param {string} token - JWT access token
 * @param {string} userId - User ID (extracted from login response)
 * @param {number} vuId - Virtual user ID (for unique customer data)
 * @param {number} iter - Iteration number (for unique customer data)
 * @returns {object} HTTP response
 */
function createAppointment(token, userId, vuId, iter) {
  const payload = JSON.stringify({
    userId: userId,
    timeSlotId: DEFAULT_TIME_SLOT_ID,
    serviceId: DEFAULT_SERVICE_ID,
    customerName: `${CUSTOMER_NAME_TEMPLATE} [VU:${vuId}, ITER:${iter}]`,
    customerEmail: `customer-${vuId}-${iter}@${TEST_EMAIL_DOMAIN}`,
    customerPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    notes: `k6 load test appointment - VU ${vuId}, iteration ${iter}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    timeout: HTTP_TIMEOUT,
    tags: { name: 'createAppointment' },
  };

  return http.post(config.APPOINTMENTS_CREATE_URL, payload, params);
}

// ─────────────────────────────────────────────────────
// Default Test Function (executed per VU iteration)
// ─────────────────────────────────────────────────────

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Generate unique credentials for this VU/iteration
  const email = generateUniqueEmail(vuId, iter);
  const name = generateUserName(vuId);
  const password = TEST_USER_PASSWORD;

  let accessToken = null;
  let userId = null;

  // ─── Group 1: Authentication Flow ───
  group('Authentication', function () {

    // Step 1: Register new user
    group('Register', function () {
      const registerRes = registerUser(email, name, password);

      const registerChecks = {
        'register: status is 201': (r) => r.status === 201,
        'register: response has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body && body.data;
          } catch (e) {
            return false;
          }
        },
      };

      const registerCheckResult = check(registerRes, registerChecks);

      if (registerRes.status === 201) {
        try {
          const body = JSON.parse(registerRes.body);
          // Store userId if available in response
          if (body && body.data && body.data.id) {
            userId = body.data.id;
          }
        } catch (e) {
          // userId extraction failed, will use fallback
        }
      }

      // Rate-limit friendly pause after registration
      sleep(0.5);
    });

    // Step 2: Login to obtain JWT
    group('Login', function () {
      const loginRes = loginUser(email, password);

      const loginChecks = {
        'login: status is 200': (r) => r.status === 200,
        'login: response has access_token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body && body.data && body.data.accessToken;
          } catch (e) {
            return false;
          }
        },
      };

      const loginCheckResult = check(loginRes, loginChecks);

      if (loginRes.status === 200) {
        try {
          const body = JSON.parse(loginRes.body);
          if (body && body.data) {
            accessToken = body.data.accessToken;
            // Extract userId from login response if not already set
            if (!userId && body.data.user && body.data.user.id) {
              userId = body.data.user.id;
            }
          }
        } catch (e) {
          // Token extraction failed
        }
      }
    });
  });

  // Record auth flow duration
  // (k6 automatically tracks via http_req_duration, but we track separately)

  // ─── Group 2: Appointment Creation ───
  group('Create Appointment', function () {
    if (!accessToken) {
      // Skip appointment creation if auth failed
      console.log(`[VU ${vuId}] Skipping appointment creation: no access token`);
      appointmentFailureRate.add(1);
      return;
    }

    // Use a fallback userId if not extracted from auth responses
    const effectiveUserId = userId || `k6-fallback-user-${vuId}`;

    const appointmentRes = createAppointment(accessToken, effectiveUserId, vuId, iter);

    const appointmentChecks = {
      'appointment: status is 201': (r) => r.status === 201,
      'appointment: response has id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body && body.data && body.data.id;
        } catch (e) {
          return false;
        }
      },
      'appointment: response time < 500ms': (r) => r.timings.duration < 500,
    };

    const appointmentCheckResult = check(appointmentRes, appointmentChecks);

    // Track custom metrics
    appointmentFailureRate.add(!appointmentCheckResult);
    appointmentCreationDuration.add(appointmentRes.timings.duration);

    // Handle expected conflicts (409) gracefully - slot may be taken
    if (appointmentRes.status === 409) {
      console.log(`[VU ${vuId}] Appointment conflict (409): time slot already booked`);
    }

    // Log unexpected errors
    if (appointmentRes.status >= 500) {
      console.log(`[VU ${vuId}] Server error (${appointmentRes.status}): ${appointmentRes.body}`);
    }
  });

  // Record total flow duration (k6 tracks this per-iteration automatically)
}

// ─────────────────────────────────────────────────────
// Handle Summary Output
// ─────────────────────────────────────────────────────

/**
 * Custom summary handler for post-test reporting.
 * Called once after all VUs complete.
 *
 * @param {object} data - k6 summary data
 */
export function handleSummary(data) {
  const thresholds = data.metrics;

  // Build a simple text report
  const reportLines = [
    '========================================',
    '  k6 Performance Test Report',
    '  Booking System - Appointment Creation',
    '========================================',
    '',
    `Test Duration: ${data.state.testRunDurationMs / 1000}s`,
    `Total Iterations: ${data.metrics.iterations ? data.metrics.iterations.values.count : 'N/A'}`,
    '',
    '--- Response Time (Appointment Creation) ---',
  ];

  if (thresholds.appointment_creation_duration) {
    const vals = thresholds.appointment_creation_duration.values;
    reportLines.push(`  Avg:  ${vals.avg ? vals.avg.toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  Min:  ${vals.min ? vals.min.toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  Med:  ${vals.med ? vals.med.toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  Max:  ${vals.max ? vals.max.toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  P90:  ${vals['p(90)'] ? vals['p(90)'].toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  P95:  ${vals['p(95)'] ? vals['p(95)'].toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  P99:  ${vals['p(99)'] ? vals['p(99)'].toFixed(0) + 'ms' : 'N/A'}`);
  }

  reportLines.push('');
  reportLines.push('--- HTTP Overview ---');

  if (thresholds.http_req_duration) {
    const vals = thresholds.http_req_duration.values;
    reportLines.push(`  Avg Response Time: ${vals.avg ? vals.avg.toFixed(0) + 'ms' : 'N/A'}`);
    reportLines.push(`  P95 Response Time: ${vals['p(95)'] ? vals['p(95)'].toFixed(0) + 'ms' : 'N/A'}`);
  }

  if (thresholds.http_req_failed) {
    const rate = thresholds.http_req_failed.values.rate;
    reportLines.push(`  Error Rate: ${rate ? (rate * 100).toFixed(2) + '%' : 'N/A'}`);
  }

  reportLines.push('');
  reportLines.push('--- Threshold Results ---');

  // Report threshold pass/fail
  for (const [key, value] of Object.entries(thresholds)) {
    if (value.thresholds) {
      for (const [tKey, tVal] of Object.entries(value.thresholds)) {
        const status = tVal.ok ? 'PASS' : 'FAIL';
        reportLines.push(`  [${status}] ${key}: ${tKey}`);
      }
    }
  }

  reportLines.push('');
  reportLines.push('========================================');

  const textReport = reportLines.join('\n');

  return {
    stdout: textReport,
    'test/performance/results-report.txt': textReport,
  };
}
