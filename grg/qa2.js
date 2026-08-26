const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:4400/index.html#city', { waitUntil: 'networkidle', timeout: 15000 });
    
    const viewsCount = await page.locator('.view').count();
    const isCityVisible = await page.locator('#view-city').isVisible();
    console.log(`Views in DOM: ${viewsCount}. City Visible: ${isCityVisible}`);
    
  } catch (e) {
    console.error('Playwright execution error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
