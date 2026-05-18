import { Provider, Type } from '@nestjs/common';
import { checkDockerAvailable, resetDockerCache as resetDocker } from './docker-checker';
import { FakePrismaClient } from '../fakes/fake-prisma-client';
import { LocalJwtSigner } from '../fakes/local-jwt-signer';

// Re-export resetDockerCache for convenience
export const resetDockerCache = resetDocker;

/**
 * Options for test infrastructure selection.
 */
export interface TestModuleOptions {
  /** Test timeout in ms (default: 10000 for fake, 30000 for real) */
  timeout?: number;
  /** Database schema name for isolation (default: worker_{jestWorkerId}) */
  schema?: string;
  /** Override specific fake implementations for testing */
  fakeOverrides?: Partial<FakeInfrastructureMap>;
}

/**
 * Map of service tokens to their fake implementations.
 */
export interface FakeInfrastructureMap {
  prismaService: Type<any>;
  jwtService: Type<any>;
  queueService: Type<any>;
  eventBus: Type<any>;
  rateLimiter: Type<any>;
}

/**
 * Selects between real and fake infrastructure providers based on Docker availability.
 *
 * Returns an array of NestJS Provider definitions to be merged into the
 * TestingModule configuration.
 *
 * @param options - Optional configuration overrides
 * @returns Array of NestJS providers for the selected infrastructure mode
 */
export function selectInfrastructure(options?: TestModuleOptions): Provider[] {
  const useReal = checkDockerAvailable();
  const schema = options?.schema || `worker_${process.env.JEST_WORKER_ID || '0'}`;

  if (useReal) {
    return getRealInfrastructureProviders(schema);
  }

  return getFakeInfrastructureProviders(options?.fakeOverrides);
}

/**
 * Get real infrastructure providers using Testcontainers.
 */
function getRealInfrastructureProviders(schema: string): Provider[] {
  // Real providers — these connect to actual Testcontainers
  return [
    // PrismaService uses the real PrismaClient with schema-qualified URL
    // ContainerPool handles schema creation via global setup
    {
      provide: 'SCHEMA_NAME',
      useValue: schema,
    },
    // Real Redis provider (via ioredis)
    {
      provide: 'REDIS_CONFIG',
      useFactory: () => ({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      }),
    },
  ];
}

/**
 * Get fake infrastructure providers for local TDD without Docker.
 */
function getFakeInfrastructureProviders(overrides?: Partial<FakeInfrastructureMap>): Provider[] {
  const fakePrisma = overrides?.prismaService
    ? { provide: 'PrismaService', useClass: overrides.prismaService }
    : { provide: 'PrismaService', useClass: FakePrismaClient };

  const fakeJwt = overrides?.jwtService
    ? { provide: 'JwtService', useClass: overrides.jwtService }
    : { provide: 'JwtService', useClass: LocalJwtSigner };

  return [
    fakePrisma,
    fakeJwt,
    // Additional fake providers can be added as needed
    { provide: 'FAKE_MODE', useValue: true },
  ];
}
