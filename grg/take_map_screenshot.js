const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.goto('http://localhost:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin1010');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.click('button[type="submit"]')
  ]);
  await page.waitForTimeout(3000);
  
  // Navigate to Runtime tab
  await page.evaluate(() => showView('runtime'));
  await page.waitForTimeout(1000);
  
  // Navigate to AI City sub-tab
  await page.evaluate(() => showSubView('runtime', 'city'));
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'fenix_map.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved to fenix_map.png');
})();
