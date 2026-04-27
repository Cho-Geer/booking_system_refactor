module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathPatterns: ['email'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'modules/email/**/*.ts',
  ],
  coverageDirectory: '../coverage-email',
  coverageThreshold: {
    'modules/email/email.service.ts': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'modules/email/email.worker.ts': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
  },
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: false,
};
