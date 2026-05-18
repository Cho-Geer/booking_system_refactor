import { config } from 'dotenv';

// Load .env.test first if it exists
try {
  config({ path: '.env.test' });
} catch (e) {
  // .env.test might not exist yet during global setup
}

// Fallback to .env
config({ path: '.env' });

// Set global test timeout for integration tests
jest.setTimeout(30000);

// Suppress non-critical console output during tests
const originalConsoleLog = console.log;
const originalConsoleDebug = console.debug;

beforeAll(() => {
  console.log = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.debug = originalConsoleDebug;
});
