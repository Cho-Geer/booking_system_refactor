import { test, expect } from './fixtures';

test.describe('Real Register Flow Test (Frontend -> Backend)', () => {
  test.skip('should register a new user successfully through the UI', async ({ page }) => {
    // Skipped: Registration requires verifyCode from email service which is not mocked in E2E tests
    const uniqueEmail = `test-user-${Date.now()}@example.com`;
    const password = 'Test@Pass123';

    console.log('Starting real register test...');
    console.log(`Email: ${uniqueEmail}`);
    console.log(`Password: ${password}`);

    // Step 1: Navigate to registration page
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    console.log('Navigated to registration page');
    console.log(`Page title: ${await page.title()}`);
    console.log(`Current URL: ${page.url()}`);

    // Step 2: Verify registration page loaded
    await expect(page).toHaveTitle(/BookingFrontend/i);
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
    console.log('Registration form is visible');

    // Step 3: Fill registration form
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password', { exact: true }).fill(password);

    // Get verification code if backend is running
    // In CI, ensure email service is mocked or use test mode

    // Accept terms
    await page.locator('.terms-checkbox input').check();

    // Wait for form validation to process
    await page.waitForTimeout(500);

    console.log('Filled registration form');

    // Check if button is enabled
    const submitButton = page.getByRole('button', { name: 'Submit registration form' });
    const isEnabled = await submitButton.isEnabled();
    console.log(`Submit button enabled: ${isEnabled}`);

    // Step 4: Submit form
    await submitButton.click();
    console.log('Submitted registration form');

    // Step 5: Wait for success (redirect to /home or success message)
    try {
      await page.waitForURL('**/home', { timeout: 15000 });
      console.log('Redirected to home page');
    } catch {
      // Check for success message or error
      const currentUrl = page.url();
      console.log(`Current URL after submit: ${currentUrl}`);

      const successMessage = await page.locator('.p-message-success, [severity="success"]').isVisible().catch(() => false);
      const errorMessage = await page.locator('.p-message-error, [severity="error"]').isVisible().catch(() => false);

      if (errorMessage) {
        const errorText = await page.locator('.p-message-error, [severity="error"]').textContent();
        console.log(`Error message: ${errorText}`);
      }
    }

    // Step 6: Verify user was created in backend
    console.log('\nVerifying user creation in backend...');

    try {
      const response = await page.request.post('http://localhost:3000/v1/auth/login', {
        data: {
          email: uniqueEmail,
          password: password
        }
      });

      const responseBody = await response.json();

      if (response.status() === 200) {
        console.log('User successfully created in backend!');
        console.log(`User ID: ${responseBody.user?.id}`);
        console.log(`User Email: ${responseBody.user?.email}`);
        console.log(`User Name: ${responseBody.user?.name}`);
        console.log(`User Role: ${responseBody.user?.role}`);
        console.log(`Has access_token: ${!!responseBody.access_token}`);
        console.log(`Has refresh_token: ${!!responseBody.refresh_token}`);

        expect(responseBody.user).toBeDefined();
        expect(responseBody.user.email).toBe(uniqueEmail);
        expect(responseBody.access_token).toBeDefined();

        console.log('\nTEST PASSED!');
        console.log('Full registration flow verified: Frontend UI -> Backend API -> Database -> Login');
      } else {
        console.log(`Login failed with status: ${response.status()}`);
        console.log(`Response: ${JSON.stringify(responseBody, null, 2)}`);
        throw new Error(`User registration may have failed. Login returned ${response.status()}`);
      }
    } catch (error) {
      console.log('Failed to verify user in backend');
      console.log('Error:', error.message);
      throw error;
    }
  });

  test.skip('should reject duplicate email registration', async ({ page }) => {
    // Skipped: Registration requires verifyCode from email service which is not mocked in E2E tests
    const duplicateEmail = `duplicate-test-${Date.now()}@example.com`;
    const password = 'Test@Pass123';

    console.log('\nTesting duplicate email rejection...');

    // First registration
    await page.goto('/auth/register');
    await page.getByLabel('Email').fill(duplicateEmail);
    await page.getByLabel('Username').fill('firstuser');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password', { exact: true }).fill(password);
    await page.locator('.terms-checkbox input').check();
    await page.getByRole('button', { name: 'Submit registration form' }).click();

    await page.waitForTimeout(2000);
    console.log('First registration completed');

    // Second registration with same email
    await page.goto('/auth/register');
    await page.getByLabel('Email').fill(duplicateEmail);
    await page.getByLabel('Username').fill('seconduser');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password', { exact: true }).fill(password);
    await page.locator('.terms-checkbox input').check();
    await page.getByRole('button', { name: 'Submit registration form' }).click();

    console.log('Attempted duplicate registration');

    // Wait for error message
    await page.waitForTimeout(2000);

    const errorMessage = await page.locator('.p-message-error, [severity="error"]').textContent().catch(() => '');
    console.log(`Error message: ${errorMessage}`);

    // Verify via API that duplicate is rejected
    const response = await page.request.post('http://localhost:3000/v1/auth/register', {
      data: {
        name: 'Third User',
        email: duplicateEmail,
        password: password
      }
    });

    expect(response.status()).toBe(400);
    console.log('Duplicate email correctly rejected by backend');
  });

  test('should reject weak password', async ({ page }) => {
    console.log('\nTesting weak password rejection...');

    await page.goto('/auth/register');
    await page.getByLabel('Email').fill(`weak-${Date.now()}@example.com`);
    await page.getByLabel('Username').fill('weakpassworduser');
    await page.getByLabel('Password', { exact: true }).fill('123');
    await page.getByLabel('Confirm Password', { exact: true }).fill('123');

    // Check password requirements are shown
    const passwordReqs = await page.locator('.password-requirements').isVisible().catch(() => false);
    console.log(`Password requirements visible: ${passwordReqs}`);

    // Accept terms to see if button is enabled
    await page.locator('.terms-checkbox input').check();

    // Frontend validation should prevent submission
    const submitButton = page.getByRole('button', { name: 'Submit registration form' });
    const isDisabled = await submitButton.isDisabled();

    console.log(`Submit button disabled: ${isDisabled}`);

    if (isDisabled) {
      console.log('Frontend validation correctly disabled submit button');
    }

    expect(isDisabled).toBeTruthy();
  });
});
