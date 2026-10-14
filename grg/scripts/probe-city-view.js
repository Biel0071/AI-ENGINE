const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('[City Probe] Launching browser...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('CITY BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('CITY PAGE ERROR:', err.message));

  console.log('[City Probe] Navigating to http://127.0.0.1:3000/#city...');
  await page.goto('http://127.0.0.1:3000/#city', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[City Probe] Page loaded. Waiting 2s...');
  await page.waitForTimeout(2000);

  console.log('[City Probe] Evaluating DOM state...');
  const evalResult = await page.evaluate(async () => {
    const hasLoader = typeof window.loadCityView === 'function';
    console.log('hasLoader:', hasLoader);
    if (hasLoader) {
      console.log('Calling window.loadCityView()...');
      await window.loadCityView();
      console.log('window.loadCityView() completed!');
    }
    const isViewActive = document.getElementById('view-city')?.classList.contains('active') || document.getElementById('view-city')?.style.display !== 'none';
    const onlineEl = document.getElementById('cityOnlineCount');
    const workingEl = document.getElementById('cityWorkingCount');
    const missionsEl = document.getElementById('cityMissionsCount');
    const canvasExists = !!document.getElementById('cityCanvas');

    return {
      hasLoader,
      isViewActive,
      onlineText: onlineEl?.textContent || 'NO_TEXT',
      workingText: workingEl?.textContent || 'NO_TEXT',
      missionsText: missionsEl?.textContent || 'NO_TEXT',
      canvasExists
    };
  });

  console.log('[City Probe] Eval Result:', evalResult);

  const outDir = '/tmp/fenix_v2_shots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/view-city-certified.png` });
  console.log(`[City Probe] Saved screenshot to ${outDir}/view-city-certified.png`);

  await browser.close();

  if (evalResult.hasLoader && evalResult.onlineText.includes('ONLINE')) {
    console.log('CITY VIEW: PASS ✅');
  } else {
    console.error('CITY VIEW: FAIL ❌');
  }
})();
