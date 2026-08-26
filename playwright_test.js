const { chromium } = require('playwright');
const path = require('path');

(async () => {
  let browser;
  try {
    console.log("Launching Playwright...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    
    const page = await context.newPage();
    console.log("Navigating to http://localhost:4400/app...");
    
    // Attempt navigation
    await page.goto('http://localhost:4400/app', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the City tab and click it
    console.log("Activating AI City Tab...");
    await page.evaluate(() => {
      // Find the tab that shows the city view and click it
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('AI City') || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('city'))) {
          btn.click();
          break;
        }
      }
    });

    console.log("Waiting for rendering...");
    await page.waitForTimeout(3000); // let the canvas and agents render
    
    console.log("Taking screenshot...");
    const dest = path.join(__dirname, 'fenix_restored_city.png');
    await page.screenshot({ path: dest });
    console.log("Screenshot saved to", dest);

  } catch (err) {
    console.error("Playwright Error:", err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
