const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('LOG:', msg.text()));

  await page.goto('http://127.0.0.1:3000/#terminal', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const res = await page.evaluate(async () => {
    const fileViewer = document.getElementById('fileViewer');
    const fileSaveResult = document.getElementById('fileSaveResult');
    const targetPath = '/opt/fenix-os/grg/src/server.js';

    console.log('1. Starting test in page');
    console.log('2. fileViewer element exists?', !!fileViewer);

    try {
      console.log('3. Calling fetch directly...');
      const r = await fetch(`/api/v2/projects/fenix-os/file?path=${encodeURIComponent(targetPath)}`);
      console.log('4. Fetch returned status:', r.status);
      const data = await r.json();
      console.log('5. JSON parsed, ok:', data.ok, 'size:', data.size);
      if (fileViewer) fileViewer.value = data.content;
      if (fileSaveResult) fileSaveResult.textContent = `Arquivo carregado (${data.size} bytes).`;
      return { ok: true, valLen: fileViewer.value.length };
    } catch(err) {
      console.error('Error in fetch:', err);
      return { ok: false, error: err.message };
    }
  });

  console.log('Evaluation result:', res);
  await browser.close();
})();
