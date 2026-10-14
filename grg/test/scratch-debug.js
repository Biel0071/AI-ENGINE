'use strict';
const { chromium } = require('playwright');
const { start } = require('../src/server');

process.on('uncaughtException', err => console.log('UNCAUGHT:', err));
process.on('unhandledRejection', r => console.log('REJECTION:', r));
process.on('exit', c => console.log('EXIT CODE:', c));

(async () => {
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';
  process.env.FENIX_BOOTSTRAP_TENANT_ID = 'grg';
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = 'grg-admin';
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = 'admin';

  console.log('1. Starting server...');
  const server = await start(0, { operationalActivation: false });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('2. Server running on', baseUrl);

  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });
  const data = await res.json();
  console.log('3. Token obtained:', !!data.token);

  console.log('4. Launching chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text().slice(0, 100)));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('5. Navigating to login...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('grg_token', tok);
    localStorage.setItem('grg_user', 'grg-admin');
    localStorage.setItem('grg_remember', '1');
  }, data.token);

  console.log('6. Navigating to /app#city...');
  await page.goto(`${baseUrl}/app#city`, { waitUntil: 'domcontentloaded' });
  console.log('7. Loaded /app#city! Waiting 3s...');
  await page.waitForTimeout(3000);

  console.log('8. Checking cityCanvas3D...');
  const canvas3D = await page.$('#cityCanvas3D');
  console.log('9. cityCanvas3D exists?', !!canvas3D);

  const mode3D = await page.evaluate(() => {
    return {
      bodyClass: document.body.className,
      hasEngine: !!window.fenixWorld3D,
      hasEngine3D: !!window.fenixWorldEngine3D
    };
  });
  console.log('10. Mode state:', mode3D);

  await browser.close();
  server.closeAllConnections();
  await new Promise(r => server.close(r));
  console.log('11. Done cleanly!');
})().catch(e => console.log('SCRIPT ERR:', e));
