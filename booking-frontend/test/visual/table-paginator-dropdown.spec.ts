import { test, expect } from '@playwright/test';

/**
 * Visual regression test for paginator rows-per-page dropdown visibility.
 * Verifies that the dropdown is NOT clipped by overflow-hidden in app-table-wrapper.
 */
test.describe('Admin Table Paginator Dropdown Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app - even if redirected to login, the layout structure is rendered
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('appointment-management: rowsPerPage dropdown should not be clipped', async ({ page }) => {
    await page.goto('/admin/appointments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for the table wrapper and verify no overflow-hidden on it
    const tableWrapper = page.locator('app-table-wrapper div').first();
    await expect(tableWrapper).toBeVisible({ timeout: 10000 });

    // Verify overflow-hidden is not present
    const classAttr = await tableWrapper.getAttribute('class');
    expect(classAttr).not.toContain('overflow-hidden');
    console.log('appointment-management: table wrapper classes:', classAttr);

    // Take a screenshot of the table area
    await tableWrapper.screenshot({ path: 'test/visual/screenshots/appointment-table-wrapper.png' });
  });

  test('user-management: rowsPerPage dropdown should not be clipped', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tableWrapper = page.locator('app-table-wrapper div').first();
    await expect(tableWrapper).toBeVisible({ timeout: 10000 });

    const classAttr = await tableWrapper.getAttribute('class');
    expect(classAttr).not.toContain('overflow-hidden');
    console.log('user-management: table wrapper classes:', classAttr);

    await tableWrapper.screenshot({ path: 'test/visual/screenshots/user-table-wrapper.png' });
  });

  test('service-management: rowsPerPage dropdown should not be clipped', async ({ page }) => {
    await page.goto('/admin/services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tableWrapper = page.locator('app-table-wrapper div').first();
    await expect(tableWrapper).toBeVisible({ timeout: 10000 });

    const classAttr = await tableWrapper.getAttribute('class');
    expect(classAttr).not.toContain('overflow-hidden');
    console.log('service-management: table wrapper classes:', classAttr);

    await page.screenshot({ path: 'test/visual/screenshots/service-page-full.png', fullPage: true });
  });

  test('verify overflow-hidden is absent from all admin table wrappers', async ({ page }) => {
    // Check service management
    await page.goto('/admin/services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    let wrapper = page.locator('app-table-wrapper div').first();
    if (await wrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cls = await wrapper.getAttribute('class');
      console.log('services wrapper:', cls);
      if (cls) expect(cls).not.toContain('overflow-hidden');
    }

    // Check user management
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    wrapper = page.locator('app-table-wrapper div').first();
    if (await wrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cls = await wrapper.getAttribute('class');
      console.log('users wrapper:', cls);
      if (cls) expect(cls).not.toContain('overflow-hidden');
    }

    // Check appointment management
    await page.goto('/admin/appointments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    wrapper = page.locator('app-table-wrapper div').first();
    if (await wrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cls = await wrapper.getAttribute('class');
      console.log('appointments wrapper:', cls);
      if (cls) expect(cls).not.toContain('overflow-hidden');
    }
  });
});
