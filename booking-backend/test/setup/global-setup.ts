import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { join } from 'path';
import { writeFileSync } from 'fs';

// Type declarations for global container references
declare global {
  // eslint-disable-next-line no-var
  var __POSTGRES_CONTAINER__: import('@testcontainers/postgresql').StartedPostgreSqlContainer;
  // eslint-disable-next-line no-var
  var __REDIS_CONTAINER__: import('@testcontainers/redis').StartedRedisContainer;
}

/**
 * Check if Docker is available
 */
function checkDockerAvailability(): void {
  try {
    execSync('docker info', { stdio: 'ignore' });
    console.log('Docker is available');
  } catch {
    throw new Error(
      'Docker is not available. Testcontainers requires Docker to be running.\n' +
        'Please ensure Docker Desktop or Docker Engine is installed and running.',
    );
  }
}

/**
 * Global Jest setup that starts PostgreSQL and Redis containers once for the entire test suite.
 * Containers are shared across all test files to avoid startup overhead.
 */
module.exports = async () => {
  console.log('[GlobalSetup] Starting testcontainers infrastructure...');

  // Verify Docker is available
  checkDockerAvailability();

  // Start PostgreSQL container
  console.log('[GlobalSetup] Starting PostgreSQL container...');
  const postgresContainer = await new PostgreSqlContainer('postgres:16')
    .withDatabase('booking_test')
    .withUsername('test_user')
    .withPassword('test_password')
    .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
    .withExposedPorts(5432)
    .withCommand(['postgres', '-c', 'log_statement=all'])
    .start();

  const postgresHost = postgresContainer.getHost();
  const postgresPort = postgresContainer.getMappedPort(5432);
  const databaseUrl = `postgresql://test_user:test_password@${postgresHost}:${postgresPort}/booking_test`;

  console.log(`[GlobalSetup] PostgreSQL started at ${postgresHost}:${postgresPort}`);

  // Install uuid-ossp extension in the test PostgreSQL container
  console.log('[GlobalSetup] Installing uuid-ossp extension...');
  try {
    execSync(
      `docker exec ${postgresContainer.getName()} apt-get update -qq && docker exec ${postgresContainer.getName()} apt-get install -y -qq postgresql-16-uuid-ossp 2>/dev/null || true`,
      { stdio: 'ignore', timeout: 60000 },
    );
  } catch {
    // Try alternative approach for postgres images that don't need apt-get
    console.log('[GlobalSetup] Extension installation skipped or failed, trying alternative...');
  }

  // Start Redis container
  console.log('[GlobalSetup] Starting Redis container...');
  const redisContainer = await new RedisContainer('redis:7-alpine').withExposedPorts(6379).start();

  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  console.log(`[GlobalSetup] Redis started at ${redisHost}:${redisPort}`);

  // Run Prisma migrations
  console.log('[GlobalSetup] Running Prisma migrations...');
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
      cwd: join(__dirname, '..', '..'),
    });
    console.log('[GlobalSetup] Migrations applied successfully');
  } catch (error) {
    console.error(
      '[GlobalSetup] Migration failed:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }

  // Generate .env.test file
  const testEnv = {
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    REDIS_HOST: redisHost,
    REDIS_PORT: String(redisPort),
    JWT_SECRET: 'test-jwt-secret-key-for-unit-tests-only',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-unit-tests-only',
    PII_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64-char hex = 32 bytes
    PII_HASH_PEPPER: 'test-pepper-for-integration-tests-only',
    NODE_ENV: 'test',
    PORT: '3002',
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

  writeFileSync(join(__dirname, '..', '..', '.env.test'), envContent);
  console.log('[GlobalSetup] .env.test file written');

  // Store container references globally for teardown
  global.__POSTGRES_CONTAINER__ = postgresContainer;
  global.__REDIS_CONTAINER__ = redisContainer;

  console.log('[GlobalSetup] Testcontainers infrastructure ready');

  return {
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    REDIS_HOST: redisHost,
    REDIS_PORT: redisPort,
  };
};
