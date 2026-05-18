import { selectInfrastructure, resetDockerCache } from './test-infra-selector';

describe('selectInfrastructure', () => {
  beforeEach(() => {
    resetDockerCache();
    delete process.env.CI;
  });

  it('should return an array of providers', () => {
    const providers = selectInfrastructure();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should include providers for infrastructure', () => {
    const providers = selectInfrastructure();
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should accept fakeOverrides option', () => {
    const providers = selectInfrastructure({
      fakeOverrides: { jwtService: class MockJwt {} },
    });
    // Should not throw — overrides are optional
    expect(providers).toBeDefined();
  });
});
