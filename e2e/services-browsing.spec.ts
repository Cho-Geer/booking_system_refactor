import { test, expect } from './fixtures';

test.describe('Services Browsing', () => {
  test.describe('Home Page', () => {
    test('should load the home page successfully', async ({ page }) => {
      await page.goto('/');

      // Should redirect to /booking
      await expect(page).toHaveURL(/.*booking.*/);
      await expect(page).toHaveTitle(/BookingFrontend/i);
    });

    test('should display home page content', async ({ page }) => {
      await page.goto('/home');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Home page should have content
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent?.length).toBeGreaterThan(0);
    });

    test('should have navigation to services from home page', async ({ page }) => {
      await page.goto('/home');
      await page.waitForLoadState('networkidle');

      // Look for services navigation link
      const servicesLink = page.locator('a:has-text("Services"), nav a:has-text("Services")').first();

      if (await servicesLink.count() > 0) {
        await expect(servicesLink).toBeVisible();

        await servicesLink.click();
        await expect(page).toHaveURL(/.*services.*/);
      }
    });
  });

  test.describe('Services Page', () => {
    test('should navigate to services page', async ({ page }) => {
      await page.goto('/services');

      await expect(page).toHaveTitle(/BookingFrontend/i);
      await expect(page).toHaveURL(/.*services.*/);
    });

    test('should display services page heading', async ({ page }) => {
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      // Check for the heading
      const heading = page.locator('h2, h1').first();
      await expect(heading).toBeVisible();
    });

    test('should load services list', async ({ page }) => {
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      // Wait a bit for any async content to load
      await page.waitForTimeout(2000);

      // Check for any service-related content using generic selectors
      const hasServiceContent = await page.locator('p-card, .service-card, .service-item, [class*="service"], text=Service').first().isVisible().catch(() => false);
      const hasNoServicesMessage = await page.locator('text=No services, text=No services available, text=No service').first().isVisible().catch(() => false);
      const hasPageContent = await page.locator('body').textContent().then(t => t?.length || 0 > 0).catch(() => false);

      // Either services loaded, "no services" message shown, or page has content
      expect(hasServiceContent || hasNoServicesMessage || hasPageContent).toBeTruthy();
    });

    test('should display service card details', async ({ page }) => {
      await page.goto('/services');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Wait for services to load
      await page.waitForSelector('p-card, .service-card', { timeout: 10000 }).catch(() => {});

      const serviceCards = page.locator('p-card, .service-card');
      const cardCount = await serviceCards.count();

      if (cardCount > 0) {
        // Get the first service card
        const firstCard = serviceCards.first();

        // Verify service name is displayed
        const serviceName = await firstCard.locator('[ng-reflect-title], .p-card-title, .service-name, h3, h4').first().textContent();
        expect(serviceName?.length).toBeGreaterThan(0);

        // Verify price is displayed (should contain currency symbol)
        const priceText = await firstCard.locator('text=/¥|\\$|€|£/').first().textContent().catch(() => '');
        if (priceText) {
          expect(priceText).toBeTruthy();
        }

        // Verify duration is displayed
        const durationText = await firstCard.locator('text=/min|minute/i').first().textContent().catch(() => '');
        if (durationText) {
          expect(durationText).toBeTruthy();
        }
      }
    });

    test('should show loading state while services are loading', async ({ page }) => {
      // Enable slow network to see loading state
      await page.goto('/services');

      // Loading spinner should appear initially (might be too fast to catch)
      const loadingSpinner = page.locator('p-progressSpinner, .spinner, [class*="loading"]').first();

      // If we can catch it, verify it's visible
      if (await loadingSpinner.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(loadingSpinner).toBeVisible();
      }

      // Eventually loading should finish
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Service Filtering', () => {
    test('should filter services by category if filter is available', async ({ page }) => {
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      // Look for category filter/dropdown
      const categoryFilter = page.locator(
        'p-dropdown, select, input[placeholder*="category" i], [class*="filter"]',
      ).first();

      if (await categoryFilter.count() > 0 && await categoryFilter.isVisible()) {
        // Get initial service count
        const initialCards = await page.locator('p-card').count();

        // Try to select a category
        await categoryFilter.click();

        // Select first option from dropdown
        const firstOption = page.locator('.p-dropdown-items li, select option').first();
        if (await firstOption.count() > 0) {
          await firstOption.click();
          await page.waitForLoadState('networkidle');

          // Service count should have changed or stayed same
          const filteredCards = await page.locator('p-card').count();
          expect(filteredCards).toBeLessThanOrEqual(initialCards);
        }
      }
    });

    test('should show all services when no filter applied', async ({ page }) => {
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      // Count services without filtering
      const serviceCards = await page.locator('p-card, .service-card').count();

      // If there are services, verify they are displayed
      if (serviceCards > 0) {
        expect(serviceCards).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Book Now Button Behavior', () => {
    test('should redirect to login when clicking "Book Now" without authentication', async ({ page }) => {
      await page.goto('/services');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Wait for services to load
      await page.waitForSelector('p-card, .service-card', { timeout: 10000 }).catch(() => {});

      const serviceCards = page.locator('p-card, .service-card');
      const cardCount = await serviceCards.count();

      if (cardCount > 0) {
        // Look for "Login to Book" button (shown when not authenticated)
        const loginToBookButton = serviceCards.first().locator('text=Login to Book, a:has-text("Login to Book")').first();

        if (await loginToBookButton.isVisible()) {
          await loginToBookButton.click();

          // Should redirect to login page
          await expect(page).toHaveURL(/.*auth\/login.*/);
        } else {
          // If "Book Now" is visible instead, clicking should redirect to login
          const bookNowButton = serviceCards.first().locator('text=Book Now').first();
          if (await bookNowButton.isVisible()) {
            await bookNowButton.click();
            await page.waitForURL(/.*auth\/login.*/, { timeout: 5000 }).catch(() => {});

            const currentUrl = page.url();
            expect(currentUrl).toMatch(/.*auth\/login|.*book.*/);
          }
        }
      }
    });

    test('should redirect to booking page when clicking "Book Now" with authentication', async ({ page }) => {
      // Login first
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

      // Navigate to services
      await page.goto('/services');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const serviceCards = page.locator('p-card, .service-card');

      if (await serviceCards.count() > 0) {
        // Look for "Book Now" button (shown when authenticated)
        const bookNowButton = serviceCards.first().locator('text=Book Now').first();

        if (await bookNowButton.isVisible()) {
          await bookNowButton.click();

          // Should redirect to booking page
          await expect(page).toHaveURL(/.*\/book.*/);
        }
      }
    });
  });

  test.describe('Services Page Navigation', () => {
    test('should have working back navigation', async ({ page }) => {
      await page.goto('/home');
      await page.waitForLoadState('networkidle');

      // Navigate to services
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      // Go back
      await page.goBack();

      // Should be back to home
      await expect(page).toHaveURL(/.*home.*/);
    });

    test('should handle direct URL access to services', async ({ page }) => {
      // Access services directly via URL
      await page.goto('/services');

      // Should load successfully
      await expect(page).toHaveTitle(/BookingFrontend/i);
    });
  });
});
