const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const token = fs.readFileSync('.session_token', 'utf8').trim();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: 'http://127.0.0.1:4400', httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((val) => {
    localStorage.setItem('grg_token', val);
    localStorage.setItem('fenix_token', val);
  }, token);

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4400/app#city', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Click nav item city if not active
  await page.locator('[data-nav="city"]').first().click().catch(() => {});
  await page.waitForTimeout(2000);

  fs.mkdirSync('qa-results', { recursive: true });
  await page.screenshot({ path: 'qa-results/current_city_view.png' });
  console.log('Saved qa-results/current_city_view.png');

  const canvas = page.locator('#cityCanvas');
  if (await canvas.count() > 0 && await canvas.isVisible()) {
    await canvas.screenshot({ path: 'qa-results/current_city_canvas.png' });
    console.log('Saved qa-results/current_city_canvas.png');
  } else {
    console.log('Canvas not visible on city view!');
  }

  await browser.close();
})();
