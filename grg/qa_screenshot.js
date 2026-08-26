const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    console.log('[QA] Starting Browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('[QA] Going to Login...');
    await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'load' });
    
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin');
    await page.click('button[type="submit"]');

    console.log('[QA] Waiting for UI to load...');
    await page.waitForTimeout(3000); // give time for iso-city to render

    console.log('[QA] Taking screenshot...');
    await page.screenshot({ path: 'qa-screenshot-city.png', fullPage: true });

    await browser.close();
    console.log('[QA] Success! Screenshot saved to qa-screenshot-city.png');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
