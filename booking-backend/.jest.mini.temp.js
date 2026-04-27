module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'roles\.guard\.spec\.ts$',
  transform: { '^.+\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
  testTimeout: 5000,
  forceExit: true,
  clearMocks: true,
  verbose: true,
};