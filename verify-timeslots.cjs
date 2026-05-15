const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const CHROME_PATH = path.join(
  process.env.HOME,
  '.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'
);

const PROJ = '/home/zhaoge/workspace/opencode/Playground2.backup.20260426_012219/booking_system_refactor';

async function run() {
  console.log('=== Step 1: Fix time-slots.service.ts lte: endDate bug ===');

  const servicePath = path.join(PROJ, 'booking-backend/src/modules/time-slots/time-slots.service.ts');
  let content = fs.readFileSync(servicePath, 'utf-8');

  // Check if the fix is already applied
  if (content.includes('endOfDay')) {
    console.log('  Fix already applied, skipping');
  } else {
    // Replace "lte: endDate," with end-of-day logic
    content = content.replace(
      '        startTime: {\n          gte: startDate,\n          lte: endDate,\n        },',
      `        startTime: {\n          gte: startDate,\n          lte: endDateEnd,\n        },`
    );
    // Also need to ensure endDateEnd is defined before the query
    // It's already defined in generateTimeSlotsForDateRange but NOT in the findMany call
    content = content.replace(
      '    const slots = await this.prisma.timeSlot.findMany({',
      '    const endDateEnd = new Date(endDate);\n    endDateEnd.setUTCHours(23, 59, 59, 999);\n\n    const slots = await this.prisma.timeSlot.findMany({'
    );
    fs.writeFileSync(servicePath, content);
    console.log('  Fixed: lte: endDate → lte: endDateEnd (end-of-day)');
  }

  console.log('\n=== Step 2: Run time-slots tests ===');
  try {
    const testOutput = execSync('npx jest --testPathPatterns="time-slots" --no-coverage', {
      cwd: path.join(PROJ, 'booking-backend'),
      encoding: 'utf-8',
      timeout: 60000,
    });
    console.log('  ' + testOutput.split('\n').filter(l => l.includes('Tests:') || l.includes('Test Suites:') || l.includes('Time:')).join('\n  '));
  } catch (e) {
    console.log('  Tests output: ' + (e.stdout?.toString().split('\n').filter(l => l.includes('Tests:') || l.includes('Test Suites:')).join('\n  ') || 'no output'));
    if (e.status !== 0) {
      console.log('  ⚠️  Some tests failed, continuing to Playwright verification');
    }
  }

  console.log('\n=== Step 3: Playwright screenshot verification ===');
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Login as admin
    await page.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.locator('input[type="email"]').fill('zhaoge.tzx@gmail.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button.app-button--primary').click();
    await page.waitForTimeout(3000);
    console.log('   Login success');

    // Navigate to admin appointments
    await page.goto('http://localhost:4200/admin/appointments', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Open New Appointment dialog
    await page.getByText('New Appointment').click();
    await page.waitForTimeout(1500);
    console.log('   Dialog opened');

    // Select customer
    await page.locator('p-select').filter({ hasText: 'Select Customer' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);

    // Select service "Technical Architecture Review"
    await page.locator('p-select').filter({ hasText: 'Select Service' }).first().click();
    await page.waitForTimeout(500);
    const options = page.locator('[role="option"]');
    for (let i = 0; i < await options.count(); i++) {
      if ((await options.nth(i).textContent())?.includes('Technical Architecture Review')) {
        await options.nth(i).click();
        break;
      }
    }
    await page.waitForTimeout(2000);
    console.log('   Service selected');

    // Open datepicker and select a date (14+ days from now = May 28)
    const dpBtns = page.locator('.p-datepicker-dropdown');
    await dpBtns.nth(2).click({ force: true });
    await page.waitForTimeout(1000);

    const dayCells = page.locator('.p-datepicker-calendar td:not(.p-datepicker-other-month) span:not(.p-disabled)');
    const dayCount = await dayCells.count();
    // Click the first available day (May 28)
    for (let i = 0; i < dayCount; i++) {
      const dayText = (await dayCells.nth(i).textContent())?.trim();
      if (dayText === '28') {
        await dayCells.nth(i).click();
        console.log('   Date May 28 selected');
        break;
      }
    }
    await page.waitForTimeout(3000);

    // Screenshot before opening dropdown
    await page.screenshot({ path: '/tmp/timeslot-before-open.png', fullPage: true });

    // Check if "No time slots" banner is visible
    const noSlotMsg = page.getByText('No time slots available');
    const hasNoSlot = await noSlotMsg.isVisible().catch(() => false);

    if (hasNoSlot) {
      console.log('   ❌ "No time slots available" banner still showing — bug NOT fixed');
      console.log('   Message: ' + (await noSlotMsg.textContent()));
    } else {
      console.log('   ✅ "No time slots available" banner NOT shown — slots found!');
    }

    // Open time slot dropdown to see options
    const tsDD = page.locator('p-select').filter({ hasText: 'Select time slot' }).first();
    await tsDD.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/timeslot-dropdown.png', fullPage: true });
    console.log('   Screenshot saved: /tmp/timeslot-dropdown.png');

    // Count and list time slot options
    const slotOptions = page.locator('[role="option"]');
    const slotCount = await slotOptions.count();
    console.log(`\n   Time slot options: ${slotCount}`);

    if (slotCount > 0 && slotCount < 20) {
      for (let i = 0; i < slotCount; i++) {
        const text = (await slotOptions.nth(i).textContent())?.trim() || '';
        console.log(`     ${i + 1}. ${text}`);
      }
      console.log(`   ✅ Time slots correctly loaded for the selected date`);
    } else if (slotCount >= 20) {
      // Show first 5 and last 5
      for (let i = 0; i < 5; i++) {
        const text = (await slotOptions.nth(i).textContent())?.trim() || '';
        console.log(`     ${i + 1}. ${text}`);
      }
      console.log(`     ... (${slotCount - 10} more)`);
      for (let i = slotCount - 5; i < slotCount; i++) {
        const text = (await slotOptions.nth(i).textContent())?.trim() || '';
        console.log(`     ${i + 1}. ${text}`);
      }
      console.log(`   ⚠️  Multiple time slots across the date range — should be only for selected date`);
    } else {
      console.log(`   ⚠️  No time slot options found — showing "No results found" (PrimeNG empty state)`);
    }

    // Also take a screenshot of the full page with dialog
    await page.screenshot({ path: '/tmp/timeslot-full-dialog.png', fullPage: true });
    console.log('   Screenshot saved: /tmp/timeslot-full-dialog.png');

  } catch (err) {
    console.error('   Error:', err.message);
    await page.screenshot({ path: '/tmp/timeslot-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  console.log('\n=== Done ===');
}

run();
