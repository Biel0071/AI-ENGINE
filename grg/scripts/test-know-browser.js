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

  console.log('Navigating to http://127.0.0.1:3000/#knowledge...');
  await page.goto('http://127.0.0.1:3000/#knowledge', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const evalResult = await page.evaluate(async () => {
    const hasLoader = typeof window.loadKnowledgeView === 'function';
    if (hasLoader) await window.loadKnowledgeView();
    await new Promise(r => setTimeout(r, 600));

    const statusEl = document.getElementById('skKnowledgeApiStatus');
    const statusText = statusEl ? statusEl.innerText : '';

    const kosEl = document.getElementById('kosManifest');
    const kosText = kosEl ? kosEl.innerText : '';

    const kgEl = document.getElementById('kgList');
    const kgText = kgEl ? kgEl.innerText : '';

    const kpiProjects = document.getElementById('skKpiProjects')?.textContent;
    const kpiScreens = document.getElementById('skKpiScreens')?.textContent;
    const kpiEdges = document.getElementById('skKpiEdges')?.textContent;

    return {
      hasLoader,
      hasHonestStatus: statusText.includes('Não disponível') || statusText.includes('404'),
      statusSnippet: statusText.replace(/\n+/g, ' '),
      hasPatterns: kosText.includes('Login Premium') || kosText.includes('Sidebar FÊNIX'),
      hasKgEdges: kgText.length > 10,
      kpis: { kpiProjects, kpiScreens, kpiEdges }
    };
  });

  console.log('Knowledge View Eval Result:', evalResult);

  const outDir = '/tmp/fenix_v2_shots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/view-knowledge-certified.png` });
  console.log(`Saved screenshot to ${outDir}/view-knowledge-certified.png`);

  console.log('Console Errors count:', errors.length);
  if (errors.length) console.log('Errors:', errors.slice(0, 5));

  await browser.close();

  if (evalResult.hasLoader && evalResult.hasHonestStatus && evalResult.hasPatterns) {
    console.log('CYCLE 3 (KNOWLEDGE VIEW): PASS ✅');
    process.exit(0);
  } else {
    console.error('CYCLE 3 (KNOWLEDGE VIEW): FAIL ❌');
    process.exit(1);
  }
})();
