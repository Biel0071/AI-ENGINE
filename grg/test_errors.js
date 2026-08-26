const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin1010');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(5000);
  await browser.close();
})();
