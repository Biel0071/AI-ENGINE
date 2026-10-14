const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('../src/server');
const { randomBytes } = require('node:crypto');

async function main() {
  process.env.FENIX_BOOTSTRAP_TENANT_ID = 'grg';
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = 'screenshot-admin';
  const screenshotPassword = randomBytes(32).toString('base64url');
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = screenshotPassword;
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';

  console.log('[Screenshot] Starting server...');
  const server = await start(0, { operationalActivation: false });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Screenshot] Server running at ${baseUrl}`);

  // Authenticate
  const loginRes = await new Promise((resolve, reject) => {
    const body = JSON.stringify({
      tenantId: 'grg',
      userId: 'screenshot-admin',
      password: screenshotPassword
    });
    const req = http.request(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const token = loginRes.token;
  console.log('[Screenshot] Logged in successfully, token received.');

  const outDir = path.resolve(__dirname, '../qa-results/playwright');
  fs.mkdirSync(outDir, { recursive: true });
  const screenshotPath = path.join(outDir, 'fenix-city-1080p.png');

  console.log('[Screenshot] Launching chromium browser at 1920x1080...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  await context.addCookies([
    { name: 'fenix_session', value: encodeURIComponent(token), url: baseUrl, httpOnly: true, sameSite: 'Lax' }
  ]);
  await context.addInitScript((val) => {
    localStorage.setItem('grg_token', val);
    localStorage.setItem('fenix_token', val);
  }, token);

  const page = await context.newPage();
  console.log('[Screenshot] Navigating to city view...');
  await page.goto(`${baseUrl}/app?qa=playwright#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[Screenshot] Waiting for city view hydration...');
  await page.waitForTimeout(4000);

  // Trigger inspector open for deposito-mais explicitly to be 100% sure
  await page.evaluate(async () => {
    window.showView?.('city');
    window.FenixSidebar?.openInspector?.('deposito-mais');
    if (typeof window.refreshAll === 'function') {
      try { await window.refreshAll(); } catch (_) {}
    }
  });
  await page.waitForTimeout(3000);

  console.log(`[Screenshot] Saving screenshot to ${screenshotPath}...`);
  await page.screenshot({ path: screenshotPath });
  console.log('   ✅ Screenshot captured successfully!');

  await browser.close();
  server.close();
  process.exit(0);
}

main().catch(err => {
  console.error('[Screenshot] Error:', err);
  process.exit(1);
});
