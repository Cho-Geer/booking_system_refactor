module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'booking-mock-audit'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', 'coverage/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // booking-mock-audit: architecture & quality rules
    'booking-mock-audit/no-tier1-mock': 'error',
    'booking-mock-audit/no-skipped-tests': 'error',
    'booking-mock-audit/no-skipped-audit': 'error',
    'booking-mock-audit/no-console-log': 'error',
    'booking-mock-audit/tier3-verify': 'warn',
    'booking-mock-audit/no-uncovered-switch': 'warn',
  },
  overrides: [
    {
      // Relax rules for test files
      files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
        // Architecture rules still apply in tests
        'booking-mock-audit/no-tier1-mock': 'error',
        'booking-mock-audit/no-skipped-tests': 'error',
        'booking-mock-audit/no-skipped-audit': 'error',
        'booking-mock-audit/tier3-verify': 'warn',
        'booking-mock-audit/no-console-log': 'off',
      },
    },
    {
      // Fakes self-tests are exempt from mock restrictions (they test the fakes themselves)
      files: ['test/fakes/**/*.ts'],
      rules: {
        'mock-audit': 'off',
      },
    },
  ],
};
