import { SchemaManager } from './schema-manager';

describe('SchemaManager', () => {
  describe('generateSchemaName', () => {
    it('should generate a schema name with default format', () => {
      const name = SchemaManager.generateSchemaName();
      expect(name).toMatch(/^w\d+_f[0-9a-f]+$/);
    });

    it('should use provided workerId', () => {
      const name = SchemaManager.generateSchemaName({ workerId: '42' });
      expect(name).toMatch(/^w42_f[0-9a-f]+$/);
    });

    it('should generate unique names for different contexts', () => {
      const name1 = SchemaManager.generateSchemaName({
        filePath: 'test-a.spec.ts',
      });
      const name2 = SchemaManager.generateSchemaName({
        filePath: 'test-b.spec.ts',
      });
      expect(name1).not.toBe(name2);
    });
  });

  describe('createTestSchema', () => {
    it('should fail gracefully when no database URL is provided', async () => {
      await expect(SchemaManager.createTestSchema('test_schema', '')).rejects.toThrow();
    });
  });

  describe('dropTestSchema', () => {
    it('should fail gracefully when no database URL is provided', async () => {
      await expect(SchemaManager.dropTestSchema('test_schema', '')).rejects.toThrow();
    });
  });

  describe('migrateSchema', () => {
    it('should fail gracefully when no database URL is provided', async () => {
      await expect(SchemaManager.migrateSchema('test_schema', '')).rejects.toThrow();
    });
  });
});
