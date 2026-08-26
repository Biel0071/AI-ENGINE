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
  await page.waitForTimeout(1000);
  
  // Click Visual Tab
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('.toolbar-btn'));
     const visualBtn = btns.find(b => b.textContent.includes('Visual'));
     if (visualBtn) visualBtn.click();
  });
  
  await page.waitForTimeout(2000); // Wait for iframe to load
  await page.screenshot({ path: 'qa-screenshot-inspector.png' });
  await browser.close();
})();
