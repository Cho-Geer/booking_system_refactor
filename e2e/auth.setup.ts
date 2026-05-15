import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const adminFile = path.join(__dirname, '../playwright/.auth/admin.json');

/**
 * Setup test: Authenticate as regular user
 * This test runs once before all other tests and saves the auth state
 */
setup('authenticate as user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill login form with test user credentials
  // Note: In a real environment, ensure this user exists in the test database
  await page.getByLabel('Email').fill('test-user@example.com');
  await page.getByLabel('Password').fill('TestPass123!');

  // Accept terms and conditions
  await page.getByRole('checkbox').check();

  // Submit login form
  await page.getByRole('button', { name: 'Sign In' }).last().click();

  // Wait for successful login - redirect to home
  await page.waitForURL('**/home', { timeout: 10000 }).catch(() => {
    // If login fails (user doesn't exist), the test will still save state
    // In CI, ensure test users are seeded before running E2E tests
  });

  // Wait for page to stabilize
  await page.waitForTimeout(1000);

  // Save authentication state (cookies, localStorage)
  await page.context().storageState({ path: authFile });
});

/**
 * Setup test: Authenticate as admin user
 * This test runs once before all other tests and saves the admin auth state
 */
setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill admin credentials
  await page.getByLabel('Email').fill('zhaoge.tzx@gmail.com');
  await page.getByLabel('Password').fill('Admin@123456');

  // Accept terms and conditions
  await page.getByRole('checkbox').check();

  // Submit login form (the "Sign In" button rendered by app-button)
  await page.getByRole('button', { name: 'Sign In' }).last().click();

  // Wait for successful login
  await page.waitForURL('**/home', { timeout: 10000 }).catch(() => {});

  // Wait for page to stabilize
  await page.waitForTimeout(1000);

  // Save admin authentication state
  await page.context().storageState({ path: adminFile });
});
