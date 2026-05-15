// =============================================================================
// jest.config.real.js — CI mode with Testcontainers (no fakes)
// =============================================================================
// Use this config in CI/CD or when you want to run tests against real
// PostgreSQL + Redis containers. This config:
//   1. Uses Testcontainers global setup
//   2. Enables container pool with schema-per-worker isolation
//   3. Does NOT allow fake infrastructure fallback
//
// Use: jest --config jest.config.real.js
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
  coverageDirectory: './coverage-real',
  // Coverage thresholds (Test Architecture v2.0 — per-module matrix)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
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
  // Testcontainers global setup/teardown with ContainerPool
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup/test-env.ts'],
  // Longer timeout for container startup
  testTimeout: 60000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
