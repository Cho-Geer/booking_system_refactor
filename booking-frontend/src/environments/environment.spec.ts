import { environment } from './environment';

describe('Environment configuration', () => {
  describe('apiUrl', () => {
    it('should use relative proxy path', () => {
      expect(environment.apiUrl).toBe('/api');
    });

    it('should not be an absolute URL', () => {
      expect(environment.apiUrl).not.toMatch(/^https?:\/\//);
    });
  });

  describe('socketUrl', () => {
    it('should be empty string for proxy-based connection', () => {
      // Empty string makes Socket.IO connect via current origin through proxy.
      // The proxy forwards /socket.io to the backend which shares the same HTTP server.
      expect(environment.socketUrl).toBe('');
    });

    it('should not be a hardcoded host:port', () => {
      // Hardcoded socketUrl breaks multi-instance because each instance
      // has a different backend port. Empty string = use proxy = always correct.
      expect(environment.socketUrl).not.toMatch(/^https?:\/\//);
      expect(environment.socketUrl).not.toContain('localhost');
    });
  });

  describe('production', () => {
    it('should be false for development environment', () => {
      expect(environment.production).toBe(false);
    });
  });

  describe('complete shape', () => {
    it('should have all required properties', () => {
      expect(environment).toHaveProperty('apiUrl');
      expect(environment).toHaveProperty('socketUrl');
      expect(environment).toHaveProperty('production');
    });

    it('should not have extra unknown properties', () => {
      const allowedKeys = ['apiUrl', 'socketUrl', 'production'];
      expect(Object.keys(environment).sort()).toEqual(allowedKeys.sort());
    });
  });
});
