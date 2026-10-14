const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('request', req => {
    if (req.url().includes('terminal')) console.log('REQ:', req.method(), req.url());
  });
  page.on('response', res => {
    if (res.url().includes('terminal')) console.log('RES:', res.status(), res.url());
  });

  console.log('Navigating to http://127.0.0.1:3000/#terminal...');
  await page.goto('http://127.0.0.1:3000/#terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('Testing direct fetch to /api/v2/terminal/exec...');
  const directFetch = await page.evaluate(async () => {
    const t0 = Date.now();
    try {
      const res = await fetch('/api/v2/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'uptime', cwd: '/opt/fenix-os/grg/src' })
      });
      const data = await res.json();
      return { elapsed: Date.now() - t0, ok: res.ok, status: res.status, data };
    } catch(e) {
      return { elapsed: Date.now() - t0, error: e.message };
    }
  });
  console.log('Direct fetch result:', directFetch);

  console.log('Testing terminalBtn click...');
  const btnClickResult = await page.evaluate(async () => {
    const cmdInput = document.getElementById('terminalCmd');
    const cmdBtn = document.getElementById('terminalBtn');
    const termResult = document.getElementById('terminalResult');
    if (!cmdInput || !cmdBtn) return { error: 'Inputs not found' };

    cmdInput.value = 'uptime';
    cmdBtn.click();

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (termResult && !cmdBtn.disabled && !termResult.textContent.includes('[Executando no host...]')) {
        break;
      }
    }
    return {
      btnDisabled: cmdBtn.disabled,
      btnText: cmdBtn.textContent,
      output: termResult ? termResult.textContent : ''
    };
  });
  console.log('Btn click result:', btnClickResult);

  await browser.close();
})();
