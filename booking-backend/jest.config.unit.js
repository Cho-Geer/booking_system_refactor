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
  // Coverage thresholds (see AGENTS.md "覆盖率阈值" table)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
  },
  // NO globalSetup/globalTeardown - bypass Testcontainers completely
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: false,
};
