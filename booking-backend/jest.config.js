// =============================================================================
// jest.config.js — Coverage Threshold Matrix v2.0
// =============================================================================
// Enforces per-module coverage thresholds as defined in contract.yaml
// x-coverage-matrix. Uses Jest glob pattern matching for granular control.
//
// These thresholds are ENFORCED (test fails if not met).
// =============================================================================

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
  ],
  coverageDirectory: './coverage',
  // Coverage thresholds (Test Architecture v2.0 — per-module matrix)
  coverageThreshold: {
    // ── GLOBAL THRESHOLD (minimum baseline) ─────────────────────────
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },

    // ── P0 CRITICAL: Core booking + auth (95/90/95/95) ─────────────
    './src/modules/appointments/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/modules/auth/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/modules/time-slots/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/modules/users/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },

    // ── P1 IMPORTANT: Supporting services (85/80/85/85) ────────────
    './src/modules/notifications/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/modules/cache/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/modules/rate-limiter/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/modules/email/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/modules/verification/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/modules/translations/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },

    // ── P2 UTILITY: Auxiliary modules (75/70/75/75) ────────────────
    './src/modules/health/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/modules/stats/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/modules/services/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/modules/retention/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/modules/encryption/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/common/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
  // Testcontainers global setup/teardown
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup/test-env.ts'],
  // Increase timeout for container startup
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
