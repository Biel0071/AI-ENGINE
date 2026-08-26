const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to canonical frontend...');
  let hasError = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser JS Error:', msg.text());
      hasError = true;
    }
  });

  page.on('pageerror', exception => {
    console.log(`Uncaught Exception: "${exception}"`);
    hasError = true;
  });

  try {
    await page.goto('http://localhost:4400/index.html', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Fênix has hash routing.
    await page.goto('http://localhost:4400/index.html#city', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Take a screenshot
    await page.screenshot({ path: '../FENIX_BASELINE_BROWSER.png', fullPage: true });
    console.log('Screenshot taken: FENIX_BASELINE_BROWSER.png');

    const html = await page.content();
    if (html.includes('city')) {
      console.log('DOM contains city element.');
    }

  } catch (e) {
    console.error('Playwright execution error:', e.message);
  } finally {
    await browser.close();
    console.log('Playwright run complete. JS Errors:', hasError);
  }
}

run();
