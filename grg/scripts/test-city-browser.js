const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navigating to http://127.0.0.1:3000/#city...');
  await page.goto('http://127.0.0.1:3000/#city', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const evalResult = await page.evaluate(async () => {
    const hasLoader = typeof window.loadCityView === 'function';
    if (hasLoader) await window.loadCityView();
    const isViewActive = document.getElementById('view-city')?.classList.contains('active') || document.getElementById('view-city')?.style.display !== 'none';
    const onlineText = document.getElementById('cityOnlineCount')?.textContent;
    const workingText = document.getElementById('cityWorkingCount')?.textContent;
    const missionsText = document.getElementById('cityMissionsCount')?.textContent;
    const canvasExists = !!document.getElementById('cityCanvas');

    return {
      hasLoader,
      isViewActive,
      onlineText,
      workingText,
      missionsText,
      canvasExists
    };
  });

  console.log('City View Eval Result:', evalResult);

  const outDir = '/tmp/fenix_v2_shots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/view-city-certified.png` });
  console.log(`Saved screenshot to ${outDir}/view-city-certified.png`);

  console.log('Console Errors count:', errors.length);
  if (errors.length) console.log('Errors:', errors.slice(0, 5));

  await browser.close();

  if (evalResult.hasLoader && evalResult.onlineText.includes('ONLINE')) {
    console.log('CYCLE 1 (CITY VIEW): PASS ✅');
    process.exit(0);
  } else {
    console.error('CYCLE 1 (CITY VIEW): FAIL ❌');
    process.exit(1);
  }
})();
