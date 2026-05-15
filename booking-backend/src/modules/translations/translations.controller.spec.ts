import { Test, TestingModule } from '@nestjs/testing';
import { TranslationsController } from './translations.controller';
import { AdminTranslationsController } from './admin-translations.controller';
import { TranslationService } from './translations.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// ============================================================
// Mock TranslationService
// ============================================================
const createMockTranslationService = () => ({
  getTranslations: jest.fn(),
  invalidateCache: jest.fn(),
  batchUpsert: jest.fn(),
  deleteTranslation: jest.fn(),
  seedDefaultTranslations: jest.fn(),
});

// ============================================================
// Test Fixtures
// ============================================================
const MOCK_FULL_RESPONSE = {
  locale: 'en',
  updatedAt: '2026-05-12T14:00:00.000Z',
  translations: {
    global: { save: 'Save', cancel: 'Cancel' },
    auth: { 'login.title': 'Sign In' },
  },
};

const MOCK_INCREMENTAL_RESPONSE = {
  locale: 'en',
  updatedAt: '2026-05-12T15:00:00.000Z',
  changes: { 'auth.login.title': 'Sign In Updated' },
  deleted: [],
};

const MOCK_PAGINATED_RESPONSE = {
  data: [
    {
      id: '1',
      domain: 'global',
      key: 'save',
      locale: 'en',
      value: 'Save',
      isCustom: false,
      tenantId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-05-01'),
    },
    {
      id: '2',
      domain: 'global',
      key: 'cancel',
      locale: 'en',
      value: 'Cancel',
      isCustom: false,
      tenantId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-05-01'),
    },
  ],
  meta: {
    total: 200,
    page: 1,
    limit: 20,
    totalPages: 10,
  },
};

const MOCK_BATCH_UPSERT_RESPONSE = {
  updated: 5,
  created: 3,
};

describe('TranslationsController (Public)', () => {
  let controller: TranslationsController;
  let mockService: ReturnType<typeof createMockTranslationService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockService = createMockTranslationService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationsController],
      providers: [
        {
          provide: TranslationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TranslationsController>(TranslationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // GET /translations — Full Response (no params)
  // ============================================================
  describe('GET /translations (no params)', () => {
    it('should return full translation object with locale, updatedAt, and translations', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue(MOCK_FULL_RESPONSE);

      // Act
      const result = await controller.getTranslations();

      // Assert
      expect(result).toEqual(MOCK_FULL_RESPONSE);
      expect(result.locale).toBe('en');
      expect(result.updatedAt).toBeDefined();
      expect(result.translations).toBeDefined();
      expect(result.changes).toBeUndefined();
      expect(result.deleted).toBeUndefined();
    });

    it('should call service.getTranslations with default parameters (locale=en)', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue(MOCK_FULL_RESPONSE);

      // Act
      await controller.getTranslations();

      // Assert
      expect(mockService.getTranslations).toHaveBeenCalledWith(
        undefined, // locale
        undefined, // domain
        undefined, // since
      );
    });
  });

  // ============================================================
  // GET /translations — With query parameters
  // ============================================================
  describe('GET /translations with query params', () => {
    it('should pass locale parameter to service when provided', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue({
        ...MOCK_FULL_RESPONSE,
        locale: 'zh',
      });

      // Act
      const result = await controller.getTranslations('zh');

      // Assert
      expect(result.locale).toBe('zh');
      expect(mockService.getTranslations).toHaveBeenCalledWith(
        'zh',
        undefined,
        undefined,
      );
    });

    it('should pass domain filter to service when provided', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue({
        locale: 'en',
        updatedAt: '2026-05-12T14:00:00.000Z',
        translations: {
          auth: { 'login.title': 'Sign In', logout: 'Sign Out' },
        },
      });

      // Act
      const result = await controller.getTranslations('en', 'auth');

      // Assert
      expect(Object.keys(result.translations!)).toEqual(['auth']);
      expect(mockService.getTranslations).toHaveBeenCalledWith(
        'en',
        'auth',
        undefined,
      );
    });

    it('should pass since parameter and return incremental response when provided', async () => {
      // Arrange
      const sinceDate = '2026-05-15T00:00:00.000Z';
      mockService.getTranslations.mockResolvedValue(MOCK_INCREMENTAL_RESPONSE);

      // Act
      const result = await controller.getTranslations('en', undefined, sinceDate);

      // Assert
      expect(result.changes).toBeDefined();
      expect(result.deleted).toBeDefined();
      expect(result.translations).toBeUndefined();
      expect(mockService.getTranslations).toHaveBeenCalledWith(
        'en',
        undefined,
        sinceDate,
      );
    });

    it('should combine locale, domain, and since parameters together', async () => {
      // Arrange
      const sinceDate = '2026-05-15T00:00:00.000Z';
      mockService.getTranslations.mockResolvedValue(MOCK_INCREMENTAL_RESPONSE);

      // Act
      await controller.getTranslations('zh', 'auth', sinceDate);

      // Assert
      expect(mockService.getTranslations).toHaveBeenCalledWith(
        'zh',
        'auth',
        sinceDate,
      );
    });
  });

  // ============================================================
  // Auth Guard — @Public() decorator
  // ============================================================
  describe('Auth — Public access', () => {
    it('should have @Public() decorator on controller or getTranslations method', async () => {
      // Arrange
      const isPublic = Reflect.getOwnPropertyDescriptor(
        TranslationsController,
        '__decorate',
      ) || {};

      // Assert — the controller class or method should have @Public() metadata
      // This checks via reflector pattern
      const reflector = new Reflector();
      const publicMetadata = reflector.get(
        IS_PUBLIC_KEY,
        TranslationsController,
      );

      // Also check on the method level
      const methodPublic = reflector.get(
        IS_PUBLIC_KEY,
        TranslationsController.prototype.getTranslations,
      );

      const hasPublicDecorator = publicMetadata === true || methodPublic === true;
      expect(hasPublicDecorator).toBe(true);
    });
  });
});

// ============================================================
// AdminTranslationsController Tests
// ============================================================
describe('AdminTranslationsController', () => {
  let controller: AdminTranslationsController;
  let mockService: ReturnType<typeof createMockTranslationService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockService = createMockTranslationService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTranslationsController],
      providers: [
        {
          provide: TranslationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminTranslationsController>(AdminTranslationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // GET /admin/translations — Paginated list
  // ============================================================
  describe('GET /admin/translations', () => {
    it('should return paginated list of all translation entries', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue(MOCK_PAGINATED_RESPONSE);

      // Act
      const result = await controller.getAdminTranslations();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
    });

    it('should support pagination with page and limit parameters', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue(MOCK_PAGINATED_RESPONSE);

      // Act
      const result = await controller.getAdminTranslations(1, 50);

      // Assert
      expect(result.meta.limit).toBeGreaterThan(0);
    });

    it('should support filtering by locale, domain, isCustom', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue(MOCK_PAGINATED_RESPONSE);

      // Act
      const result = await controller.getAdminTranslations(1, 20, 'en', 'global', true);

      // Assert
      expect(result).toBeDefined();
    });

    it('should return all entries when no filters applied', async () => {
      // Arrange
      mockService.getTranslations.mockResolvedValue(MOCK_PAGINATED_RESPONSE);

      // Act
      const result = await controller.getAdminTranslations();

      // Assert
      expect(result.meta.total).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // PUT /admin/translations — Batch create/update
  // ============================================================
  describe('PUT /admin/translations', () => {
    const MOCK_UPSERT_DTO = {
      entries: [
        {
          domain: 'global',
          key: 'new_key',
          locale: 'en',
          value: 'New Value',
          isCustom: true,
        },
        {
          domain: 'auth',
          key: 'login.title',
          locale: 'en',
          value: 'Updated Sign In',
          isCustom: true,
        },
      ],
    };

    it('should batch create/update translations and return updated count', async () => {
      // Arrange
      mockService.batchUpsert.mockResolvedValue(MOCK_BATCH_UPSERT_RESPONSE);

      // Act
      const result = await controller.batchUpsert(MOCK_UPSERT_DTO);

      // Assert
      expect(result.updated).toBe(5);
      expect(result.created).toBe(3);
    });

    it('should call service.batchUpsert with the provided entries', async () => {
      // Arrange
      mockService.batchUpsert.mockResolvedValue(MOCK_BATCH_UPSERT_RESPONSE);

      // Act
      await controller.batchUpsert(MOCK_UPSERT_DTO);

      // Assert
      expect(mockService.batchUpsert).toHaveBeenCalledWith(MOCK_UPSERT_DTO.entries);
    });

    it('should accept empty entries array and return zero counts', async () => {
      // Arrange
      mockService.batchUpsert.mockResolvedValue({ updated: 0, created: 0 });

      // Act
      const result = await controller.batchUpsert({ entries: [] });

      // Assert
      expect(result.updated).toBe(0);
      expect(result.created).toBe(0);
    });

    it('should invalidate cache after successful batch upsert', async () => {
      // Arrange
      mockService.batchUpsert.mockResolvedValue(MOCK_BATCH_UPSERT_RESPONSE);

      // Act
      await controller.batchUpsert(MOCK_UPSERT_DTO);

      // Assert
      expect(mockService.invalidateCache).toHaveBeenCalled();
    });
  });

  // ============================================================
  // DELETE /admin/translations/:id
  // ============================================================
  describe('DELETE /admin/translations/:id', () => {
    const TRANSLATION_ID = 'trans-123';

    it('should delete a custom translation by id', async () => {
      // Arrange
      mockService.deleteTranslation.mockResolvedValue(undefined);

      // Act
      await controller.deleteTranslation(TRANSLATION_ID);

      // Assert
      expect(mockService.deleteTranslation).toHaveBeenCalledWith(TRANSLATION_ID);
    });

    it('should return 404 when translation id does not exist', async () => {
      // Arrange
      mockService.deleteTranslation.mockRejectedValue(
        new Error('Translation not found'),
      );

      // Act & Assert
      await expect(
        controller.deleteTranslation('nonexistent-id'),
      ).rejects.toThrow('Translation not found');
    });

    it('should invalidate cache after successful deletion', async () => {
      // Arrange
      mockService.deleteTranslation.mockResolvedValue(undefined);

      // Act
      await controller.deleteTranslation(TRANSLATION_ID);

      // Assert
      expect(mockService.invalidateCache).toHaveBeenCalled();
    });
  });

  // ============================================================
  // POST /admin/translations/seed
  // ============================================================
  describe('POST /admin/translations/seed', () => {
    it('should re-populate default translations and return success', async () => {
      // Arrange
      mockService.seedDefaultTranslations.mockResolvedValue({
        message: "seed_success",
        count: 205,
      });

      // Act
      const result = await controller.seedDefaultTranslations();

      // Assert
      expect(result.message).toBe("seed_success");
      expect(result.count).toBeGreaterThan(0);
    });

    it('should call service.seedDefaultTranslations', async () => {
      // Arrange
      mockService.seedDefaultTranslations.mockResolvedValue({
        message: "seed_success",
        count: 205,
      });

      // Act
      await controller.seedDefaultTranslations();

      // Assert
      expect(mockService.seedDefaultTranslations).toHaveBeenCalled();
    });

    it('should invalidate cache after seeding', async () => {
      // Arrange
      mockService.seedDefaultTranslations.mockResolvedValue({
        message: "seed_success",
        count: 205,
      });

      // Act
      await controller.seedDefaultTranslations();

      // Assert
      expect(mockService.invalidateCache).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Auth Guards — Role-based access
  // ============================================================
  describe('Auth — ADMIN role guards', () => {
    it('should have @Roles("ADMIN", "SUPER_ADMIN") on GET /admin/translations', async () => {
      // Arrange
      const reflector = new Reflector();
      const roles = reflector.get(
        'roles',
        AdminTranslationsController.prototype.getAdminTranslations,
      );

      // Assert
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });

    it('should have @Roles("ADMIN", "SUPER_ADMIN") on PUT /admin/translations', async () => {
      // Arrange
      const reflector = new Reflector();
      const roles = reflector.get(
        'roles',
        AdminTranslationsController.prototype.batchUpsert,
      );

      // Assert
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });

    it('should have @Roles("ADMIN", "SUPER_ADMIN") on DELETE /admin/translations/:id', async () => {
      // Arrange
      const reflector = new Reflector();
      const roles = reflector.get(
        'roles',
        AdminTranslationsController.prototype.deleteTranslation,
      );

      // Assert
      expect(roles).toBeDefined();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });

    it('should have @Roles("SUPER_ADMIN") ONLY on POST /admin/translations/seed', async () => {
      // Arrange
      const reflector = new Reflector();
      const roles = reflector.get(
        'roles',
        AdminTranslationsController.prototype.seedDefaultTranslations,
      );

      // Assert — only SUPER_ADMIN should have access to seed
      expect(roles).toBeDefined();
      expect(roles).toContain('SUPER_ADMIN');
      expect(roles).not.toContain('ADMIN');
      expect(roles).toHaveLength(1);
    });
  });
});
