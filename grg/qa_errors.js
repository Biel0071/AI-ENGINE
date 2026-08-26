const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log(msg.text()));
  page.on('pageerror', error => console.log(`[ERROR] ${error.message}`));
  await page.goto('http://127.0.0.1:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app*');
  await page.waitForTimeout(3000);
  await browser.close();
})();
