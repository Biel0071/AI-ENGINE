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

  console.log('Navigating to http://127.0.0.1:3000/#ide...');
  await page.goto('http://127.0.0.1:3000/#ide', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const evalResult = await page.evaluate(async () => {
    const hasLoader = typeof window.loadIdeView === 'function';
    if (hasLoader) await window.loadIdeView();
    await new Promise(r => setTimeout(r, 1200));

    const fsList = document.getElementById('fsList');
    const fsItems = fsList ? fsList.querySelectorAll('.fs-item').length : 0;
    const fsText = fsList ? fsList.innerText : '';

    const textarea = document.getElementById('ideTextarea');
    const editorContent = textarea ? textarea.value : '';

    const titleEl = document.getElementById('currentEditorTitle');
    const title = titleEl ? titleEl.innerText : '';

    return {
      hasLoader,
      fsItemsCount: fsItems,
      fsHasRealFiles: fsText.includes('package.json') || fsText.includes('server.js') || fsItems > 5,
      hasContent: editorContent.length > 50,
      contentSnippet: editorContent.slice(0, 150),
      editorTitle: title
    };
  });

  console.log('IDE View Eval Result:', evalResult);

  const outDir = '/tmp/fenix_v2_shots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/view-ide-certified.png` });
  console.log(`Saved screenshot to ${outDir}/view-ide-certified.png`);

  console.log('Console Errors count:', errors.length);
  if (errors.length) console.log('Errors:', errors.slice(0, 5));

  await browser.close();

  if (evalResult.hasLoader && evalResult.fsHasRealFiles && evalResult.hasContent) {
    console.log('CYCLE 4 (IDE VIEW): PASS ✅');
    process.exit(0);
  } else {
    console.error('CYCLE 4 (IDE VIEW): FAIL ❌');
    process.exit(1);
  }
})();
