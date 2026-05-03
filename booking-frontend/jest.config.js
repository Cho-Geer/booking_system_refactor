const { createCjsPreset } = require('jest-preset-angular/presets');

const preset = createCjsPreset({
  tsconfig: '<rootDir>/tsconfig.spec.json',
});

module.exports = {
  ...preset,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!@angular|@ngrx|@angular/cdk|primeng|@primeng|@primeuix|uuid|@testing-library)'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/app/features/**/*.ts',
    'src/app/shared/**/*.ts',
    'src/app/stores/**/*.ts',
    'src/app/core/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
    '!src/environments/*',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
