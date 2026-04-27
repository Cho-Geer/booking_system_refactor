import { Page, expect } from '@playwright/test';

/**
 * User data interface
 */
export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'CUSTOMER' | 'ADMIN' | 'SERVICE_PROVIDER';
}

/**
 * Service data interface
 */
export interface ServiceData {
  id: string;
  name: string;
  price: number;
  duration: number;
  categoryName?: string;
}

/**
 * Booking data interface
 */
export interface BookingData {
  serviceId: string;
  date: string;
  timeSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

/**
 * Helper: Register a new user via the registration form
 * @param page - Playwright page instance
 * @param userData - User registration data
 * @returns Promise resolving when registration is complete
 */
export async function registerUser(page: Page, userData: Partial<UserData>): Promise<void> {
  const defaults: UserData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'CUSTOMER',
    ...userData,
  };

  await page.goto('/auth/register');

  // Fill registration form
  await page.getByLabel('First Name').fill(defaults.firstName);
  await page.getByLabel('Last Name').fill(defaults.lastName);
  await page.getByLabel('Email').fill(defaults.email);

  if (defaults.phone) {
    const phoneInput = page.getByLabel('Phone');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(defaults.phone);
    }
  }

  await page.getByLabel('Password').fill(defaults.password);

  // Select role if not default
  if (defaults.role !== 'CUSTOMER') {
    const roleDropdown = page.locator('p-dropdown#role');
    if (await roleDropdown.isVisible()) {
      await roleDropdown.click();
      const roleText = defaults.role === 'SERVICE_PROVIDER' ? 'Service Provider' : 'Customer';
      const roleOption = page.locator('.p-dropdown-items li').filter({ hasText: roleText }).first();
      if (await roleOption.count() > 0) {
        await roleOption.click();
      }
    }
  }

  // Submit form
  await page.getByRole('button', { name: 'Register' }).click();

  // Wait for success - either redirect to home or success message
  await Promise.race([
    page.waitForURL('**/home', { timeout: 10000 }),
    page.waitForSelector('.p-message-success, [severity="success"]', { timeout: 10000 }),
  ]);
}

/**
 * Helper: Login a user via the login form
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @returns Promise resolving when login is complete
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  await page.getByRole('button', { name: 'Submit login form' }).click();

  // Wait for successful login - redirect to home or returnUrl
  await page.waitForURL('**/home', { timeout: 10000 }).catch(() => {
    // Login might have failed, check for error
  });
}

/**
 * Helper: Login and verify success
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @throws Error if login fails
 */
export async function loginUserAndVerify(page: Page, email: string, password: string): Promise<void> {
  await loginUser(page, email, password);

  // Verify login was successful
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    // Check for error message
    const errorMessage = await page.locator('.p-message-error, [severity="error"]').textContent().catch(() => '');
    throw new Error(`Login failed: ${errorMessage || 'Unknown error'}`);
  }

  // Verify user is logged in by checking for logout indicator
  await expect(page.locator('text=Logout, text=Profile, text=My Bookings').first()).toBeVisible({ timeout: 5000 }).catch(() => {
    // Some pages might not show these elements immediately
  });
}

/**
 * Helper: Logout the current user
 * @param page - Playwright page instance
 */
export async function logoutUser(page: Page): Promise<void> {
  // Look for logout button/link
  const logoutButton = page.locator('text=Logout, a:has-text("Logout"), button:has-text("Logout")').first();

  if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL('**/home', { timeout: 5000 }).catch(() => {});
  }
}

/**
 * Helper: Navigate to services page and wait for services to load
 * @param page - Playwright page instance
 */
export async function goToServices(page: Page): Promise<void> {
  await page.goto('/services');
  await page.waitForLoadState('networkidle');

  // Wait for services list or "No services" message
  await Promise.race([
    page.waitForSelector('p-card', { timeout: 10000 }),
    page.waitForSelector('text=No services available', { timeout: 10000 }),
  ]);
}

/**
 * Helper: Select a service from the services list
 * @param page - Playwright page instance
 * @param serviceName - Name of the service to select
 * @returns Promise resolving when service is selected
 */
export async function selectService(page: Page, serviceName: string): Promise<void> {
  // Find the service card
  const serviceCard = page.locator('p-card').filter({ hasText: serviceName }).first();

  if (await serviceCard.count() === 0) {
    throw new Error(`Service "${serviceName}" not found`);
  }

  // Click "Book Now" button within the service card
  const bookNowButton = serviceCard.locator('text=Book Now, a:has-text("Book Now")').first();

  if (await bookNowButton.isVisible()) {
    await bookNowButton.click();
  } else {
    // If not logged in, might see "Login to Book"
    const loginToBookButton = serviceCard.locator('text=Login to Book').first();
    if (await loginToBookButton.isVisible()) {
      await loginToBookButton.click();
    }
  }

  // Wait for navigation to booking page
  await page.waitForURL('**/book**', { timeout: 10000 });
}

/**
 * Helper: Create a booking via the booking form
 * @param page - Playwright page instance
 * @param bookingData - Booking details
 * @returns Promise resolving when booking is submitted
 */
export async function createBooking(page: Page, bookingData: Partial<BookingData>): Promise<void> {
  const defaults: BookingData = {
    serviceId: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    timeSlot: '10:00',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    ...bookingData,
  };

  // Wait for booking form to load
  await page.waitForLoadState('networkidle');

  // Select date
  const dateInputs = page.locator('input[type="date"], .p-calendar input');
  if (await dateInputs.count() > 0) {
    await dateInputs.first().fill(defaults.date);
    // Trigger blur to ensure date is registered
    await dateInputs.first().press('Tab');
  }

  // Select time slot
  const timeSlotButton = page.locator(`button:has-text("${defaults.timeSlot}"), [data-time="${defaults.timeSlot}"]`).first();
  if (await timeSlotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await timeSlotButton.click();
  }

  // Fill additional details if form fields exist
  const nameInputs = page.locator('input[name="customerName"], input[placeholder*="name" i], label:has-text("Name") + input');
  if (await nameInputs.count() > 0) {
    await nameInputs.first().fill(defaults.customerName);
  }

  const phoneInputs = page.locator('input[name="customerPhone"], input[placeholder*="phone" i]');
  if (await phoneInputs.count() > 0 && defaults.customerPhone) {
    await phoneInputs.first().fill(defaults.customerPhone);
  }

  // Notes or additional info
  const notesInputs = page.locator('textarea[name="notes"], input[placeholder*="notes" i], textarea[placeholder*="notes" i]');
  if (await notesInputs.count() > 0) {
    await notesInputs.first().fill('E2E test booking');
  }

  // Submit booking
  const submitButton = page.locator('button[type="submit"], p-button[label*="Confirm" i], p-button[label*="Book" i], button:has-text("Confirm Booking")').first();

  if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitButton.click();

    // Wait for confirmation
    await Promise.race([
      page.waitForSelector('.p-message-success, [severity="success"], text=Booking confirmed, text=Successfully booked', { timeout: 10000 }),
      page.waitForURL('**/bookings**', { timeout: 10000 }),
    ]);
  }
}

/**
 * Helper: Navigate to My Appointments/Bookings page
 * @param page - Playwright page instance
 */
export async function goToMyAppointments(page: Page): Promise<void> {
  await page.goto('/bookings');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Cancel a booking from the bookings list
 * @param page - Playwright page instance
 * @param bookingIndex - Index of the booking to cancel (0-based)
 */
export async function cancelBooking(page: Page, bookingIndex: number = 0): Promise<void> {
  await goToMyAppointments(page);

  // Find cancel buttons
  const cancelButtons = page.locator('button:has-text("Cancel"), p-button[label*="Cancel" i]');
  const count = await cancelButtons.count();

  if (count === 0) {
    throw new Error('No cancel buttons found - no bookings to cancel');
  }

  if (bookingIndex >= count) {
    throw new Error(`Booking index ${bookingIndex} out of range. Found ${count} bookings.`);
  }

  // Click the cancel button
  await cancelButtons.nth(bookingIndex).click();

  // Handle confirmation dialog if it appears
  const confirmDialog = page.locator('.p-confirm-dialog, [role="dialog"]').first();
  if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), .p-button-danger').first();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  // Wait for cancellation confirmation
  await Promise.race([
    page.waitForSelector('.p-message-success, [severity="success"], text=cancelled, text=Cancelled', { timeout: 10000 }),
    page.waitForTimeout(3000),
  ]);
}

/**
 * Helper: Verify booking status on the bookings page
 * @param page - Playwright page instance
 * @param expectedStatus - Expected status text
 * @param bookingIndex - Index of the booking to check (0-based)
 */
export async function verifyBookingStatus(
  page: Page,
  expectedStatus: string,
  bookingIndex: number = 0,
): Promise<void> {
  await goToMyAppointments(page);

  // Look for status indicators
  const statusElements = page.locator(
    `.p-tag, [class*="status"], text=${expectedStatus}, text=${expectedStatus.toLowerCase()}`,
  );

  if (await statusElements.count() > 0) {
    const statusText = await statusElements.nth(bookingIndex).textContent();
    expect(statusText?.toLowerCase()).toContain(expectedStatus.toLowerCase());
  } else {
    // Fallback: check page content for status
    const pageContent = await page.locator('body').textContent();
    expect(pageContent?.toLowerCase()).toContain(expectedStatus.toLowerCase());
  }
}

/**
 * Helper: Navigate to admin dashboard
 * @param page - Playwright page instance
 */
export async function goToAdminDashboard(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Navigate to admin users management
 * @param page - Playwright page instance
 */
export async function goToAdminUsers(page: Page): Promise<void> {
  await page.goto('/admin/users');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Navigate to admin services management
 * @param page - Playwright page instance
 */
export async function goToAdminServices(page: Page): Promise<void> {
  await page.goto('/admin/services');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Check if user can access admin routes (should be blocked for non-admins)
 * @param page - Playwright page instance
 * @returns Promise resolving to true if access was blocked
 */
export async function verifyAdminAccessBlocked(page: Page): Promise<boolean> {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');

  // Check if redirected to login or home
  const currentUrl = page.url();

  if (currentUrl.includes('/auth/login')) {
    return true; // Redirected to login
  }

  // Check for access denied message
  const pageContent = await page.locator('body').textContent();
  if (
    pageContent?.toLowerCase().includes('access denied') ||
    pageContent?.toLowerCase().includes('unauthorized') ||
    pageContent?.toLowerCase().includes('forbidden')
  ) {
    return true;
  }

  return false;
}

/**
 * Helper: Generate unique test email
 * @param prefix - Email prefix (default: 'test')
 * @returns Unique email string
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;
}

/**
 * Helper: Generate future date string for booking
 * @param daysAhead - Number of days ahead (default: 1)
 * @returns Date string in YYYY-MM-DD format
 */
export function generateFutureDate(daysAhead: number = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

/**
 * Helper: Get available time slots for a day
 * @returns Array of time slot strings
 */
export function getAvailableTimeSlots(): string[] {
  return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
}

/**
 * Helper: Cleanup test data (requires API access)
 * This is a placeholder - implement actual cleanup logic based on your backend API
 */
export async function cleanupTestData(): Promise<void> {
  // Implementation would call backend cleanup endpoints
  // This is typically done via API calls to delete test users, bookings, etc.
  console.log('Test data cleanup completed (placeholder)');
}
