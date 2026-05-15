import { ModuleMetadata, Type } from "@nestjs/common/interfaces";
import { Test, TestingModuleBuilder } from "@nestjs/testing";
import { checkDockerAvailable } from "./docker-checker";
import { selectInfrastructure, TestModuleOptions } from "./test-infra-selector";

/**
 * RealTestModule — Base class for all NestJS test modules.
 *
 * Automatically detects Docker availability and selects between
 * Testcontainers (real infrastructure) and Fake services (in-memory).
 *
 * USAGE:
 * ```ts
 * // Local TDD (fast, <5s, no Docker required)
 * const module = await RealTestModule.forUnit({
 *   controllers: [MyController],
 *   providers: [MyService],
 * }).compile();
 *
 * // Auto-detect (Docker → real, no Docker → fake)
 * const module = await RealTestModule.forFeature({
 *   controllers: [MyController],
 *   providers: [MyService],
 * }).compile();
 * ```
 */
export class RealTestModule {
  /**
   * Factory method — creates a TestingModule with auto-detected infrastructure.
   *
   * Auto-detects Docker:
   * - Docker available → uses Testcontainers (real PostgreSQL + Redis)
   * - Docker unavailable → uses Fake implementations (in-memory)
   *
   * @param config - NestJS module metadata (controllers, providers, imports)
   * @param options - TestModuleOptions (timeout, schema, fake overrides)
   */
  static async forFeature(
    config: ModuleMetadata,
    options?: TestModuleOptions,
  ): Promise<TestingModuleBuilder> {
    const infraProviders = selectInfrastructure(options);

    const builder = Test.createTestingModule({
      ...config,
      providers: [...(config.providers || []), ...infraProviders],
    });

    return builder;
  }

  /**
   * Force real infrastructure (for CI/CD integration tests).
   * Throws if Docker is not available.
   */
  static async forIntegration(
    config: ModuleMetadata,
  ): Promise<TestingModuleBuilder> {
    if (!process.env.CI) {
      const dockerAvailable = checkDockerAvailable();
      if (!dockerAvailable) {
        console.warn(
          "[RealTestModule] forIntegration called but Docker not available. " +
            "Falling back to fake infrastructure for local development.",
        );
        return RealTestModule.forUnit(config);
      }
    }

    return RealTestModule.forFeature(config, { timeout: 30000 });
  }

  /**
   * Force fake infrastructure (for local TDD RED/GREEN phase).
   * Always succeeds, no Docker required.
   * Uses in-memory FakePrismaClient, LocalJwtSigner, etc.
   */
  static async forUnit(config: ModuleMetadata): Promise<TestingModuleBuilder> {
    const infraProviders = selectInfrastructure({
      fakeOverrides: undefined,
    });

    const builder = Test.createTestingModule({
      ...config,
      providers: [...(config.providers || []), ...infraProviders],
    });

    return builder;
  }
}
