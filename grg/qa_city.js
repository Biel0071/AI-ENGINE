const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('Browser log:', msg.text()));

  try {
    await page.goto('http://localhost:4400/index.html#runtime', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // let UI settle
    
    // Evaluate in browser to click the city button and run init
    await page.evaluate(() => {
      const btn = document.getElementById('cityNavBtn');
      if (btn) btn.click();
      if (window.initCityCanvas) window.initCityCanvas();
      if (window.showSubView) window.showSubView('runtime', 'city');
    });

    await page.waitForTimeout(2000); // Wait for canvas to draw

    // Take screenshot
    await page.screenshot({ path: '../FENIX_CITY_SCREENSHOT.png', fullPage: true });
    console.log('City screenshot captured.');

  } catch (e) {
    console.error('Playwright execution error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
