import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup global test configuration
  console.log('🔧 Setting up test environment...');
  
  // Set test timeout
  jest.setTimeout(10000);
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('🧹 Cleaning up test environment...');
});

// Global test utilities
global.console = {
  ...console,
  // Override console methods if needed for testing
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock Redis client for testing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  }));
});

// Mock bcrypt for faster tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  timeSlot: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Role: {
      USER: 'USER',
      ADMIN: 'ADMIN',
    },
    BookingStatus: {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      CANCELLED: 'CANCELLED',
      COMPLETED: 'COMPLETED',
    },
  };
});

// Export mock objects for use in tests
export { mockPrismaClient };