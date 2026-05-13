import { Test, TestingModule } from '@nestjs/testing';
import { TranslationService } from './translations.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CacheService } from '../cache/cache.service';

// ============================================================
// Mock PrismaService with TranslationDictionary model
// ============================================================
const createMockPrismaService = () => ({
  translationDictionary: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

// ============================================================
// Mock CacheService
// ============================================================
const createMockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  isAvailable: jest.fn().mockReturnValue(true),
});

// ============================================================
// Test Fixtures
// ============================================================
const MOCK_TRANSLATIONS_EN = [
  // global domain
  { id: '1', domain: 'global', key: 'save', locale: 'en', value: 'Save', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
  { id: '2', domain: 'global', key: 'cancel', locale: 'en', value: 'Cancel', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
  // auth domain
  { id: '3', domain: 'auth', key: 'login.title', locale: 'en', value: 'Sign In', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
  { id: '4', domain: 'auth', key: 'logout', locale: 'en', value: 'Sign Out', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
  // booking domain
  { id: '5', domain: 'booking', key: 'select_date', locale: 'en', value: 'Select a date', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
];

const MOCK_TRANSLATIONS_ZH = [
  { id: '6', domain: 'global', key: 'save', locale: 'zh', value: '保存', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
  { id: '7', domain: 'global', key: 'cancel', locale: 'zh', value: '取消', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
  { id: '8', domain: 'auth', key: 'login.title', locale: 'zh', value: '登录', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-05-01') },
];

// Entries updated after the "since" timestamp
const MOCK_UPDATED_ENTRIES = [
  { id: '9', domain: 'auth', key: 'login.title', locale: 'en', value: 'Sign In Updated', isCustom: false, tenantId: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-06-01') },
];

describe('TranslationService', () => {
  let service: TranslationService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCache: ReturnType<typeof createMockCacheService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma = createMockPrismaService();
    mockCache = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // getTranslations — Full Response (no since param)
  // ============================================================
  describe('getTranslations — Full Response', () => {
    it('should return translations grouped by domain as nested object', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      const result = await service.getTranslations('en');

      // Assert
      expect(result.locale).toBe('en');
      expect(result.updatedAt).toBeDefined();
      expect(result.translations).toEqual({
        global: { save: 'Save', cancel: 'Cancel' },
        auth: { 'login.title': 'Sign In', logout: 'Sign Out' },
        booking: { select_date: 'Select a date' },
      });
      expect(result.changes).toBeUndefined();
      expect(result.deleted).toBeUndefined();
    });

    it('should default to locale "en" when no locale param provided', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      const result = await service.getTranslations();

      // Assert
      expect(result.locale).toBe('en');
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locale: 'en' }),
        }),
      );
    });

    it('should filter by domain when domain param is provided', async () => {
      // Arrange
      const authEntries = MOCK_TRANSLATIONS_EN.filter(e => e.domain === 'auth');
      mockPrisma.translationDictionary.findMany.mockResolvedValue(authEntries);

      // Act
      const result = await service.getTranslations('en', 'auth');

      // Assert
      expect(result.translations).toEqual({
        auth: { 'login.title': 'Sign In', logout: 'Sign Out' },
      });
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ domain: 'auth' }),
        }),
      );
    });

    it('should group multiple domains correctly', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      const result = await service.getTranslations('en');

      // Assert
      const domains = Object.keys(result.translations!);
      expect(domains).toContain('global');
      expect(domains).toContain('auth');
      expect(domains).toContain('booking');
    });

    it('should return empty translations object for nonexistent locale', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTranslations('fr');

      // Assert
      expect(result.locale).toBe('fr');
      expect(result.translations).toEqual({});
    });
  });

  // ============================================================
  // getTranslations — Incremental (with since param)
  // ============================================================
  describe('getTranslations — Incremental (since param)', () => {
    const SINCE_ISO = '2026-05-15T00:00:00.000Z';

    it('should return changes and deleted structure when since param is provided', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_UPDATED_ENTRIES);

      // Act
      const result = await service.getTranslations('en', undefined, SINCE_ISO);

      // Assert
      expect(result.locale).toBe('en');
      expect(result.updatedAt).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(result.deleted).toBeDefined();
      expect(result.translations).toBeUndefined();
    });

    it('should only return entries with updatedAt > since timestamp', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_UPDATED_ENTRIES);

      // Act
      const result = await service.getTranslations('en', undefined, SINCE_ISO);

      // Assert
      expect(result.changes).toEqual({
        'auth.login.title': 'Sign In Updated',
      });
      // Verify the query filters by updatedAt > since
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should return empty changes and deleted when no updates since timestamp', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTranslations('en', undefined, SINCE_ISO);

      // Assert
      expect(result.changes).toEqual({});
      expect(result.deleted).toEqual([]);
    });

    it('should apply domain filter with since param for incremental updates', async () => {
      // Arrange
      mockPrisma.translationDictionary.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTranslations('en', 'auth', SINCE_ISO);

      // Assert
      expect(result.locale).toBe('en');
      // Both domain and updatedAt filters should be applied
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            domain: 'auth',
            updatedAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  // ============================================================
  // getTranslations — Redis Caching
  // ============================================================
  describe('getTranslations — Redis Caching', () => {
    it('should query DB and cache result to translations:{locale} key on first call', async () => {
      // Arrange — cache miss
      mockCache.get.mockResolvedValue(null);
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      const result = await service.getTranslations('en');

      // Assert
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledTimes(1);
      expect(mockCache.get).toHaveBeenCalledWith('translations:en');
      expect(mockCache.set).toHaveBeenCalledWith(
        'translations:en',
        expect.objectContaining({
          locale: 'en',
          translations: expect.any(Object),
        }),
        expect.any(Number), // TTL
      );
    });

    it('should return cached data on second call without querying DB', async () => {
      // Arrange
      const cachedResult = {
        locale: 'en',
        updatedAt: '2026-05-01T00:00:00.000Z',
        translations: {
          global: { save: 'Save', cancel: 'Cancel' },
        },
      };
      mockCache.get.mockResolvedValue(cachedResult);

      // Act
      const result = await service.getTranslations('en');

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockPrisma.translationDictionary.findMany).not.toHaveBeenCalled();
    });

    it('should use TTL of approximately 3600 seconds (1 hour)', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      await service.getTranslations('en');

      // Assert
      expect(mockCache.set).toHaveBeenCalled();
      const ttlArg = mockCache.set.mock.calls[0][2];
      // Allow some tolerance around 3600
      expect(ttlArg).toBeGreaterThan(3000);
      expect(ttlArg).toBeLessThanOrEqual(3600);
    });

    it('should re-query DB and re-cache on cache miss', async () => {
      // Arrange — first call cache miss
      mockCache.get
        .mockResolvedValueOnce(null)  // first call miss
        .mockResolvedValueOnce(null); // second call miss
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      await service.getTranslations('en');
      await service.getTranslations('en');

      // Assert
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledTimes(2);
      expect(mockCache.set).toHaveBeenCalledTimes(2);
    });

    it('should use separate cache keys for different locales', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockPrisma.translationDictionary.findMany
        .mockResolvedValueOnce(MOCK_TRANSLATIONS_EN)
        .mockResolvedValueOnce(MOCK_TRANSLATIONS_ZH);

      // Act
      await service.getTranslations('en');
      await service.getTranslations('zh');

      // Assert
      expect(mockCache.get).toHaveBeenCalledWith('translations:en');
      expect(mockCache.get).toHaveBeenCalledWith('translations:zh');
      expect(mockCache.set).toHaveBeenCalledWith(
        'translations:en',
        expect.any(Object),
        expect.any(Number),
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        'translations:zh',
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  // ============================================================
  // invalidateCache
  // ============================================================
  describe('invalidateCache', () => {
    it('should delete translations:{locale} from cache', async () => {
      // Act
      await service.invalidateCache('en');

      // Assert
      expect(mockCache.delete).toHaveBeenCalledWith('translations:en');
    });

    it('should delete translations:en (default) when locale is not provided', async () => {
      // Act
      await service.invalidateCache();

      // Assert
      expect(mockCache.delete).toHaveBeenCalledWith('translations:en');
    });

    it('should delete correct locale key', async () => {
      // Act
      await service.invalidateCache('zh');

      // Assert
      expect(mockCache.delete).toHaveBeenCalledWith('translations:zh');
    });

    it('should cause next getTranslations to re-query DB after invalidation', async () => {
      // Arrange — cache miss after invalidation
      mockCache.get
        .mockResolvedValueOnce(null)  // after invalidation, cache miss
        .mockResolvedValueOnce(null);
      mockPrisma.translationDictionary.findMany.mockResolvedValue(MOCK_TRANSLATIONS_EN);

      // Act
      await service.invalidateCache('en');
      const result = await service.getTranslations('en');

      // Assert
      expect(mockPrisma.translationDictionary.findMany).toHaveBeenCalledTimes(1);
      expect(result.translations).toBeDefined();
    });
  });

  // ============================================================
  // Service Decorator & Module Registration
  // ============================================================
  describe('Service definition', () => {
    it('should be injectable (have @Injectable decorator)', () => {
      // Arrange
      const decorators = Reflect.getOwnPropertyDescriptor(
        TranslationService,
        '__decorate',
      ) || {};

      // Assert — TranslationService must have @Injectable() which adds metadata
      const isInjectable = Reflect.getMetadata('design:paramtypes', TranslationService) ||
        (TranslationService as any).__decorate;
      expect(isInjectable).toBeTruthy();
    });
  });
});
