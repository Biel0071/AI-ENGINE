const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[PAGE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]:', err.message));

  await page.goto('http://127.0.0.1:3000/#knowledge', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const fnString = await page.evaluate(() => typeof window.loadKnowledgeView === 'function' ? window.loadKnowledgeView.toString() : 'NOT A FUNCTION');
  console.log('=== window.loadKnowledgeView.toString() (first 500 chars) ===');
  console.log(fnString.slice(0, 500));

  console.log('\nNow executing window.loadKnowledgeView()...');
  try {
    const res = await page.evaluate(async () => {
      return await window.loadKnowledgeView();
    });
    console.log('Execution result:', res);
  } catch (e) {
    console.error('Execution error:', e);
  }

  await browser.close();
})();
