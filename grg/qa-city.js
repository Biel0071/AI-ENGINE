const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to FENIX OS...');
  await page.goto('http://127.0.0.1:4400/login.html');
  await page.waitForLoadState('networkidle');
  
  // Fill login
  try {
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('No login form found, proceeding...');
  }
  
  await page.goto('http://127.0.0.1:4400/app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot of default tab (CITY)
  await page.screenshot({ path: 'screenshot_city_2.png' });
  console.log('Screenshot saved to screenshot_city_2.png');

  await browser.close();
})();
