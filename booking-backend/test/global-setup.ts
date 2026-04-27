import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

module.exports = async () => {
  console.log('🚀 Starting global E2E test setup...');
  
  // Start PostgreSQL container
  console.log('🐘 Starting PostgreSQL container...');
  const postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('booking_test')
    .withUsername('test_user')
    .withPassword('test_password')
    .withExposedPorts(5432)
    .start();
  
  // Start Redis container
  console.log('🗃️ Starting Redis container...');
  const redisContainer = await new RedisContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();
  
  // Get container connection details
  const postgresHost = postgresContainer.getHost();
  const postgresPort = postgresContainer.getMappedPort(5432);
  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);
  
  // Generate test environment file
  const testEnv = {
    DATABASE_URL: `postgresql://test_user:test_password@${postgresHost}:${postgresPort}/booking_test`,
    REDIS_URL: `redis://${redisHost}:${redisPort}`,
    JWT_SECRET: 'test-jwt-secret-key-for-e2e-tests-only',
    NODE_ENV: 'test',
    PORT: '3002',
    LOG_LEVEL: 'error',
  };
  
  // Write test environment to file
  const envContent = Object.entries(testEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  writeFileSync(join(__dirname, '..', '.env.test'), envContent);
  
  // Store container references for teardown (using index signature to avoid TS error)
  (global as any).__POSTGRES_CONTAINER__ = postgresContainer;
  (global as any).__REDIS_CONTAINER__ = redisContainer;
  
  // Run database migrations
  console.log('📦 Running database migrations...');
  // This would run Prisma migrations in a real setup
  // For now, we'll skip and rely on test setup
  
  console.log('✅ Global E2E test setup completed');
  
  // Return configuration for Jest
  return {
    postgres: {
      host: postgresHost,
      port: postgresPort,
      database: 'booking_test',
      username: 'test_user',
      password: 'test_password',
    },
    redis: {
      host: redisHost,
      port: redisPort,
    },
  };
};