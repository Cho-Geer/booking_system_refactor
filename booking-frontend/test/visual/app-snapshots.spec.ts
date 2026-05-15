/**
 * Visual Regression Tests
 *
 * Captures pixel-level screenshots of key pages to detect unintended
 * UI changes. Uses Playwright's `toHaveScreenshot()` for comparison.
 *
 * @see testing-coding-standard.md §11.5 (Visual Regression Testing)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * Helper: Navigate to a page, wait for it to be fully loaded, then capture a screenshot.
 */
async function capturePageScreenshot(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
  // Wait for PrimeNG animations to complete
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot({ fullPage: true });
}

// ==========================================
// Login page
// ==========================================
test.describe('Login page — visual regression', () => {
  test('login page should match snapshot', async ({ page }) => {
    await capturePageScreenshot(page, '/auth/login');
  });

  test('login page with error state should match snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
    // Trigger form validation error
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'short');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot({ fullPage: true });
  });
});

// ==========================================
// Dashboard page (authenticated)
// ==========================================
test.describe('Dashboard page — visual regression', () => {
  test.use({
    // Inject auth state for dashboard page
    storageState: undefined,
  });

  test('dashboard page should match snapshot', async ({ page }) => {
    await capturePageScreenshot(page, '/dashboard');
  });

  test('dashboard page with loading skeleton should match snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    // Capture during loading state (before network idle)
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot({ fullPage: true });
  });
});

// ==========================================
// Booking form page
// ==========================================
test.describe('Booking form page — visual regression', () => {
  test('booking form should match snapshot', async ({ page }) => {
    await capturePageScreenshot(page, '/booking');
  });

  test('booking form with selected service should match snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking`, { waitUntil: 'networkidle' });
    // Simulate user selecting a service
    const serviceCard = page.locator('.service-card').first();
    if (await serviceCard.isVisible()) {
      await serviceCard.click();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveScreenshot({ fullPage: true });
  });
});
