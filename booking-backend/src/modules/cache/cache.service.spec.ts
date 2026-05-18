import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, REDIS_CONFIG_TOKEN } from './cache.service';
import { RedisConfig } from '../../config/redis.config';

// Create mock Redis client factory
function createMockRedisClient() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      incr: jest.fn().mockReturnThis(),
      decr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exists: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    eval: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  };
}

// Mock ioredis module
jest.mock('ioredis', () => {
  const mockClient = createMockRedisClient();
  const MockRedis = jest.fn(() => mockClient);
  // Export both default and named
  Object.assign(MockRedis, { default: MockRedis });
  (MockRedis as any).mockClient = mockClient;
  return MockRedis;
});

// Get the mock client for test assertions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockRedisModule = jest.requireMock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: ReturnType<typeof createMockRedisClient>;

  const mockConfig: RedisConfig = {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
    keyPrefix: 'booking:',
    ttlDefault: 3600,
    ttlSession: 604800,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock client
    const freshMock = createMockRedisClient();
    MockRedisModule.mockImplementation(() => freshMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: REDIS_CONFIG_TOKEN,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    mockRedis = service.getClient() as unknown as ReturnType<typeof createMockRedisClient>;
    // Force connected state for testing
    (service as any).isConnected = true;
  });

  afterEach(async () => {
    jest.useRealTimers();
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('prefixedKey', () => {
    it('should prefix keys with the configured prefix', () => {
      const result = (service as any).prefixedKey('test-key');
      expect(result).toBe('booking:test-key');
    });

    it('should handle empty key', () => {
      const result = (service as any).prefixedKey('');
      expect(result).toBe('booking:');
    });
  });

  describe('jitterTtl', () => {
    it('should apply jitter within 10% range', () => {
      const ttl = 1000;
      for (let i = 0; i < 20; i++) {
        const result = (service as any).jitterTtl(ttl);
        expect(result).toBeGreaterThanOrEqual(900);
        expect(result).toBeLessThanOrEqual(1100);
      }
    });

    it('should return integer values', () => {
      for (let i = 0; i < 10; i++) {
        const result = (service as any).jitterTtl(100);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('get', () => {
    it('should return parsed JSON value when key exists', async () => {
      const testData = { userId: '123', name: 'Test User' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get('user:123:profile');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('booking:user:123:profile');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      const result = await service.get('test');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should return null on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test');

      expect(result).toBeNull();
    });

    it('should return null when redis client is null', async () => {
      (service as any).redis = null;

      const result = await service.get('test');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      mockRedis.get.mockResolvedValue('not-valid-json');

      const result = await service.get('test');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with jittered TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test:key', { data: 'value' }, 3600);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'booking:test:key',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
      const setCall = mockRedis.set.mock.calls[0];
      expect(JSON.parse(setCall[1])).toEqual({ data: 'value' });
    });

    it('should use default TTL when not provided', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test:key', 'value');

      const setCall = mockRedis.set.mock.calls[0];
      const ttl = setCall[3];
      expect(ttl).toBeGreaterThanOrEqual(3240);
      expect(ttl).toBeLessThanOrEqual(3960);
    });

    it('should skip when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      await service.set('test:key', 'value');

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should skip when redis client is null', async () => {
      (service as any).redis = null;

      await service.set('test:key', 'value');

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should handle set errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('SET failed'));

      await expect(service.set('test:key', 'value')).resolves.not.toThrow();
    });

    it('should serialize primitive values correctly', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test:number', 42, 60);

      const setCall = mockRedis.set.mock.calls[0];
      expect(JSON.parse(setCall[1])).toBe(42);
    });

    it('should serialize arrays correctly', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test:array', [1, 2, 3], 60);

      const setCall = mockRedis.set.mock.calls[0];
      expect(JSON.parse(setCall[1])).toEqual([1, 2, 3]);
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.delete('test:key');

      expect(mockRedis.del).toHaveBeenCalledWith('booking:test:key');
    });

    it('should skip when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      await service.delete('test:key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should skip when redis client is null', async () => {
      (service as any).redis = null;

      await service.delete('test:key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('DEL failed'));

      await expect(service.delete('test:key')).resolves.not.toThrow();
    });
  });

  describe('has', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.has('test:key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('booking:test:key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.has('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      const result = await service.has('test');

      expect(result).toBe(false);
    });

    it('should return false when redis client is null', async () => {
      (service as any).redis = null;

      const result = await service.has('test');

      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('EXISTS failed'));

      const result = await service.has('test');

      expect(result).toBe(false);
    });
  });

  describe('decrement', () => {
    it('should atomically decrement and return new value', async () => {
      mockRedis.eval.mockResolvedValue(4);

      const result = await service.decrement('slot:123:remaining', 0);

      expect(result).toBe(4);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        'booking:slot:123:remaining',
        '0',
        '0',
      );
    });

    it('should not go below minimum', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const result = await service.decrement('slot:123:remaining', 0);

      expect(result).toBe(0);
    });

    it('should return min when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      const result = await service.decrement('slot:123:remaining', 0);

      expect(result).toBe(0);
    });

    it('should return min when redis client is null', async () => {
      (service as any).redis = null;

      const result = await service.decrement('slot:123:remaining', 5);

      expect(result).toBe(5);
    });

    it('should return min on eval error', async () => {
      mockRedis.eval.mockRejectedValue(new Error('EVAL failed'));

      const result = await service.decrement('slot:123:remaining', 3);

      expect(result).toBe(3);
    });
  });

  describe('increment', () => {
    it('should atomically increment and return new value', async () => {
      mockRedis.incr.mockResolvedValue(5);

      const result = await service.increment('counter:test');

      expect(result).toBe(5);
      expect(mockRedis.incr).toHaveBeenCalledWith('booking:counter:test');
    });

    it('should return 0 when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      const result = await service.increment('counter:test');

      expect(result).toBe(0);
    });

    it('should return 0 when redis client is null', async () => {
      (service as any).redis = null;

      const result = await service.increment('counter:test');

      expect(result).toBe(0);
    });

    it('should return 0 on incr error', async () => {
      mockRedis.incr.mockRejectedValue(new Error('INCR failed'));

      const result = await service.increment('counter:test');

      expect(result).toBe(0);
    });
  });

  describe('acquireLock', () => {
    it('should acquire lock with SET NX EX', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.acquireLock('lock:booking:123', 10);

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith('booking:lock:booking:123', '1', 'EX', 10, 'NX');
    });

    it('should return false when lock is already held', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.acquireLock('lock:booking:123', 10);

      expect(result).toBe(false);
    });

    it('should return false when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      const result = await service.acquireLock('lock:booking:123', 10);

      expect(result).toBe(false);
    });

    it('should return false when redis client is null', async () => {
      (service as any).redis = null;

      const result = await service.acquireLock('lock:booking:123', 10);

      expect(result).toBe(false);
    });

    it('should return false on lock error', async () => {
      mockRedis.set.mockRejectedValue(new Error('LOCK failed'));

      const result = await service.acquireLock('lock:booking:123', 10);

      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release lock by deleting the key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.releaseLock('lock:booking:123');

      expect(mockRedis.del).toHaveBeenCalledWith('booking:lock:booking:123');
    });

    it('should skip when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      await service.releaseLock('lock:booking:123');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should skip when redis client is null', async () => {
      (service as any).redis = null;

      await service.releaseLock('lock:booking:123');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle release errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('UNLOCK failed'));

      await expect(service.releaseLock('lock:booking:123')).resolves.not.toThrow();
    });
  });

  describe('cacheWithProtection', () => {
    it('should return cached value when available', async () => {
      const cachedData = { id: '1', name: 'Cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const fetchFn = jest.fn().mockResolvedValue({ id: '2', name: 'Fresh' });
      const result = await service.cacheWithProtection('test:key', 3600, fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should call fetchFn and cache result when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const freshData = { id: '1', name: 'Fresh' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);

      const result = await service.cacheWithProtection('test:key', 3600, fetchFn);

      expect(result).toEqual(freshData);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should cache null values with 60s TTL for penetration protection', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const fetchFn = jest.fn().mockResolvedValue(null);

      const result = await service.cacheWithProtection('test:key', 3600, fetchFn);

      expect(result).toBeNull();
      const setCall = mockRedis.set.mock.calls[0];
      const ttl = setCall[3];
      expect(ttl).toBeGreaterThanOrEqual(54);
      expect(ttl).toBeLessThanOrEqual(66);
      expect(JSON.parse(setCall[1])).toEqual({ __null__: true });
    });

    it('should cache undefined values with 60s TTL', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const fetchFn = jest.fn().mockResolvedValue(undefined);

      const result = await service.cacheWithProtection('test:key', 3600, fetchFn);

      expect(result).toBeNull();
      const setCall = mockRedis.set.mock.calls[0];
      expect(JSON.parse(setCall[1])).toEqual({ __null__: true });
    });

    it('should return null on fetch error', async () => {
      mockRedis.get.mockResolvedValue(null);
      const fetchFn = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const result = await service.cacheWithProtection('test:key', 3600, fetchFn);

      expect(result).toBeNull();
    });
  });

  describe('deleteWithDelay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delete immediately and schedule delayed deletion', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.deleteWithDelay('test:key', 500);

      expect(mockRedis.del).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('booking:test:key');

      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    it('should handle immediate delete failure', async () => {
      mockRedis.del.mockRejectedValue(new Error('DEL failed'));

      await expect(service.deleteWithDelay('test:key', 500)).resolves.not.toThrow();
    });

    it('should handle delayed delete failure', async () => {
      // First call succeeds, second call fails
      mockRedis.del.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('Delayed DEL failed'));

      await service.deleteWithDelay('test:key', 300);

      jest.advanceTimersByTime(300);
      await Promise.resolve();

      // Should not throw despite second delete failing
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('pipeline', () => {
    it('should execute multiple operations in a single pipeline', async () => {
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 'value'],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const results = await service.pipeline([
        { op: 'set', args: ['key1', { data: 'value1' }] },
        { op: 'get', args: ['key2'] },
        { op: 'del', args: ['key3'] },
      ]);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(results).toEqual(['OK', 'value', 1]);
    });

    it('should return empty array when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      const results = await service.pipeline([{ op: 'get', args: ['key1'] }]);

      expect(results).toEqual([]);
    });

    it('should return empty array when redis client is null', async () => {
      (service as any).redis = null;

      const results = await service.pipeline([{ op: 'get', args: ['key1'] }]);

      expect(results).toEqual([]);
    });

    it('should handle pipeline exec returning null', async () => {
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const results = await service.pipeline([{ op: 'set', args: ['key1', 'value1'] }]);

      expect(results).toEqual([]);
    });

    it('should handle individual pipeline operation errors', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[new Error('Key not found'), null]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const results = await service.pipeline([{ op: 'get', args: ['nonexistent'] }]);

      expect(results).toEqual([null]);
    });

    it('should support decr operation in pipeline', async () => {
      const mockPipeline = {
        decr: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 4]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const results = await service.pipeline([{ op: 'decr', args: ['counter:test'] }]);

      expect(mockPipeline.decr).toHaveBeenCalledWith('booking:counter:test');
      expect(results).toEqual([4]);
    });

    it('should support has operation in pipeline', async () => {
      const mockPipeline = {
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const results = await service.pipeline([{ op: 'has', args: ['test:key'] }]);

      expect(mockPipeline.exists).toHaveBeenCalledWith('booking:test:key');
      expect(results).toEqual([1]);
    });

    it('should warn on unknown pipeline operations', async () => {
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const mockPipeline = {
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await service.pipeline([{ op: 'unknown_op', args: ['key1'] }]);

      expect(loggerWarnSpy).toHaveBeenCalledWith('Unknown pipeline operation: unknown_op');
    });

    it('should handle pipeline creation errors gracefully', async () => {
      mockRedis.pipeline.mockImplementation(() => {
        throw new Error('Pipeline creation failed');
      });

      const results = await service.pipeline([{ op: 'get', args: ['key1'] }]);

      expect(results).toEqual([]);
    });

    it('should handle pipeline exec errors gracefully', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Exec failed')),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const results = await service.pipeline([{ op: 'get', args: ['key1'] }]);

      expect(results).toEqual([]);
    });

    it('should prefix keys correctly for all operations', async () => {
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 'val'],
          [null, 1],
          [null, 2],
          [null, true],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await service.pipeline([
        { op: 'set', args: ['key1', 'value'] },
        { op: 'get', args: ['key2'] },
        { op: 'del', args: ['key3'] },
        { op: 'incr', args: ['key4'] },
        { op: 'expire', args: ['key5', 60] },
        { op: 'has', args: ['key6'] },
      ]);

      expect(mockPipeline.set).toHaveBeenCalledWith(
        'booking:key1',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
      expect(mockPipeline.get).toHaveBeenCalledWith('booking:key2');
      expect(mockPipeline.del).toHaveBeenCalledWith('booking:key3');
      expect(mockPipeline.incr).toHaveBeenCalledWith('booking:key4');
      expect(mockPipeline.expire).toHaveBeenCalledWith('booking:key5', 60);
      expect(mockPipeline.exists).toHaveBeenCalledWith('booking:key6');
    });
  });

  describe('setSession', () => {
    it('should set value with session TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.setSession('session:abc123', { userId: '1' });

      const setCall = mockRedis.set.mock.calls[0];
      const ttl = setCall[3];
      expect(ttl).toBeGreaterThanOrEqual(544320);
      expect(ttl).toBeLessThanOrEqual(665280);
    });

    it('should skip when Redis is unavailable', async () => {
      (service as any).isConnected = false;

      await service.setSession('session:abc123', { userId: '1' });

      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return the Redis client', () => {
      const client = service.getClient();
      expect(client).not.toBeNull();
    });

    it('should return null when redis is null', () => {
      (service as any).redis = null;
      const client = service.getClient();
      expect(client).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return true when connected', () => {
      (service as any).isConnected = true;
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when disconnected', () => {
      (service as any).isConnected = false;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should set isConnected to true on successful ping', async () => {
      mockRedis.ping.mockResolvedValue('PONG' as any);
      (service as any).isConnected = false;

      await service.onModuleInit();

      expect((service as any).isConnected).toBe(true);
    });

    it('should set isConnected to false on ping failure', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Ping failed'));
      (service as any).isConnected = true;

      await service.onModuleInit();

      expect((service as any).isConnected).toBe(false);
    });

    it('should do nothing when redis client is null', async () => {
      (service as any).redis = null;
      (service as any).isConnected = false;

      await service.onModuleInit();

      expect((service as any).isConnected).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis connection when connected', async () => {
      (service as any).isConnected = true;

      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should not quit when not connected', async () => {
      (service as any).isConnected = false;

      await service.onModuleDestroy();

      expect(mockRedis.quit).not.toHaveBeenCalled();
    });

    it('should not quit when redis client is null', async () => {
      (service as any).redis = null;
      (service as any).isConnected = false;

      await service.onModuleDestroy();

      expect(mockRedis.quit).not.toHaveBeenCalled();
    });
  });

  describe('Redis initialization', () => {
    it('should create Redis client with correct config', () => {
      const client = service.getClient();
      expect(client).not.toBeNull();
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('graceful degradation', () => {
    it('should not throw errors when Redis is unavailable for get', async () => {
      (service as any).isConnected = false;
      await expect(service.get('test')).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for set', async () => {
      (service as any).isConnected = false;
      await expect(service.set('test', 'value')).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for delete', async () => {
      (service as any).isConnected = false;
      await expect(service.delete('test')).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for has', async () => {
      (service as any).isConnected = false;
      await expect(service.has('test')).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for decrement', async () => {
      (service as any).isConnected = false;
      await expect(service.decrement('test', 0)).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for increment', async () => {
      (service as any).isConnected = false;
      await expect(service.increment('test')).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for acquireLock', async () => {
      (service as any).isConnected = false;
      await expect(service.acquireLock('test', 10)).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for releaseLock', async () => {
      (service as any).isConnected = false;
      await expect(service.releaseLock('test')).resolves.not.toThrow();
    });

    it('should not throw errors when Redis is unavailable for pipeline', async () => {
      (service as any).isConnected = false;
      await expect(service.pipeline([{ op: 'get', args: ['test'] }])).resolves.not.toThrow();
    });

    it('should not throw errors when Redis client is null', async () => {
      (service as any).redis = null;
      (service as any).isConnected = false;
      await expect(service.get('test')).resolves.not.toThrow();
      await expect(service.set('test', 'value')).resolves.not.toThrow();
      await expect(service.has('test')).resolves.toBe(false);
    });
  });
});
