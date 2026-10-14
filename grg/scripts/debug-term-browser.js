const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('request', req => {
    if (req.url().includes('file') || req.url().includes('terminal') || req.url().includes('reality')) {
      console.log('REQ:', req.method(), req.url());
    }
  });
  page.on('response', res => {
    if (res.url().includes('file') || res.url().includes('terminal') || res.url().includes('reality')) {
      console.log('RES:', res.status(), res.url());
    }
  });

  await page.goto('http://127.0.0.1:3000/#terminal', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const state = await page.evaluate(() => {
    const fileViewer = document.getElementById('fileViewer');
    const filePathInput = document.getElementById('currentFilePath');
    const fileSaveResult = document.getElementById('fileSaveResult');
    const terminalResult = document.getElementById('terminalResult');
    return {
      filePathInputValue: filePathInput ? filePathInput.value : 'NO_EL',
      fileViewerVal: fileViewer ? fileViewer.value.slice(0, 100) : 'NO_EL',
      fileSaveResultText: fileSaveResult ? fileSaveResult.textContent : 'NO_EL',
      terminalResultText: terminalResult ? terminalResult.textContent.slice(0, 100) : 'NO_EL'
    };
  });

  console.log('Current DOM State:', state);

  // Now manually call fetch from inside page
  const directFetch = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/v2/projects/fenix-os/file?path=' + encodeURIComponent('/opt/fenix-os/grg/src/server.js'));
      const data = await res.json();
      return { ok: res.ok, status: res.status, dataOk: data.ok, size: data.size };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Direct fetch inside page:', directFetch);

  await browser.close();
})();
