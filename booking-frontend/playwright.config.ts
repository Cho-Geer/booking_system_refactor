import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Visual Regression Testing.
 *
 * @see testing-coding-standard.md §11.5 (Visual Regression Testing)
 * @see testing-coding-standard.md §12 (CI/CD quality gates, Stage 5)
 */
export default defineConfig({
  testDir: './test/visual',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Visual comparison settings
  // Pixelmatch threshold: 0.1 means 0.1% of pixels can differ
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.1,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
