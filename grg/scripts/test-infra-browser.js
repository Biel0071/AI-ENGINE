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

  console.log('Navigating to http://127.0.0.1:3000/#project...');
  await page.goto('http://127.0.0.1:3000/#project', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const evalResult = await page.evaluate(async () => {
    const hasLoader = typeof window.loadInfrastructureView === 'function';
    if (hasLoader) await window.loadInfrastructureView();
    await new Promise(r => setTimeout(r, 600));

    const pmContent = document.getElementById('pmContent');
    const text = pmContent ? pmContent.innerText : '';

    return {
      hasLoader,
      hasPmContent: !!pmContent,
      textSnippet: text.slice(0, 400),
      hasContainers: text.includes('DOCKER CONTAINERS') && !text.includes('13\n● 100% Healthy'), // should show real 9
      hasRuntimeServices: text.includes('/api/v2/runtime/full-status'),
      hasPm2: text.includes('PROCESSOS PM2')
    };
  });

  console.log('Infrastructure View Eval Result:', evalResult);

  const outDir = '/tmp/fenix_v2_shots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/view-infrastructure-certified.png` });
  console.log(`Saved screenshot to ${outDir}/view-infrastructure-certified.png`);

  console.log('Console Errors count:', errors.length);
  if (errors.length) console.log('Errors:', errors.slice(0, 5));

  await browser.close();

  if (evalResult.hasLoader && evalResult.hasRuntimeServices && evalResult.hasPm2) {
    console.log('CYCLE 2 (INFRASTRUCTURE VIEW): PASS ✅');
    process.exit(0);
  } else {
    console.error('CYCLE 2 (INFRASTRUCTURE VIEW): FAIL ❌');
    process.exit(1);
  }
})();
