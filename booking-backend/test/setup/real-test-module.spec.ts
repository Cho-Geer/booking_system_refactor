import { RealTestModule } from './real-test-module';

describe('RealTestModule', () => {
  describe('forUnit', () => {
    it('should create a TestingModule builder with fake infrastructure', async () => {
      const builder = await RealTestModule.forUnit({
        providers: [],
      });
      expect(builder).toBeDefined();
      expect(typeof builder.compile).toBe('function');
    });

    it('should accept controllers, providers, and imports', async () => {
      const builder = await RealTestModule.forUnit({
        controllers: [],
        providers: [],
        imports: [],
      });
      expect(builder).toBeDefined();
    });
  });

  describe('forFeature', () => {
    it('should auto-detect infrastructure and return a builder', async () => {
      const builder = await RealTestModule.forFeature({
        providers: [],
      });
      expect(builder).toBeDefined();
      expect(typeof builder.compile).toBe('function');
    });

    it('should accept TestModuleOptions', async () => {
      const builder = await RealTestModule.forFeature(
        { providers: [] },
        { timeout: 5000, schema: 'test_schema' },
      );
      expect(builder).toBeDefined();
    });
  });

  describe('forIntegration', () => {
    it('should create a TestingModule builder (may fallback to fake if no Docker)', async () => {
      // This should not throw even if Docker is unavailable
      const builder = await RealTestModule.forIntegration({
        providers: [],
      });
      expect(builder).toBeDefined();
    });
  });
});
