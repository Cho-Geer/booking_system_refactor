module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/modules/appointments/**/*.ts',
  ],
  coverageDirectory: './coverage-unit',
  coverageThreshold: {
    'src/modules/appointments/appointments.service.ts': {
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
  // Skip global setup/teardown for unit tests
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: false,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Mock the test-env imports
  setupFiles: ['<rootDir>/test/setup-mock.ts'],
};
