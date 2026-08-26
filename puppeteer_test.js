const puppeteer = require('puppeteer-core');

(async () => {
  try {
    console.log("Fetching browser WS Endpoint...");
    const res = await fetch('http://localhost:9222/json/version');
    const data = await res.json();
    const wsEndpoint = data.webSocketDebuggerUrl;

    console.log("Connecting to browser...");
    const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    const page = await browser.newPage();
    
    // Set a large viewport
    await page.setViewport({ width: 1440, height: 900 });

    console.log("Navigating to http://localhost:4400/app");
    await page.goto('http://localhost:4400/app', { waitUntil: 'networkidle2', timeout: 15000 });

    // Click on the City Tab to initialize the canvas
    console.log("Clicking City Tab...");
    await page.evaluate(() => {
      const btn = document.getElementById('cityNavBtn') || document.querySelector('[onclick*="showView(\\\'city\\\')"]');
      if (btn) btn.click();
    });
    
    // Wait for the canvas to render
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'fenix_restored_city.png' });
    
    console.log("DONE");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
