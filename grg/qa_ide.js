const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app*');
  
  // Navigate to IDE
  await page.evaluate(() => {
     document.querySelector('button[data-view="ide"]').click();
  });
  
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa-screenshot-ide-final.png' });
  await browser.close();
})();
