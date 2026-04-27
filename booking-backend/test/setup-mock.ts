// Mock setup file for unit tests (skip Testcontainers)
jest.setTimeout(30000);

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.SpyInstance).mockRestore();
});
