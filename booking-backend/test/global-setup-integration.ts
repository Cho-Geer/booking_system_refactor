import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Type declarations for global container references
declare global {
  // eslint-disable-next-line no-var
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer;
  // eslint-disable-next-line no-var
  var __REDIS_CONTAINER__: StartedRedisContainer;
}

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedRedisContainer } from '@testcontainers/redis';

config();

module.exports = async () => {
  console.log('🚀 Starting integration test infrastructure...');

  // Start PostgreSQL container
  console.log('🐘 Starting PostgreSQL container...');
  const postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('booking_integration')
    .withUsername('test_user')
    .withPassword('test_password')
    .withExposedPorts(5432)
    .start();

  // Start Redis container
  console.log('🗃️ Starting Redis container...');
  const redisContainer = await new RedisContainer('redis:7-alpine').withExposedPorts(6379).start();

  const postgresHost = postgresContainer.getHost();
  const postgresPort = postgresContainer.getMappedPort(5432);
  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);

  const databaseUrl = `postgresql://test_user:test_password@${postgresHost}:${postgresPort}/booking_integration`;
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  // Also set DATABASE_URL directly as environment variable for Prisma
  process.env.DATABASE_URL = databaseUrl;

  console.log(`📡 PostgreSQL: ${databaseUrl}`);
  console.log(`📡 Redis: ${redisUrl}`);

  // Write .env.test file for integration tests
  const testEnv = {
    DATABASE_URL: databaseUrl,
    REDIS_HOST: redisHost,
    REDIS_PORT: String(redisPort),
    REDIS_URL: redisUrl,
    JWT_SECRET: 'test-jwt-secret-key-for-integration-tests',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-integration-tests',
    PII_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    PII_HASH_PEPPER: 'test-pepper-for-integration-tests-only',
    NODE_ENV: 'test',
    PORT: '3003',
    LOG_LEVEL: 'error',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_USER: 'test',
    SMTP_PASS: 'test',
    SMTP_FROM: 'test@example.com',
  };

  const envContent = Object.entries(testEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  writeFileSync(join(__dirname, '..', '.env.test'), envContent);
  console.log('✅ .env.test file written');

  // Run Prisma migrations
  console.log('📦 Running Prisma migrations...');
  try {
    execSync(`npx prisma migrate deploy`, {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }

  // Store container references for teardown
  global.__POSTGRES_CONTAINER__ = postgresContainer;
  global.__REDIS_CONTAINER__ = redisContainer;

  console.log('✅ Integration test infrastructure ready');

  return {
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    REDIS_HOST: redisHost,
    REDIS_PORT: redisPort,
  };
};
