import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService, REDIS_CONFIG_TOKEN, REDIS_CLIENT_TOKEN } from './cache.service';
import { CacheStrategy } from './cache.strategy';
import { createRedisConfig, RedisConfig } from '../../config/redis.config';

/**
 * Global cache module that provides Redis-backed caching across the entire application.
 *
 * Registered as @Global() so that CacheService can be injected into any module
 * without explicit imports.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CONFIG_TOKEN,
      useFactory: (): RedisConfig => createRedisConfig(),
    },
    {
      provide: REDIS_CLIENT_TOKEN,
      useFactory: (_config: RedisConfig) => {
        // The CacheService manages its own Redis client internally.
        // This token is available for modules that need direct client access.
        return null;
      },
      inject: [REDIS_CONFIG_TOKEN],
    },
    CacheService,
    CacheStrategy,
  ],
  exports: [CacheService, CacheStrategy, REDIS_CONFIG_TOKEN, REDIS_CLIENT_TOKEN],
})
export class CacheModule {}
