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
