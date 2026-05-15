// =============================================================================
// jest.config.unit.js — Fast unit tests (Fake mode, no Testcontainers)
// =============================================================================
// Same coverage thresholds as jest.config.js but optimized for fast local
// TDD RED/GREEN cycles. No globalSetup/globalTeardown (bypasses Testcontainers).
//
// Use: npm run test (or jest --config jest.config.unit.js)
// =============================================================================

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'test/',
    'integration',
    'redis\\.spec',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!modules/email/**/*.ts',
    '!modules/notifications/**/*.ts',
    '!modules/cache/**/*.ts',
    '!modules/rate-limiter/**/*.ts',
    '!test/**/*',
  ],
  coverageDirectory: '../coverage-unit',
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
    './modules/appointments/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './modules/auth/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './modules/time-slots/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './modules/users/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },

    // ── P1 IMPORTANT: Supporting services (85/80/85/85) ────────────
    './modules/notifications/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './modules/cache/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './modules/rate-limiter/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './modules/email/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './modules/verification/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './modules/translations/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },

    // ── P2 UTILITY: Auxiliary modules (75/70/75/75) ────────────────
    './modules/health/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './modules/stats/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './modules/services/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './modules/retention/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './modules/encryption/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './common/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
  },
  // NO globalSetup/globalTeardown — bypass Testcontainers completely
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: false,
};
