import { ConfigService } from '@nestjs/config';

// Mock PrismaClient to NOT return a new object (which would hijack `this`),
// but instead assign methods to the default `this` so PrismaService methods
// like onModuleInit/onModuleDestroy remain accessible.
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(function (this: any) {
      // Assign mock methods to `this` so the derived class keeps its prototype methods
      Object.assign(this, mockPrismaClient);
      // Do NOT return anything — let `new` use the default `this`
    }),
  };
});

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  const TEST_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db?schema=public';
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply mock implementation (needed because jest.config.unit.js has resetMocks: true)
    const PrismaClientMock = jest.requireMock('@prisma/client').PrismaClient;
    PrismaClientMock.mockImplementation(function (this: any) {
      Object.assign(this, mockPrismaClient);
    });

    mockConfigService = {
      get: jest.fn().mockReturnValue(TEST_DATABASE_URL),
    } as unknown as jest.Mocked<ConfigService>;
  });

  describe('constructor', () => {
    it('should inject ConfigService and read DATABASE_URL from it', () => {
      // Act
      const service = new PrismaService(mockConfigService);

      // Assert
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
    });

    it('should pass the ConfigService DATABASE_URL to PrismaClient constructor', () => {
      // Act
      new PrismaService(mockConfigService);

      // Assert
      const PrismaClientMock = jest.requireMock('@prisma/client').PrismaClient;
      expect(PrismaClientMock).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: TEST_DATABASE_URL,
          },
        },
      });
    });

    it('should handle undefined DATABASE_URL gracefully in PrismaClient construction', () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);

      // Act
      new PrismaService(mockConfigService);

      // Assert
      const PrismaClientMock = jest.requireMock('@prisma/client').PrismaClient;
      expect(PrismaClientMock).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: undefined,
          },
        },
      });
    });
  });

  describe('onModuleInit', () => {
    it('should call $connect on the PrismaClient', async () => {
      // Arrange
      const service = new PrismaService(mockConfigService);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });

    it('should log a warning when DATABASE_URL is not set', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const service = new PrismaService(mockConfigService);
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      await service.onModuleInit();

      // Assert
      expect(warnSpy).toHaveBeenCalledWith('DATABASE_URL is not set');
    });

    it('should log connection info in non-production environment', async () => {
      // Arrange
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      mockConfigService.get.mockReturnValue(TEST_DATABASE_URL);
      const service = new PrismaService(mockConfigService);
      const logSpy = jest.spyOn(service['logger'], 'log');

      // Act
      await service.onModuleInit();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connecting to database at'),
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect', async () => {
      // Arrange
      const service = new PrismaService(mockConfigService);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
