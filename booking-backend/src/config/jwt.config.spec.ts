import * as fs from 'fs';
import { loadJwtSecret, loadJwtRefreshSecret } from './jwt.config';

jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('jwt.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockedFs.existsSync.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('loadJwtSecret', () => {
    it('should load secret from environment variable when Docker Secret file does not exist', () => {
      process.env.JWT_SECRET = 'test-jwt-secret';

      expect(loadJwtSecret()).toBe('test-jwt-secret');
    });

    it('should load secret from Docker Secrets file when it exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('docker-secret-value\n' as any);

      expect(loadJwtSecret()).toBe('docker-secret-value');
    });

    it('should prefer Docker Secrets file over environment variable', () => {
      process.env.JWT_SECRET = 'env-secret';
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('docker-secret-value' as any);

      expect(loadJwtSecret()).toBe('docker-secret-value');
    });

    it('should throw when neither Docker Secret file nor environment variable is available', () => {
      delete process.env.JWT_SECRET;

      expect(() => loadJwtSecret()).toThrow('JWT_SECRET is not configured');
    });
  });

  describe('loadJwtRefreshSecret', () => {
    it('should load refresh secret from environment variable', () => {
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      expect(loadJwtRefreshSecret()).toBe('test-refresh-secret');
    });

    it('should throw when refresh secret is not configured', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => loadJwtRefreshSecret()).toThrow('JWT_REFRESH_SECRET is not configured');
    });
  });
});
