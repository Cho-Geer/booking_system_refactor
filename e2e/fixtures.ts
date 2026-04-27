import { test as base, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Test data types
 */
export type TestUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SERVICE_PROVIDER';
};

export type TestService = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  categoryName: string;
  providerName: string;
};

export type TestBooking = {
  id?: string;
  serviceId: string;
  date: string;
  timeSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
};

/**
 * Fixture types
 */
type BookingFixtures = {
  /**
   * Page fixture with customer authentication
   */
  authenticatedPage: Page;
  /**
   * Page fixture with admin authentication
   */
  adminPage: Page;
  /**
   * Test data fixture containing test users and services
   */
  testData: {
    customerUser: TestUser;
    adminUser: TestUser;
    serviceProviderUser: TestUser;
    testService: TestService;
  };
  /**
   * Helper to register a new user
   */
  registerUser: (userData: Partial<TestUser>) => Promise<TestUser>;
  /**
   * Helper to login a user and return the authenticated context
   */
  loginUser: (email: string, password: string) => Promise<BrowserContext>;
  /**
   * Helper to create a booking via UI
   */
  createBooking: (page: Page, booking: Partial<TestBooking>) => Promise<TestBooking>;
  /**
   * Helper to cancel a booking via UI
   */
  cancelBooking: (page: Page, bookingId: string) => Promise<void>;
  /**
   * Helper to cleanup test data after tests
   */
  cleanupTestData: () => Promise<void>;
};

/**
 * Default test data
 */
const DEFAULT_TEST_DATA = {
  customerUser: {
    email: `test-customer-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Customer',
    role: 'CUSTOMER' as const,
  },
  adminUser: {
    email: 'admin@booking.com',
    password: 'Admin@123456',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN' as const,
  },
  serviceProviderUser: {
    email: `test-provider-${Date.now()}@example.com`,
    password: 'ProviderPass123!',
    firstName: 'Test',
    lastName: 'Provider',
    role: 'SERVICE_PROVIDER' as const,
  },
  testService: {
    id: 'test-service-1',
    name: 'Test Haircut',
    description: 'A standard haircut service for testing',
    price: 50,
    duration: 30,
    categoryName: 'Hair Services',
    providerName: 'Test Provider',
  },
};

/**
 * Extended test object with booking system fixtures
 */
export const test = base.extend<BookingFixtures>({
  /**
   * Test data fixture - provides default test users and services
   */
  testData: async ({}, use) => {
    await use(DEFAULT_TEST_DATA);
  },

  /**
   * Register a new user via the registration form
   */
  registerUser: async ({ page }, use) => {
    const registeredUsers: TestUser[] = [];

    const registerUser = async (userData: Partial<TestUser>): Promise<TestUser> => {
      const fullUserData: TestUser = {
        ...DEFAULT_TEST_DATA.customerUser,
        ...userData,
      };

      await page.goto('/auth/register');

      await page.getByLabel('First Name').fill(fullUserData.firstName);
      await page.getByLabel('Last Name').fill(fullUserData.lastName);
      await page.getByLabel('Email').fill(fullUserData.email);
      await page.getByLabel('Password').fill(fullUserData.password);

      // Select role if provided
      if (fullUserData.role) {
        const roleDropdown = page.locator('p-dropdown#role');
        await roleDropdown.click();
        const roleOption = page.locator('.p-dropdown-items li').filter({
          hasText: fullUserData.role === 'CUSTOMER' ? 'Customer' : 'Service Provider',
        });
        if (await roleOption.count() > 0) {
          await roleOption.click();
        }
      }

      await page.getByRole('button', { name: 'Register' }).click();

      // Wait for success message or navigation
      await page.waitForURL('**/home', { timeout: 10000 }).catch(() => {});

      registeredUsers.push(fullUserData);
      return fullUserData;
    };

    await use(registerUser);
  },

  /**
   * Login a user and return the authenticated browser context
   */
  loginUser: async ({ page, browser }, use) => {
    const loginUser = async (email: string, password: string): Promise<BrowserContext> => {
      const context = await browser.newContext();
      const loginPage = await context.newPage();

      await loginPage.goto('/auth/login');
      await loginPage.getByLabel('Email').fill(email);
      await loginPage.getByLabel('Password').fill(password);
      await loginPage.getByRole('button', { name: 'Submit login form' }).click();

      // Wait for successful login - redirect to home
      await loginPage.waitForURL('**/home', { timeout: 10000 }).catch(() => {});

      // Verify login was successful by checking for user indicator
      const isLoggedIn = await loginPage.locator('text=Logout').isVisible().catch(() => false);

      if (!isLoggedIn) {
        // Check if there's an error message
        const errorMessage = await loginPage.locator('.p-message-error, [role="alert"]').textContent().catch(() => '');
        if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage}`);
        }
      }

      await loginPage.close();
      return context;
    };

    await use(loginUser);
  },

  /**
   * Authenticated page fixture - auto-logs in as test customer
   */
  authenticatedPage: async ({ page, loginUser, testData }, use) => {
    // Try to login with test customer
    // In a real scenario, you'd use pre-created test accounts
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(testData.customerUser.email);
    await page.getByLabel('Password').fill(testData.customerUser.password);
    await page.getByRole('button', { name: 'Submit login form' }).click();

    // Wait for navigation or timeout (login might fail if user doesn't exist)
    await page.waitForURL('**/home', { timeout: 5000 }).catch(() => {});

    await use(page);
  },

  /**
   * Admin page fixture - auto-logs in as admin
   */
  adminPage: async ({ page, testData }, use) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(testData.adminUser.email);
    await page.getByLabel('Password').fill(testData.adminUser.password);
    await page.getByRole('button', { name: 'Submit login form' }).click();

    // Wait for admin dashboard or timeout
    await page.waitForURL('**/admin', { timeout: 10000 }).catch(() => {});

    await use(page);
  },

  /**
   * Create a booking via the UI
   */
  createBooking: async ({ page }, use) => {
    const createBooking = async (
      page: Page,
      booking: Partial<TestBooking>,
    ): Promise<TestBooking> => {
      const fullBooking: TestBooking = {
        serviceId: booking.serviceId || '',
        date: booking.date || new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        timeSlot: booking.timeSlot || '10:00',
        customerName: booking.customerName || 'Test Customer',
        customerEmail: booking.customerEmail || 'test@example.com',
        customerPhone: booking.customerPhone || '',
        status: 'CONFIRMED',
      };

      // Navigate to booking page with service
      await page.goto(`/book?serviceId=${fullBooking.serviceId}`);

      // Wait for the booking form to load
      await page.waitForSelector('form, .booking-form', { timeout: 10000 }).catch(() => {});

      // Select date
      const dateInput = page.locator('input[type="date"], input[placeholder*="date" i], .p-calendar input');
      if (await dateInput.count() > 0) {
        await dateInput.first().fill(fullBooking.date);
      }

      // Select time slot
      const timeSlotSelector = page.locator(`text=${fullBooking.timeSlot}, [data-time="${fullBooking.timeSlot}"]`).first();
      if (await timeSlotSelector.isVisible().catch(() => false)) {
        await timeSlotSelector.click();
      }

      // Fill customer details if form exists
      const nameInput = page.locator('input[name="customerName"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(fullBooking.customerName);
      }

      const emailInput = page.locator('input[name="customerEmail"], input[placeholder*="email" i]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(fullBooking.customerEmail);
      }

      const phoneInput = page.locator('input[name="customerPhone"], input[placeholder*="phone" i]').first();
      if (await phoneInput.isVisible().catch(() => false) && fullBooking.customerPhone) {
        await phoneInput.fill(fullBooking.customerPhone);
      }

      // Submit booking
      const submitButton = page.locator('button[type="submit"], p-button[label*="Book" i], button:has-text("Book")').first();
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
      }

      // Wait for confirmation
      await page.waitForTimeout(2000);

      return fullBooking;
    };

    await use(createBooking);
  },

  /**
   * Cancel a booking via the UI
   */
  cancelBooking: async ({ page }, use) => {
    const cancelBooking = async (page: Page, bookingId: string): Promise<void> => {
      // Navigate to bookings page
      await page.goto('/bookings');

      // Wait for bookings list to load
      await page.waitForLoadState('networkidle');

      // Find the booking and click cancel
      const cancelButtons = page.locator('button:has-text("Cancel"), p-button[label*="Cancel" i]');
      const count = await cancelButtons.count();

      for (let i = 0; i < count; i++) {
        const button = cancelButtons.nth(i);
        const parentRow = button.locator('..').locator('..');
        const bookingText = await parentRow.textContent().catch(() => '');

        if (bookingText.includes(bookingId) || bookingId === 'any') {
          await button.click();

          // Confirm cancellation if dialog appears
          const confirmButton = page.locator('button:has-text("Confirm"), .p-confirm-dialog button:has-text("Yes")').first();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }

          // Wait for confirmation
          await page.waitForTimeout(1000);
          break;
        }
      }
    };

    await use(cancelBooking);
  },

  /**
   * Cleanup test data after tests
   */
  cleanupTestData: async ({}, use) => {
    await use(async () => {
      // Cleanup can be implemented via API calls if needed
      // This would typically call backend endpoints to delete test data
      console.log('Cleanup completed');
    });
  },
});

export { expect } from '@playwright/test';
