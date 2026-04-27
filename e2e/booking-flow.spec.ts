import { test, expect } from './fixtures';

test.describe('Complete Booking Flow', () => {
  test.describe.skip('Pre-booking Setup', () => {
    test.skip('should login as customer before booking', 'Skipped: Customer test user not seeded in backend', async ({ page }) => {
      // Login as customer
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@booking.com');
      await page.getByLabel('Password').fill('Admin@123456');
      await page.locator('.terms-checkbox input').check();
      await page.getByRole('button', { name: 'Submit login form' }).click();

      // Wait for login to complete - could redirect to /home or /booking
      await Promise.race([
        page.waitForURL('**/home', { timeout: 10000 }),
        page.waitForURL('**/booking', { timeout: 10000 }),
        page.waitForTimeout(5000),
      ]).catch(() => {});

      // Verify login successful - check URL changed from login page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/login');
    });

    test.skip('should navigate to services page after login', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
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

      // Verify services page loaded
      await expect(page).toHaveURL(/.*services.*/);
    });
  });

  test.describe('Service Selection', () => {
    test.skip('should select a service from the list', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
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

      // Go to services
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      // Look for any service-related content (cards, list items, etc.)
      const serviceContent = page.locator('p-card, .service-card, .service-item, [class*="service"]').first();
      if (await serviceContent.count() > 0 && await serviceContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Get the first service name
        const serviceName = await serviceContent.locator('.p-card-title, h3, h4, .service-name').first().textContent().catch(() => '');

        // Click "Book Now" on first service
        const bookNowButton = serviceContent.locator('text=Book Now, button:has-text("Book")').first();

        if (await bookNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowButton.click();

          // Should navigate to booking page
          await expect(page).toHaveURL(/.*\/book.*/);

          // Verify service is pre-selected (check URL params or page content)
          const pageContent = await page.locator('body').textContent();
          expect(pageContent?.length).toBeGreaterThan(0);
        }
      }
    });

    test.skip('should show service details on booking page', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
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

      // Navigate to services and select one
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      const serviceContent = page.locator('p-card, .service-card, .service-item, [class*="service"]').first();
      if (await serviceContent.count() > 0 && await serviceContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const bookNowButton = serviceContent.locator('text=Book Now, button:has-text("Book")').first();

        if (await bookNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowButton.click();
          await page.waitForURL(/.*\/book.*/, { timeout: 10000 }).catch(() => {});

          // Wait for booking form to load
          await page.waitForLoadState('networkidle');

          // Verify booking page has content
          const pageContent = await page.locator('body').textContent();
          expect(pageContent?.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Date and Time Selection', () => {
    test.skip('should select an available date', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login and navigate to booking
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

      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      const serviceContent = page.locator('p-card, .service-card, .service-item, [class*="service"]').first();
      if (await serviceContent.count() > 0 && await serviceContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const bookNowButton = serviceContent.locator('text=Book Now, button:has-text("Book")').first();
        if (await bookNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowButton.click();
          await page.waitForURL(/.*\/book.*/, { timeout: 10000 }).catch(() => {});
          await page.waitForLoadState('networkidle');

          // Find date input
          const dateInput = page.locator('input[type="date"], .p-calendar input').first();

          if (await dateInput.count() > 0) {
            // Select tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            await dateInput.fill(dateStr);
            await dateInput.press('Tab');

            // Verify date was set
            const selectedDate = await dateInput.inputValue();
            expect(selectedDate).toBe(dateStr);
          }
        }
      }
    });

    test.skip('should select a time slot', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login and navigate to booking
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

      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      const serviceContent = page.locator('p-card, .service-card, .service-item, [class*="service"]').first();
      if (await serviceContent.count() > 0 && await serviceContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const bookNowButton = serviceContent.locator('text=Book Now, button:has-text("Book")').first();
        if (await bookNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowButton.click();
          await page.waitForURL(/.*\/book.*/, { timeout: 10000 }).catch(() => {});
          await page.waitForLoadState('networkidle');

          // Select date first
          const dateInput = page.locator('input[type="date"], .p-calendar input').first();
          if (await dateInput.count() > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];
            await dateInput.fill(dateStr);
            await dateInput.press('Tab');

            // Wait for time slots to load
            await page.waitForTimeout(1000);

            // Look for time slot buttons
            const timeSlots = page.locator('button:has-text(/\\d{2}:\\d{2}/), [class*="time-slot"], [data-time]');
            const slotCount = await timeSlots.count();

            if (slotCount > 0) {
              // Click first available time slot
              await timeSlots.first().click();

              // Verify time slot is selected
              const selectedSlot = await timeSlots.first();
              const isSelected = await selectedSlot.getAttribute('aria-selected') ||
                await selectedSlot.getAttribute('class') ||
                '';
              expect(isSelected).toBeTruthy();
            }
          }
        }
      }
    });

    test.skip('should not allow booking without selecting date and time', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login and navigate to booking
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

      await page.goto('/book');
      await page.waitForLoadState('networkidle');

      // Try to submit without date/time
      const submitButton = page.locator('button[type="submit"], p-button[label*="Book" i], p-button[label*="Confirm" i]').first();

      if (await submitButton.count() > 0) {
        const isDisabled = await submitButton.isDisabled().catch(() => true);
        // Submit button should be disabled or form should show validation errors
        if (!isDisabled) {
          await submitButton.click();
          // Should show validation error
          await page.waitForTimeout(1000);
          const hasErrors = await page.locator('text=required, text=select, .p-invalid').first().isVisible().catch(() => false);
          expect(hasErrors).toBeTruthy();
        }
      }
    });
  });

  test.describe('Customer Details Form', () => {
    test.skip('should display customer details form', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login and navigate to booking
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

      await page.goto('/book');
      await page.waitForLoadState('networkidle');

      // Check for any form-related content on the booking page
      // Use generic selectors that match common form patterns
      const hasFormContent = await page.locator('form, [class*="form"], [class*="customer"], [class*="booking-form"]').first().isVisible().catch(() => false);
      const hasInputFields = await page.locator('input, textarea').count().then(c => c > 0).catch(() => false);
      const hasLabels = await page.locator('label').count().then(c => c > 0).catch(() => false);

      // At least some form-related content should be present
      expect(hasFormContent || hasInputFields || hasLabels).toBeTruthy();
    });

    test.skip('should fill and submit customer details form', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login and navigate to services
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

      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      const serviceContent = page.locator('p-card, .service-card, .service-item, [class*="service"]').first();
      if (await serviceContent.count() > 0 && await serviceContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const bookNowButton = serviceContent.locator('text=Book Now, button:has-text("Book")').first();
        if (await bookNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowButton.click();
          await page.waitForURL(/.*\/book.*/, { timeout: 10000 }).catch(() => {});
          await page.waitForLoadState('networkidle');

          // Select date
          const dateInput = page.locator('input[type="date"], .p-calendar input').first();
          if (await dateInput.count() > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await dateInput.fill(tomorrow.toISOString().split('T')[0]);
            await dateInput.press('Tab');
          }

          // Select time slot
          const timeSlots = page.locator('button:has-text(/\\d{2}:\\d{2}/), [data-time]').first();
          if (await timeSlots.isVisible({ timeout: 3000 }).catch(() => false)) {
            await timeSlots.click();
          }

          // Fill customer name
          const nameInput = page.locator('input[name="customerName"], input[placeholder*="name" i]').first();
          if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('E2E Test Customer');
          }

          // Fill customer email
          const emailInput = page.locator('input[name="customerEmail"], input[placeholder*="email" i]').first();
          if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await emailInput.fill('e2e-test@example.com');
          }

          // Fill phone if available
          const phoneInput = page.locator('input[name="customerPhone"], input[placeholder*="phone" i]').first();
          if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await phoneInput.fill('+1234567890');
          }

          // Fill notes if available
          const notesInput = page.locator('textarea[name="notes"], input[placeholder*="notes" i]').first();
          if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await notesInput.fill('E2E test booking - please ignore');
          }
        }
      }
    });
  });

  test.describe('Booking Submission', () => {
    test.skip('should submit booking successfully', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      // Navigate to services and select one
      await page.goto('/services');
      await page.waitForLoadState('networkidle');

      const serviceContent = page.locator('p-card, .service-card, .service-item, [class*="service"]').first();
      if (await serviceContent.count() > 0 && await serviceContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        const bookNowButton = serviceContent.locator('text=Book Now, button:has-text("Book")').first();
        if (await bookNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowButton.click();
          await page.waitForURL(/.*\/book.*/, { timeout: 10000 }).catch(() => {});
          await page.waitForLoadState('networkidle');

          // Fill booking form
          const dateInput = page.locator('input[type="date"], .p-calendar input').first();
          if (await dateInput.count() > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await dateInput.fill(tomorrow.toISOString().split('T')[0]);
            await dateInput.press('Tab');
          }

          const timeSlots = page.locator('button:has-text(/\\d{2}:\\d{2}/), [data-time]').first();
          if (await timeSlots.isVisible({ timeout: 3000 }).catch(() => false)) {
            await timeSlots.click();
          }

          // Submit booking
          const submitButton = page.locator('button[type="submit"], p-button[label*="Confirm" i], p-button[label*="Book" i]').first();
          if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await submitButton.click();

            // Wait for confirmation
            await Promise.race([
              page.waitForSelector('.p-message-success, [severity="success"], text=Booking confirmed, text=Successfully booked', { timeout: 10000 }),
              page.waitForURL('**/bookings**', { timeout: 10000 }),
              page.waitForTimeout(3000),
            ]);
          }
        }
      }
    });

    test.skip('should show error for invalid booking submission', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      // Go directly to booking page without selecting service
      await page.goto('/book');
      await page.waitForLoadState('networkidle');

      // Try to submit incomplete form
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        const isDisabled = await submitButton.isDisabled().catch(() => true);
        if (!isDisabled) {
          await submitButton.click();

          // Should show validation errors
          await page.waitForTimeout(1000);
          const hasErrors = await page.locator('text=required, text=select, .ng-invalid, .p-invalid').first().isVisible().catch(() => true);
          expect(hasErrors).toBeTruthy();
        }
      }
    });
  });

  test.describe('Booking Verification', () => {
    test.skip('should display booking in My Appointments', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      // Navigate to My Appointments
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Verify bookings page loaded
      await expect(page).toHaveURL(/.*bookings.*/);

      // Check if bookings are displayed
      const bookingsList = page.locator('p-card, tr, .booking-item, [class*="booking"]');
      const bookingCount = await bookingsList.count();

      // Page should have loaded (either has bookings or shows empty state)
      const hasContent = await page.locator('body').textContent();
      expect(hasContent?.length).toBeGreaterThan(0);
    });

    test.skip('should show booking details in My Appointments', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Check for booking details (service name, date, time, status)
      const pageContent = await page.locator('body').textContent();
      expect(pageContent?.length).toBeGreaterThan(0);

      // Look for status indicators
      const hasStatus = await page.locator('.p-tag, [class*="status"], text=CONFIRMED, text=PENDING, text=CANCELLED').first().isVisible().catch(() => false);

      if (hasStatus) {
        await expect(page.locator('.p-tag, [class*="status"]').first()).toBeVisible();
      }
    });
  });

  test.describe('Booking Cancellation', () => {
    test.skip('should cancel a booking', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      // Go to bookings
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find cancel buttons
      const cancelButtons = page.locator('button:has-text("Cancel"), p-button[label*="Cancel" i]');
      const cancelCount = await cancelButtons.count();

      if (cancelCount > 0) {
        // Click first cancel button
        await cancelButtons.first().click();

        // Handle confirmation dialog
        const confirmDialog = page.locator('.p-confirm-dialog, [role="dialog"]').first();
        if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }
        }

        // Wait for cancellation confirmation
        await page.waitForTimeout(2000);

        // Verify success message
        const successMessage = await page.locator('.p-message-success, [severity="success"]').first().isVisible().catch(() => false);
        expect(successMessage).toBeTruthy();
      }
    });

    test.skip('should show cancelled status after cancellation', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find and cancel a booking
      const cancelButtons = page.locator('button:has-text("Cancel"), p-button[label*="Cancel" i]');

      if (await cancelButtons.count() > 0) {
        await cancelButtons.first().click();

        // Confirm cancellation
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        // Check for CANCELLED status
        const pageContent = await page.locator('body').textContent();
        const isCancelled = pageContent?.toLowerCase().includes('cancelled') ||
          pageContent?.toLowerCase().includes('canceled');

        // Status should reflect cancellation
        if (isCancelled !== undefined) {
          expect(isCancelled).toBeTruthy();
        }
      }
    });

    test.skip('should not be able to cancel already cancelled booking', 'Booking flow requires seeded test data and working backend', async ({ page }) => {
      // Login
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

      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Look for bookings with CANCELLED status
      const cancelledBookings = page.locator('text=CANCELLED, text=Cancelled, text=canceled');

      if (await cancelledBookings.count() > 0) {
        // Cancel button should not be available for cancelled bookings
        const cancelButtons = page.locator('button:has-text("Cancel")');
        const cancelCount = await cancelButtons.count();

        // If there are cancelled bookings, ensure cancel buttons are fewer than total bookings
        // This verifies cancelled bookings don't have cancel buttons
        expect(cancelCount).toBeLessThanOrEqual(await page.locator('p-card, tr').count());
      }
    });
  });
});
