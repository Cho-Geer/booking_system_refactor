import { chromium, type Page, type Browser } from 'playwright';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Time Slots Fix Verification via Quick Booking Dialog ===\n');

  const browser: Browser = await chromium.launch({
    headless: true,
    executablePath: '/home/zhaoge/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page: Page = await context.newPage();

  try {
    // Step 1: Login
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle' });
    await sleep(2000);

    // Check if we need to navigate to login or if already there
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Fill in login form
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"i]', 'zhaoge.tzx@gmail.com');
    await sleep(500);
    await page.fill('input[type="password"], input[name="password"]', 'Admin@123456');
    await sleep(500);

    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await sleep(3000);

    console.log(`   After login URL: ${page.url()}`);

    // Take screenshot of current state
    await page.screenshot({ path: '/tmp/01-after-login.png' });
    console.log('   Screenshot saved: /tmp/01-after-login.png');

    // Step 2: Navigate to admin appointments
    console.log('2. Navigating to admin appointments...');
    await page.goto('http://localhost:4200/admin/appointments', { waitUntil: 'networkidle' });
    await sleep(3000);
    await page.screenshot({ path: '/tmp/02-admin-appointments.png' });
    console.log('   Screenshot saved: /tmp/02-admin-appointments.png');

    // Step 3: Look for Quick Booking button / dialog trigger
    console.log('3. Looking for Quick Booking button...');
    
    // Try various selectors for opening a booking dialog
    const quickBookingBtn = await page.$('button:has-text("Quick Booking"), button:has-text("New Booking"), button:has-text("Create Booking"), button:has-text("Book Appointment")');
    if (quickBookingBtn) {
      await quickBookingBtn.click();
      console.log('   Clicked Quick Booking button');
      await sleep(2000);
    } else {
      console.log('   No Quick Booking button found, trying alternative approaches...');
      // Try clicking first "Book" or "Add" button
      const altBtns = await page.$$('button:has-text("Book"), button:has-text("Add"), button:has-text("New"), a:has-text("Book")');
      if (altBtns.length > 0) {
        await altBtns[0].click();
        console.log('   Clicked alternative button');
        await sleep(2000);
      }
    }

    await page.screenshot({ path: '/tmp/03-after-quick-booking-click.png' });
    console.log('   Screenshot saved: /tmp/03-after-quick-booking-click.png');

    // Step 4: Print page content to understand structure
    console.log('4. Analyzing page structure...');
    const bodyText = await page.textContent('body');
    console.log(`   Page contains text like: "${bodyText?.substring(0, 500)}..."`);

    // Look for dialog
    const dialog = await page.$('[role="dialog"], .p-dialog, .modal, .dialog, [class*="dialog"], [class*="modal"]');
    if (dialog) {
      console.log('   Dialog found on page');
      const dialogText = await dialog.textContent();
      console.log(`   Dialog content: "${dialogText?.substring(0, 300)}..."`);
    } else {
      console.log('   No dialog found');
    }

    // Step 5: Try to select customer and service
    console.log('5. Attempting to select customer and service...');

    // Look for dropdowns / select fields
    const selects = await page.$$('select, [role="combobox"], .p-dropdown, [class*="dropdown"]');
    console.log(`   Found ${selects.length} dropdown/select elements`);

    // Try to find the service named "Technical Architecture Review"
    const serviceElements = await page.$$('text=Technical Architecture Review');
    console.log(`   Found ${serviceElements.length} elements with "Technical Architecture Review"`);

    // Take detailed screenshot
    await page.screenshot({ path: '/tmp/04-full-page.png', fullPage: true });
    console.log('   Full page screenshot: /tmp/04-full-page.png');

    // Get all interactive elements
    const interactive = await page.$$('button, a, input, select, textarea, [role="button"], [tabindex]');
    console.log(`\n   Total interactive elements: ${interactive.length}`);

    // Log buttons and their text
    for (const el of interactive) {
      const tag = await el.evaluate(el => el.tagName);
      const text = await el.evaluate(el => el.textContent?.trim() || '');
      const type = await el.evaluate(el => (el as HTMLInputElement).type || '');
      const placeholder = await el.evaluate(el => (el as HTMLInputElement).placeholder || '');
      if (text || type || placeholder) {
        console.log(`   ${tag}: type="${type}" text="${text}" placeholder="${placeholder}"`);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
    console.log('\n=== Verification Complete ===');
  }
}

main().catch(console.error);
