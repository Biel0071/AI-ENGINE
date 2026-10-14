const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('LOG:', msg.text()));

  await page.goto('http://127.0.0.1:3000/#terminal', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const testExec = await page.evaluate(async () => {
    console.log('[DEBUG] Starting testExec');
    const fileViewer = document.getElementById('fileViewer');
    console.log('[DEBUG] Initial fileViewer.value:', fileViewer ? fileViewer.value : 'NO_EL');

    try {
      const url = '/api/v2/projects/fenix-os/file?path=' + encodeURIComponent('/opt/fenix-os/grg/src/server.js');
      console.log('[DEBUG] Fetching:', url);
      const res = await fetch(url);
      console.log('[DEBUG] Fetch status:', res.status, res.ok);
      const data = await res.json();
      console.log('[DEBUG] JSON parsed, ok:', data.ok, 'size:', data.size, 'content len:', data.content?.length);
      if (fileViewer) fileViewer.value = data.content;
      return { success: true, size: data.size, contentLen: data.content?.length };
    } catch(e) {
      console.log('[DEBUG] Error:', e.message);
      return { success: false, error: e.message };
    }
  });

  console.log('Result:', testExec);
  await browser.close();
})();
