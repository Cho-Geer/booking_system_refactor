import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { CacheService } from '../cache/cache.service';
import {
  InvalidVerificationCodeException,
  MaxAttemptsExceededException,
  VerificationUnavailableException,
} from './exceptions/verification.exceptions';

const createMockCacheService = () => ({
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(undefined),
  has: jest.fn().mockResolvedValue(false),
  getPrefixedKey: jest.fn().mockImplementation((key: string) => `booking:${key}`),
  getClient: jest.fn().mockReturnValue({
    eval: jest.fn().mockResolvedValue(null),
  }),
  isAvailable: jest.fn().mockReturnValue(true),
});

describe('VerificationService', () => {
  let service: VerificationService;
  let cacheService: ReturnType<typeof createMockCacheService>;

  const testEmail = 'test@example.com';
  const testCode = '123456';
  const testType = 'REGISTER';

  const prefixedKey = (key: string) => `booking:${key}`;

  beforeEach(async () => {
    jest.clearAllMocks();

    cacheService = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCode', () => {
    it('should generate a 6-digit numeric code', async () => {
      cacheService.set.mockResolvedValue(undefined);

      const code = await service.generateCode(testEmail, testType);

      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    it('should store the code in Redis with correct key format', async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.generateCode(testEmail, testType);

      expect(cacheService.set).toHaveBeenCalledTimes(1);
      const setCall = cacheService.set.mock.calls[0];
      expect(setCall[0]).toBe(`verification:email:${testEmail}:${testType}`);
    });

    it('should store code with 5-minute TTL (300 seconds)', async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.generateCode(testEmail, testType);

      const setCall = cacheService.set.mock.calls[0];
      const ttl = setCall[2];
      expect(ttl).toBe(300);
    });

    it('should store code with attempt counter initialized to 0', async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.generateCode(testEmail, testType);

      const setCall = cacheService.set.mock.calls[0];
      const storedData = setCall[1];
      expect(storedData).toHaveProperty('code');
      expect(storedData).toHaveProperty('attempts', 0);
      expect(storedData).toHaveProperty('used', false);
      expect(storedData).toHaveProperty('createdAt');
    });

    it('should generate different codes on successive calls', async () => {
      cacheService.set.mockResolvedValue(undefined);

      const code1 = await service.generateCode(testEmail, testType);
      const code2 = await service.generateCode(testEmail, testType);

      expect(code1).not.toBe(code2);
    });
  });

  describe('verifyCode', () => {
    it('should return success when code matches and is valid', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"success"}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      const result = await service.verifyCode(testEmail, testCode, testType);

      expect(result).toEqual({ success: true });
      expect(cacheService.getPrefixedKey).toHaveBeenCalledWith(
        `verification:email:${testEmail}:${testType}`,
      );
      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        prefixedKey(`verification:email:${testEmail}:${testType}`),
        testCode,
        '3',
      );
    });

    it('should throw InvalidVerificationCodeException when code does not match', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"invalid_code","attempts":1}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        InvalidVerificationCodeException,
      );
    });

    it('should throw InvalidVerificationCodeException when code does not exist', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"not_found"}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        InvalidVerificationCodeException,
      );
    });

    it('should throw InvalidVerificationCodeException when code is already used (replay attack protection)', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"already_used"}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        InvalidVerificationCodeException,
      );
    });

    it('should increment attempts on wrong code', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"invalid_code","attempts":1}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        InvalidVerificationCodeException,
      );

      expect(redisClient.eval).toHaveBeenCalledTimes(1);
    });

    it('should throw MaxAttemptsExceededException after 3 failed attempts', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"max_attempts"}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        MaxAttemptsExceededException,
      );
    });

    it('should throw MaxAttemptsExceededException when attempts >= 3', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"max_attempts"}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        MaxAttemptsExceededException,
      );
    });

    it('should delete code after successful verification', async () => {
      const redisClient = {
        eval: jest.fn().mockResolvedValue('{"status":"success"}'),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await service.verifyCode(testEmail, testCode, testType);

      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining('DEL'),
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('deleteCode', () => {
    it('should delete the verification code from Redis', async () => {
      cacheService.delete.mockResolvedValue(undefined);

      await service.deleteCode(testEmail, testType);

      expect(cacheService.delete).toHaveBeenCalledWith(
        `verification:email:${testEmail}:${testType}`,
      );
    });

    it('should not throw when code does not exist', async () => {
      cacheService.delete.mockResolvedValue(undefined);

      await expect(service.deleteCode(testEmail, testType)).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when code exists', async () => {
      cacheService.has.mockResolvedValue(true);

      const result = await service.exists(testEmail, testType);

      expect(result).toBe(true);
      expect(cacheService.has).toHaveBeenCalledWith(`verification:email:${testEmail}:${testType}`);
    });

    it('should return false when code does not exist', async () => {
      cacheService.has.mockResolvedValue(false);

      const result = await service.exists(testEmail, testType);

      expect(result).toBe(false);
    });
  });

  describe('getAttempts', () => {
    it('should return the number of attempts', async () => {
      const storedData = {
        code: testCode,
        attempts: 2,
        used: false,
        createdAt: new Date().toISOString(),
      };
      cacheService.get.mockResolvedValue(storedData);

      const result = await service.getAttempts(testEmail, testType);

      expect(result).toBe(2);
    });

    it('should return 0 when code does not exist', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.getAttempts(testEmail, testType);

      expect(result).toBe(0);
    });
  });

  describe('getCode (internal method)', () => {
    it('should return the stored code', async () => {
      const storedData = {
        code: testCode,
        attempts: 0,
        used: false,
        createdAt: new Date().toISOString(),
      };
      cacheService.get.mockResolvedValue(storedData);

      const result = await (service as any).getCode(testEmail, testType);

      expect(result).toBe(testCode);
    });

    it('should return null when code does not exist', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await (service as any).getCode(testEmail, testType);

      expect(result).toBeNull();
    });
  });

  describe('Redis unavailable scenarios', () => {
    it('should throw VerificationUnavailableException when Redis is unavailable during generateCode', async () => {
      cacheService.isAvailable.mockReturnValue(false);

      await expect(service.generateCode(testEmail, testType)).rejects.toThrow(
        VerificationUnavailableException,
      );
    });

    it('should throw VerificationUnavailableException when Redis is unavailable during verifyCode', async () => {
      cacheService.isAvailable.mockReturnValue(false);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        VerificationUnavailableException,
      );
    });

    it('should throw VerificationUnavailableException when CacheService getClient returns null', async () => {
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.getClient.mockReturnValue(null);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        VerificationUnavailableException,
      );
    });

    it('should throw VerificationUnavailableException when Redis eval fails', async () => {
      const redisClient = {
        eval: jest.fn().mockRejectedValue(new Error('Redis eval failed')),
      };
      cacheService.getClient.mockReturnValue(redisClient);

      await expect(service.verifyCode(testEmail, testCode, testType)).rejects.toThrow(
        VerificationUnavailableException,
      );
    });
  });

  describe('key format verification', () => {
    it('should use correct key format for different verification types', async () => {
      cacheService.set.mockResolvedValue(undefined);
      const types = ['REGISTER', 'LOGIN', 'RESET'];

      for (const type of types) {
        await service.generateCode(testEmail, type);
        expect(cacheService.set).toHaveBeenCalledWith(
          `verification:email:${testEmail}:${type}`,
          expect.any(Object),
          300,
        );
        jest.clearAllMocks();
      }
    });
  });

  describe('code format validation', () => {
    it('should only generate numeric codes', async () => {
      cacheService.set.mockResolvedValue(undefined);

      for (let i = 0; i < 10; i++) {
        const code = await service.generateCode(testEmail, testType);
        expect(/^\d{6}$/.test(code)).toBe(true);
      }
    });

    it('should generate codes in range 100000-999999', async () => {
      cacheService.set.mockResolvedValue(undefined);

      for (let i = 0; i < 10; i++) {
        const code = await service.generateCode(testEmail, testType);
        const numericCode = parseInt(code, 10);
        expect(numericCode).toBeGreaterThanOrEqual(100000);
        expect(numericCode).toBeLessThanOrEqual(999999);
      }
    });
  });
});
