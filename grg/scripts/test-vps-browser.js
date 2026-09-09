const { chromium } = require('playwright');
const path = require('path');

async function testBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[Browser Error]', err.message));

  console.log('Navigating to http://209.50.241.22:3000/ ...');
  await page.goto('http://209.50.241.22:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(4000);

  const shotPath = path.join(__dirname, '..', 'qa-results', 'playwright', 'vps-3000-live.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved screenshot to:', shotPath);

  // Now test City view
  console.log('Navigating to http://209.50.241.22:3000/#city ...');
  await page.goto('http://209.50.241.22:3000/#city', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(4000);

  const cityShotPath = path.join(__dirname, '..', 'qa-results', 'playwright', 'vps-3000-city.png');
  await page.screenshot({ path: cityShotPath });
  console.log('Saved city screenshot to:', cityShotPath);

  await browser.close();
}

testBrowser().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
