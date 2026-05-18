import { checkDockerAvailable, resetDockerCache } from './docker-checker';

describe('checkDockerAvailable', () => {
  beforeEach(() => {
    // Reset the cache before each test
    resetDockerCache();
    delete process.env.CI;
  });

  it('should return a boolean', () => {
    const result = checkDockerAvailable();
    expect(typeof result).toBe('boolean');
  });

  it('should cache the result (same reference on second call)', () => {
    const first = checkDockerAvailable();
    const second = checkDockerAvailable();
    expect(first).toBe(second);
  });

  it('should not throw when Docker is unavailable', () => {
    // This should always work — the function gracefully degrades to false
    expect(() => checkDockerAvailable()).not.toThrow();
  });

  describe('in CI environment', () => {
    beforeEach(() => {
      process.env.CI = 'true';
      resetDockerCache();
    });

    it('should not throw if executed (graceful handling)', () => {
      // The CI check calls execSync('docker info') which might fail or pass
      // but the function should handle either case without throwing
      expect(() => checkDockerAvailable()).not.toThrow();
    });
  });
});
