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
    // ── GLOBAL THRESHOLD (minimum baseline) ─────────────────────────
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // ── P0 CRITICAL: Core booking + auth features (95/90/95/95) ────
    './src/app/features/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // ── Shared components (85/80) ──────────────────────────────────
    './src/app/shared/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // ── State management / stores (95/90) ──────────────────────────
    './src/app/stores/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // ── Core services (90/85) ──────────────────────────────────────
    './src/app/core/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
