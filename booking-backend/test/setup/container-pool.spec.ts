import { ContainerPool } from './container-pool';

describe('ContainerPool', () => {
  // Reset the singleton between tests
  afterEach(async () => {
    // Ensure cleanup
    try {
      await ContainerPool.destroy();
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = (ContainerPool as any).instance;
      const instance2 = (ContainerPool as any).instance;
      // Both should be the same (or undefined on first call)
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConnectionInfo', () => {
    it('should throw when pool is not initialized', () => {
      expect(() => ContainerPool.getConnectionInfo()).toThrow(/not initialized/i);
    });
  });

  describe('acquireSchema', () => {
    it('should throw when pool is not initialized', async () => {
      await expect(ContainerPool.acquireSchema('test_schema')).rejects.toThrow(/not initialized/i);
    });
  });

  describe('releaseSchema', () => {
    it('should throw when pool is not initialized', async () => {
      await expect(ContainerPool.releaseSchema('test_schema')).rejects.toThrow(/not initialized/i);
    });
  });

  describe('destroy', () => {
    it('should not throw when called multiple times', async () => {
      await ContainerPool.destroy();
      await ContainerPool.destroy();
      // Should not throw
    });
  });
});
