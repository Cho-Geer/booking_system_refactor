import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global E2E test variables
declare global {
  // eslint-disable-next-line no-var
  var app: INestApplication | null;
  // eslint-disable-next-line no-var
  var testSetupComplete: boolean;
}

beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment...');
  
  if (!global.testSetupComplete) {
    // Create testing module
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    // Create NestJS application
    global.app = moduleRef.createNestApplication();
    
    // Configure application
    global.app.enableShutdownHooks();
    
    // Start application
    await global.app.init();
    
    // Wait for application to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    global.testSetupComplete = true;
    console.log('✅ E2E test environment setup completed');
  }
});

afterAll(async () => {
  console.log('🧹 Tearing down E2E test environment...');
  
  if (global.app) {
    try {
      await global.app.close();
      console.log('✅ Application closed');
    } catch (error) {
      console.error('❌ Error closing application:', error);
    }
  }
  
  // Reset global variables
  global.app = null;
  global.testSetupComplete = false;
  
  console.log('✅ E2E test environment teardown completed');
});

// Helper function to get the test application
export function getTestApp(): INestApplication {
  if (!global.app) {
    throw new Error('Test application not initialized. Call beforeAll first.');
  }
  return global.app;
}

// Helper function to get the base URL
export function getBaseUrl(): string {
  return `http://localhost:${process.env.PORT || 3002}`;
}

// Helper function to create test data
export async function createTestUser(app: INestApplication, userData: any) {
  // This would create a test user in the database
  // Implementation depends on your user service
  return {
    id: 'test-user-id',
    email: userData.email || 'test@example.com',
    name: userData.name || 'Test User',
    role: userData.role || 'USER',
  };
}

// Helper function to get auth token
export async function getAuthToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  // This would authenticate and return a JWT token
  // Implementation depends on your auth service
  return 'test-jwt-token-for-e2e-tests';
}

// Test constants
export const TEST_CONSTANTS = {
  USER: {
    email: 'test.user@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  },
  ADMIN: {
    email: 'test.admin@example.com',
    password: 'TestAdminPassword123!',
    name: 'Test Admin',
    role: 'ADMIN',
  },
  SERVICE: {
    name: 'Test Service',
    description: 'Test service description',
    duration: 60,
    price: 50.0,
  },
  TIME_SLOT: {
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
    capacity: 5,
  },
};