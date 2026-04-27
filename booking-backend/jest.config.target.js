module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '(auth\\.service|global-exception|jwt-auth\\.guard|roles\\.guard|permissions\\.guard)\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'redis'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'modules/auth/auth.service.ts',
    'common/filters/global-exception.filter.ts',
    'common/guards/jwt-auth.guard.ts',
    'common/guards/roles.guard.ts',
    'common/guards/permissions.guard.ts',
  ],
  coverageDirectory: '../coverage-target',
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
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
