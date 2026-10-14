const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Connecting to Live VPS: http://209.50.241.22:3000/app#city ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    const response = await page.goto('http://209.50.241.22:3000/app#city', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('Live VPS HTTP status:', response.status());

    await page.waitForTimeout(2000);

    // Open sidebar if not already open
    await page.evaluate(() => {
      if (window.fenixMascotSidebar) {
        window.fenixMascotSidebar.open();
      }
    });
    await page.waitForTimeout(600);

    const measurements = await page.evaluate(() => {
      const vc = document.querySelector('.views-container')?.getBoundingClientRect();
      const city = document.querySelector('#view-city')?.getBoundingClientRect();
      const sb = document.querySelector('#fenix-right-sidebar')?.getBoundingClientRect();
      const attachBtn = !!document.getElementById('fsbAttachBtn');
      const fileInput = !!document.getElementById('fsbFileInput');
      const dropOverlay = !!document.getElementById('fsbDropOverlay');
      const gap = sb && vc ? sb.left - vc.right : -1;
      return {
        viewsContainer: vc ? { left: vc.left, right: vc.right, width: vc.width } : null,
        city: city ? { left: city.left, right: city.right, width: city.width } : null,
        sidebar: sb ? { left: sb.left, right: sb.right, width: sb.width } : null,
        gapBetweenViewsAndSidebar: gap,
        forensicFeatures: { attachBtn, fileInput, dropOverlay }
      };
    });

    console.log('Live VPS Measurements:', JSON.stringify(measurements, null, 2));

    await page.screenshot({ path: 'scratch/live-vps-city.png' });
    console.log('Live VPS screenshot saved to scratch/live-vps-city.png');

    // Also test selecting district on Live VPS
    await page.evaluate(() => {
      if (window.fenixPanToDistrict) {
        window.fenixPanToDistrict('command-center');
      }
    });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'scratch/live-vps-city-district.png' });
    console.log('Live VPS district screenshot saved to scratch/live-vps-city-district.png');

    // Also navigate to IDE to verify full bleed on live VPS
    await page.evaluate(() => {
      if (window.showView) window.showView('ide');
    });
    await page.waitForTimeout(1000);

    const ideMeasurements = await page.evaluate(() => {
      const ide = document.querySelector('#view-ide')?.getBoundingClientRect();
      const sb = document.querySelector('#fenix-right-sidebar')?.getBoundingClientRect();
      const gap = sb && ide ? sb.left - ide.right : -1;
      return {
        ide: ide ? { left: ide.left, right: ide.right, width: ide.width } : null,
        sidebar: sb ? { left: sb.left, right: sb.right, width: sb.width } : null,
        gapBetweenIdeAndSidebar: gap
      };
    });
    console.log('Live VPS IDE Measurements:', JSON.stringify(ideMeasurements, null, 2));

    await page.screenshot({ path: 'scratch/live-vps-ide.png' });
    console.log('Live VPS IDE screenshot saved to scratch/live-vps-ide.png');

  } catch (err) {
    console.error('Error during live verification:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
