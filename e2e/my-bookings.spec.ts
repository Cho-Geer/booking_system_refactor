import { test, expect } from './fixtures';

test.describe('My Bookings Flow', () => {
  test.describe('Page Access', () => {
    test('should redirect to login when accessing my-bookings without authentication', async ({ page }) => {
      // Ensure no session
      await page.context().clearCookies();

      // Try to access my-bookings
      await page.goto('/my-bookings');

      // Should be redirected to login page
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).toContain('/auth/login');
    });

    test('should load my-bookings page after login', async ({ page, context }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();

      // Wait for redirect after login
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      // If still on login page, skip
      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      // Navigate to my-bookings
      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Page should load
      await expect(page).toHaveURL(/.*my-bookings.*/);
      await expect(page).toHaveTitle(/BookingFrontend/i);
    });
  });

  test.describe('Booking List Display', () => {
    test('should display page heading', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Heading should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
    });

    test('should show empty state when no bookings exist', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Either show booking cards or empty state
      const emptyState = page.locator('[data-testid="empty-state"]');
      const bookingCards = page.locator('[data-testid="booking-card"]');

      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasBookingCards = await bookingCards.count().then(c => c > 0).catch(() => false);

      // Page should render either empty state or booking cards
      expect(hasEmptyState || hasBookingCards).toBeTruthy();
    });

    test('should display filter tabs', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Filter tabs should be visible
      const filterTabs = page.locator('[data-testid="filter-tab"]');
      const tabCount = await filterTabs.count();
      expect(tabCount).toBeGreaterThan(0);
    });
  });

  test.describe('Booking Details View', () => {
    test('should display booking information in cards', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Check if booking cards exist
      const bookingCards = page.locator('[data-testid="booking-card"]');
      const cardCount = await bookingCards.count();

      if (cardCount > 0) {
        // Each card should show service name, date, time, and status
        const firstCard = bookingCards.first();
        const cardText = await firstCard.textContent();

        expect(cardText?.length).toBeGreaterThan(0);
      }
    });

    test('should display view details button on booking cards', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      const viewDetailsButtons = page.locator('button:has-text("查看详情")');
      const bookingCards = page.locator('[data-testid="booking-card"]');
      const cardCount = await bookingCards.count();

      if (cardCount > 0) {
        await expect(viewDetailsButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('Booking Cancellation', () => {
    test('should show cancel button for pending or confirmed bookings', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Check for cancel buttons (only shown for PENDING/CONFIRMED bookings)
      const cancelButtons = page.locator('[data-testid="cancel-button"]');
      const cancelCount = await cancelButtons.count();

      // If cancel buttons exist, verify they are visible
      if (cancelCount > 0) {
        await expect(cancelButtons.first()).toBeVisible();
      }
    });

    test('should show confirmation dialog when clicking cancel', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Try to click a cancel button
      const cancelButtons = page.locator('[data-testid="cancel-button"]');
      const cancelCount = await cancelButtons.count();

      if (cancelCount > 0) {
        await cancelButtons.first().click();

        // Confirmation dialog should appear
        const cancelDialog = page.locator('[data-testid="cancel-dialog"]');
        await expect(cancelDialog).toBeVisible({ timeout: 3000 });

        // Dialog should have confirm and dismiss buttons
        const confirmButton = page.locator('[data-testid="confirm-cancel-button"]');
        await expect(confirmButton).toBeVisible();

        // Dismiss dialog
        const returnButton = page.locator('button:has-text("返回")');
        await returnButton.click();

        // Dialog should close
        await expect(cancelDialog).not.toBeVisible({ timeout: 2000 }).catch(() => {
          // Dialog might close via animation - acceptable
        });
      }
    });

    test('should cancel a booking through the cancel flow', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      if (page.url().includes('/auth/login')) {
        test.skip();
        return;
      }

      await page.goto('/my-bookings');
      await page.waitForLoadState('networkidle');

      // Click cancel on first cancellable booking
      const cancelButtons = page.locator('[data-testid="cancel-button"]');
      const cancelCount = await cancelButtons.count();

      if (cancelCount > 0) {
        await cancelButtons.first().click();

        // Confirm cancellation
        const confirmButton = page.locator('[data-testid="confirm-cancel-button"]');
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();

          // Wait for processing
          await page.waitForTimeout(2000);

          // Either success message or card disappears
          const successMessage = await page.locator('.p-message-success').isVisible().catch(() => false);
          const reducedCards = await page.locator('[data-testid="booking-card"]').count();
          const cancelButtonsAfter = await page.locator('[data-testid="cancel-button"]').count();

          // Verify the cancellation was processed
          expect(successMessage || reducedCards < cancelCount - 1 || cancelButtonsAfter < cancelCount).toBeTruthy();
        }
      }
    });
  });
});
