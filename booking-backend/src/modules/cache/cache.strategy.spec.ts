import { Test, TestingModule } from '@nestjs/testing';
import { CacheStrategy, CacheKeys, CacheTTL } from './cache.strategy';
import { CacheService } from './cache.service';
import { Logger } from '@nestjs/common';

// Mock CacheService
const createMockCacheService = () => ({
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(undefined),
  setSession: jest.fn().mockResolvedValue(undefined),
  deleteWithDelay: jest.fn().mockResolvedValue(undefined),
  decrement: jest.fn().mockResolvedValue(0),
  increment: jest.fn().mockResolvedValue(1),
  cacheWithProtection: jest.fn().mockResolvedValue(null),
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
  isAvailable: jest.fn().mockReturnValue(true),
  getClient: jest.fn().mockReturnValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    incr: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(0),
  }),
});

describe('CacheStrategy', () => {
  let strategy: CacheStrategy;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    cacheService = createMockCacheService();

    // Suppress Logger output
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheStrategy,
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    strategy = module.get<CacheStrategy>(CacheStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Session Cache Tests
  // ---------------------------------------------------------------------------

  describe('setUserSession', () => {
    it('should call cacheService.setSession with correct key', async () => {
      const sessionToken = 'session-token-123';
      const sessionData = { userId: 'user-1', email: 'user@example.com' };

      await strategy.setUserSession(sessionToken, sessionData);

      expect(cacheService.setSession).toHaveBeenCalledWith(
        `session:${sessionToken}`,
        sessionData,
      );
    });

    it('should handle complex session data', async () => {
      const sessionData = {
        userId: 'user-1',
        roles: ['admin', 'user'],
        permissions: ['read', 'write'],
        metadata: { lastLogin: '2024-01-01T00:00:00Z' },
      };

      await strategy.setUserSession('complex-token', sessionData);

      expect(cacheService.setSession).toHaveBeenCalledWith(
        'session:complex-token',
        sessionData,
      );
    });
  });

  describe('getUserSession', () => {
    it('should return cached session data', async () => {
      const sessionToken = 'session-token-456';
      const sessionData = { userId: 'user-1', email: 'user@example.com' };
      cacheService.get.mockResolvedValue(sessionData);

      const result = await strategy.getUserSession(sessionToken);

      expect(cacheService.get).toHaveBeenCalledWith(`session:${sessionToken}`);
      expect(result).toEqual(sessionData);
    });

    it('should return null when session is not found', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await strategy.getUserSession('expired-session');

      expect(result).toBeNull();
    });

    it('should support generic type parameter', async () => {
      interface UserSession {
        userId: string;
        email: string;
      }
      const sessionData: UserSession = { userId: 'user-1', email: 'user@example.com' };
      cacheService.get.mockResolvedValue(sessionData);

      const result = await strategy.getUserSession<UserSession>('typed-token');

      expect(result).toEqual(sessionData);
    });
  });

  describe('removeUserSession', () => {
    it('should call cacheService.delete with session key', async () => {
      const sessionToken = 'session-token-789';

      await strategy.removeUserSession(sessionToken);

      expect(cacheService.delete).toHaveBeenCalledWith(`session:${sessionToken}`);
    });
  });

  // ---------------------------------------------------------------------------
  // Verification Code Cache Tests
  // ---------------------------------------------------------------------------

  describe('setVerificationCode', () => {
    it('should cache verification code with correct TTL', async () => {
      await strategy.setVerificationCode('13800138000', 'sms', '123456');

      expect(cacheService.set).toHaveBeenCalledWith(
        'verification:13800138000:sms',
        { code: '123456' },
        CacheTTL.verification,
      );
    });

    it('should cache email verification code', async () => {
      await strategy.setVerificationCode('user@example.com', 'email', '654321');

      expect(cacheService.set).toHaveBeenCalledWith(
        'verification:user@example.com:email',
        { code: '654321' },
        300,
      );
    });

    it('should wrap code in object structure', async () => {
      await strategy.setVerificationCode('1234567890', 'sms', '999888');

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        { code: '999888' },
        expect.any(Number),
      );
    });
  });

  describe('getVerificationCode', () => {
    it('should return cached verification code', async () => {
      cacheService.get.mockResolvedValue({ code: '123456' });

      const result = await strategy.getVerificationCode('13800138000', 'sms');

      expect(cacheService.get).toHaveBeenCalledWith('verification:13800138000:sms');
      expect(result).toBe('123456');
    });

    it('should return null when verification code is not found', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await strategy.getVerificationCode('13800138000', 'sms');

      expect(result).toBeNull();
    });

    it('should return null when cached data has no code property', async () => {
      cacheService.get.mockResolvedValue({ other: 'data' });

      const result = await strategy.getVerificationCode('13800138000', 'sms');

      expect(result).toBeNull();
    });

    it('should return null when code property is undefined', async () => {
      cacheService.get.mockResolvedValue({ code: undefined });

      const result = await strategy.getVerificationCode('13800138000', 'sms');

      expect(result).toBeNull();
    });
  });

  describe('removeVerificationCode', () => {
    it('should delete verification code from cache', async () => {
      await strategy.removeVerificationCode('13800138000', 'sms');

      expect(cacheService.delete).toHaveBeenCalledWith('verification:13800138000:sms');
    });
  });

  // ---------------------------------------------------------------------------
  // Active Services Cache Tests
  // ---------------------------------------------------------------------------

  describe('setActiveServices', () => {
    it('should cache services list with correct TTL', async () => {
      const services = [{ id: 'svc-1', name: 'Haircut' }, { id: 'svc-2', name: 'Manicure' }];

      await strategy.setActiveServices(services);

      expect(cacheService.set).toHaveBeenCalledWith(
        'services:active',
        services,
        CacheTTL.servicesActive,
      );
    });

    it('should handle empty services list', async () => {
      await strategy.setActiveServices([]);

      expect(cacheService.set).toHaveBeenCalledWith(
        'services:active',
        [],
        CacheTTL.servicesActive,
      );
    });
  });

  describe('getActiveServices', () => {
    it('should return cached services list', async () => {
      const services = [{ id: 'svc-1', name: 'Haircut' }];
      cacheService.get.mockResolvedValue(services);

      const result = await strategy.getActiveServices();

      expect(cacheService.get).toHaveBeenCalledWith('services:active');
      expect(result).toEqual(services);
    });

    it('should return null when no services are cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await strategy.getActiveServices();

      expect(result).toBeNull();
    });

    it('should support generic type parameter', async () => {
      interface Service {
        id: string;
        name: string;
        price: number;
      }
      const services: Service[] = [{ id: 'svc-1', name: 'Haircut', price: 50 }];
      cacheService.get.mockResolvedValue(services);

      const result = await strategy.getActiveServices<Service>();

      expect(result).toEqual(services);
    });
  });

  describe('invalidateActiveServices', () => {
    it('should delete services cache with delay', async () => {
      await strategy.invalidateActiveServices();

      expect(cacheService.deleteWithDelay).toHaveBeenCalledWith('services:active', 500);
    });
  });

  // ---------------------------------------------------------------------------
  // Available Time Slots Cache Tests
  // ---------------------------------------------------------------------------

  describe('setAvailableTimeSlots', () => {
    it('should cache time slots with correct TTL', async () => {
      const slots = [{ id: 'slot-1', time: '10:00' }];

      await strategy.setAvailableTimeSlots('2024-06-15', slots);

      expect(cacheService.set).toHaveBeenCalledWith(
        'timeslots:available:2024-06-15',
        slots,
        CacheTTL.timeslotsAvailable,
      );
    });

    it('should handle different date formats', async () => {
      const slots = [{ id: 'slot-1', time: '09:00' }];

      await strategy.setAvailableTimeSlots('2024/12/25', slots);

      expect(cacheService.set).toHaveBeenCalledWith(
        'timeslots:available:2024/12/25',
        slots,
        CacheTTL.timeslotsAvailable,
      );
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should return cached time slots', async () => {
      const slots = [{ id: 'slot-1', time: '10:00' }];
      cacheService.get.mockResolvedValue(slots);

      const result = await strategy.getAvailableTimeSlots('2024-06-15');

      expect(cacheService.get).toHaveBeenCalledWith('timeslots:available:2024-06-15');
      expect(result).toEqual(slots);
    });

    it('should return null when no slots are cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await strategy.getAvailableTimeSlots('2024-12-25');

      expect(result).toBeNull();
    });

    it('should support generic type parameter', async () => {
      interface TimeSlot {
        id: string;
        time: string;
        available: boolean;
      }
      const slots: TimeSlot[] = [{ id: 'slot-1', time: '10:00', available: true }];
      cacheService.get.mockResolvedValue(slots);

      const result = await strategy.getAvailableTimeSlots<TimeSlot>('2024-06-15');

      expect(result).toEqual(slots);
    });
  });

  describe('invalidateTimeSlots', () => {
    it('should delete time slots cache with delay', async () => {
      await strategy.invalidateTimeSlots('2024-06-15');

      expect(cacheService.deleteWithDelay).toHaveBeenCalledWith(
        'timeslots:available:2024-06-15',
        500,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // User Profile Cache Tests
  // ---------------------------------------------------------------------------

  describe('setUserProfile', () => {
    it('should cache user profile with correct TTL', async () => {
      const profile = { id: 'user-1', name: 'John Doe', email: 'john@example.com' };

      await strategy.setUserProfile('user-1', profile);

      expect(cacheService.set).toHaveBeenCalledWith(
        'user:user-1:profile',
        profile,
        CacheTTL.userProfile,
      );
    });
  });

  describe('getUserProfile', () => {
    it('should return cached user profile', async () => {
      const profile = { id: 'user-1', name: 'John Doe' };
      cacheService.get.mockResolvedValue(profile);

      const result = await strategy.getUserProfile('user-1');

      expect(cacheService.get).toHaveBeenCalledWith('user:user-1:profile');
      expect(result).toEqual(profile);
    });

    it('should return null when profile is not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await strategy.getUserProfile('user-nonexistent');

      expect(result).toBeNull();
    });

    it('should support generic type parameter', async () => {
      interface UserProfile {
        id: string;
        name: string;
        email: string;
      }
      const profile: UserProfile = { id: 'user-1', name: 'John', email: 'john@test.com' };
      cacheService.get.mockResolvedValue(profile);

      const result = await strategy.getUserProfile<UserProfile>('user-1');

      expect(result).toEqual(profile);
    });
  });

  describe('invalidateUserProfile', () => {
    it('should delete user profile cache with delay', async () => {
      await strategy.invalidateUserProfile('user-1');

      expect(cacheService.deleteWithDelay).toHaveBeenCalledWith('user:user-1:profile', 500);
    });
  });

  // ---------------------------------------------------------------------------
  // Slot Capacity Cache Tests
  // ---------------------------------------------------------------------------

  describe('setSlotRemaining', () => {
    it('should set slot remaining capacity using raw Redis set', async () => {
      const mockClient = cacheService.getClient();

      await strategy.setSlotRemaining('slot-1', 5);

      expect(mockClient.set).toHaveBeenCalledWith(
        'booking:slot:slot-1:remaining',
        '5',
        'EX',
        CacheTTL.slotRemaining,
      );
    });

    it('should skip when Redis is unavailable', async () => {
      cacheService.isAvailable.mockReturnValue(false);

      await strategy.setSlotRemaining('slot-1', 5);

      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(cacheService.getClient).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const mockClient = cacheService.getClient();
      mockClient.set.mockRejectedValue(new Error('Redis connection failed'));

      await strategy.setSlotRemaining('slot-1', 5);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle zero capacity', async () => {
      const mockClient = cacheService.getClient();

      await strategy.setSlotRemaining('slot-1', 0);

      expect(mockClient.set).toHaveBeenCalledWith(
        'booking:slot:slot-1:remaining',
        '0',
        'EX',
        CacheTTL.slotRemaining,
      );
    });

    it('should handle large capacity values', async () => {
      const mockClient = cacheService.getClient();

      await strategy.setSlotRemaining('slot-1', 999999);

      expect(mockClient.set).toHaveBeenCalledWith(
        'booking:slot:slot-1:remaining',
        '999999',
        'EX',
        CacheTTL.slotRemaining,
      );
    });

    it('should not call getClient when service unavailable', async () => {
      cacheService.isAvailable.mockReturnValue(false);

      await strategy.setSlotRemaining('slot-1', 5);

      expect(cacheService.getClient).not.toHaveBeenCalled();
    });
  });

  describe('decrementSlotRemaining', () => {
    it('should call cacheService.decrement', async () => {
      cacheService.decrement.mockResolvedValue(4);

      const result = await strategy.decrementSlotRemaining('slot-1');

      expect(cacheService.decrement).toHaveBeenCalledWith('slot:slot-1:remaining', 0);
      expect(result).toBe(4);
    });

    it('should return decremented value', async () => {
      cacheService.decrement.mockResolvedValue(0);

      const result = await strategy.decrementSlotRemaining('slot-1');

      expect(result).toBe(0);
    });

    it('should return negative when no capacity', async () => {
      cacheService.decrement.mockResolvedValue(-1);

      const result = await strategy.decrementSlotRemaining('slot-1');

      expect(result).toBe(-1);
    });
  });

  describe('getSlotRemaining', () => {
    it('should return remaining capacity', async () => {
      const mockClient = cacheService.getClient();
      mockClient.get.mockResolvedValue('5');

      const result = await strategy.getSlotRemaining('slot-1');

      expect(result).toBe(5);
    });

    it('should return null when slot not found', async () => {
      const mockClient = cacheService.getClient();
      mockClient.get.mockResolvedValue(null);

      const result = await strategy.getSlotRemaining('slot-1');

      expect(result).toBeNull();
    });

    it('should return null when Redis is unavailable', async () => {
      cacheService.isAvailable.mockReturnValue(false);

      const result = await strategy.getSlotRemaining('slot-1');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      const mockClient = cacheService.getClient();
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await strategy.getSlotRemaining('slot-1');

      expect(result).toBeNull();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should not call getClient when service unavailable', async () => {
      cacheService.isAvailable.mockReturnValue(false);

      await strategy.getSlotRemaining('slot-1');

      expect(cacheService.getClient).not.toHaveBeenCalled();
    });

    it('should parse integer values correctly', async () => {
      const mockClient = cacheService.getClient();
      mockClient.get.mockResolvedValue('42');

      const result = await strategy.getSlotRemaining('slot-1');

      expect(result).toBe(42);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Cache Penetration Protection Tests
  // ---------------------------------------------------------------------------

  describe('getCachedOrFetch', () => {
    it('should return cached value when available', async () => {
      cacheService.cacheWithProtection.mockResolvedValue({ data: 'cached-value' });

      const fetchFn = jest.fn().mockResolvedValue({ data: 'fresh-value' });
      const result = await strategy.getCachedOrFetch('test-key', 300, fetchFn);

      expect(result).toEqual({ data: 'cached-value' });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should return null for null sentinel value', async () => {
      cacheService.cacheWithProtection.mockResolvedValue({ __null__: true });

      const fetchFn = jest.fn().mockResolvedValue(null);
      const result = await strategy.getCachedOrFetch('test-key', 300, fetchFn);

      expect(result).toBeNull();
    });

    it('should return fresh value from fetch function', async () => {
      cacheService.cacheWithProtection.mockResolvedValue({ fresh: true });

      const fetchFn = jest.fn().mockResolvedValue({ fresh: true });
      const result = await strategy.getCachedOrFetch('test-key', 300, fetchFn);

      expect(result).toEqual({ fresh: true });
    });

    it('should pass correct TTL to cache service', async () => {
      cacheService.cacheWithProtection.mockResolvedValue({ value: 'test' });

      await strategy.getCachedOrFetch('test-key', 600, jest.fn());

      expect(cacheService.cacheWithProtection).toHaveBeenCalledWith(
        'test-key',
        600,
        expect.any(Function),
      );
    });

    it('should handle async fetch functions', async () => {
      cacheService.cacheWithProtection.mockResolvedValue({ async: true });
      const asyncFn = jest.fn().mockResolvedValue(Promise.resolve({ async: true }));

      const result = await strategy.getCachedOrFetch('async-key', 300, asyncFn);

      expect(result).toEqual({ async: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Distributed Lock Tests
  // ---------------------------------------------------------------------------

  describe('acquireHotDataLock', () => {
    it('should acquire lock with default TTL', async () => {
      cacheService.acquireLock.mockResolvedValue(true);

      const result = await strategy.acquireHotDataLock('hot-key');

      expect(cacheService.acquireLock).toHaveBeenCalledWith('lock:hot-key', 10);
      expect(result).toBe(true);
    });

    it('should acquire lock with custom TTL', async () => {
      cacheService.acquireLock.mockResolvedValue(true);

      const result = await strategy.acquireHotDataLock('hot-key', 30);

      expect(cacheService.acquireLock).toHaveBeenCalledWith('lock:hot-key', 30);
      expect(result).toBe(true);
    });

    it('should return false when lock cannot be acquired', async () => {
      cacheService.acquireLock.mockResolvedValue(false);

      const result = await strategy.acquireHotDataLock('hot-key');

      expect(result).toBe(false);
    });

    it('should prepend lock prefix to key', async () => {
      cacheService.acquireLock.mockResolvedValue(true);

      await strategy.acquireHotDataLock('my-resource', 15);

      expect(cacheService.acquireLock).toHaveBeenCalledWith('lock:my-resource', 15);
    });
  });

  describe('releaseHotDataLock', () => {
    it('should release lock', async () => {
      await strategy.releaseHotDataLock('hot-key');

      expect(cacheService.releaseLock).toHaveBeenCalledWith('lock:hot-key');
    });

    it('should prepend lock prefix when releasing', async () => {
      await strategy.releaseHotDataLock('my-resource');

      expect(cacheService.releaseLock).toHaveBeenCalledWith('lock:my-resource');
    });
  });
});

describe('CacheKeys', () => {
  it('should generate correct session key', () => {
    expect(CacheKeys.session('token-123')).toBe('session:token-123');
  });

  it('should generate correct verification key', () => {
    expect(CacheKeys.verification('13800138000', 'sms')).toBe('verification:13800138000:sms');
  });

  it('should generate correct email verification key', () => {
    expect(CacheKeys.verification('user@example.com', 'email')).toBe('verification:user@example.com:email');
  });

  it('should generate correct services active key', () => {
    expect(CacheKeys.servicesActive).toBe('services:active');
  });

  it('should generate correct timeslots available key', () => {
    expect(CacheKeys.timeslotsAvailable('2024-06-15')).toBe('timeslots:available:2024-06-15');
  });

  it('should generate correct user profile key', () => {
    expect(CacheKeys.userProfile('user-1')).toBe('user:user-1:profile');
  });

  it('should generate correct slot remaining key', () => {
    expect(CacheKeys.slotRemaining('slot-1')).toBe('slot:slot-1:remaining');
  });

  it('should handle UUID-style slot IDs', () => {
    expect(CacheKeys.slotRemaining('550e8400-e29b-41d4-a716-446655440000'))
      .toBe('slot:550e8400-e29b-41d4-a716-446655440000:remaining');
  });
});

describe('CacheTTL', () => {
  it('should have correct verification TTL (5 minutes)', () => {
    expect(CacheTTL.verification).toBe(300);
  });

  it('should have correct services active TTL (1 hour)', () => {
    expect(CacheTTL.servicesActive).toBe(3600);
  });

  it('should have correct timeslots available TTL (30 minutes)', () => {
    expect(CacheTTL.timeslotsAvailable).toBe(1800);
  });

  it('should have correct user profile TTL (1 day)', () => {
    expect(CacheTTL.userProfile).toBe(86400);
  });

  it('should have correct slot remaining TTL (1 hour)', () => {
    expect(CacheTTL.slotRemaining).toBe(3600);
  });

  it('should have correct null value TTL (60 seconds)', () => {
    expect(CacheTTL.nullValue).toBe(60);
  });

  it('should have all TTL values as positive integers', () => {
    const ttlValues = Object.values(CacheTTL) as number[];
    ttlValues.forEach(ttl => {
      expect(Number.isInteger(ttl)).toBe(true);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  it('should have reasonable TTL hierarchy', () => {
    expect(CacheTTL.nullValue).toBeLessThan(CacheTTL.verification);
    expect(CacheTTL.verification).toBeLessThan(CacheTTL.timeslotsAvailable);
    expect(CacheTTL.timeslotsAvailable).toBeLessThan(CacheTTL.servicesActive);
    expect(CacheTTL.servicesActive).toBeLessThan(CacheTTL.userProfile);
  });
});
