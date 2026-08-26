const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const base = 'http://127.0.0.1:4400';
  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' })
  });
  if (!login.ok) throw new Error(`login failed ${login.status}`);
  const auth = await login.json();
  const token = auth.token || auth.accessToken || auth.access_token;
  if (!token) throw new Error('login did not return token');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(({ tokenValue }) => {
    localStorage.setItem('grg_token', tokenValue);
    localStorage.setItem('grg_user', 'grg-admin');
  }, { tokenValue: token });
  const page = await context.newPage();
  const consoleErrors = [];
  const networkErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/^Failed to load resource:/i.test(msg.text())) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => networkErrors.push(`${request.failure()?.errorText || 'failed'} ${request.url()}`));

  await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.tower-shell', { timeout: 30000 });
  await page.waitForTimeout(5000);

  const evidence = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent || '',
    tower: document.querySelector('.tower-shell b')?.textContent || '',
    floors: document.querySelectorAll('.tower-floor').length,
    rooms: document.querySelectorAll('.room-card').length,
    breadcrumb: Array.from(document.querySelectorAll('#towerBreadcrumb button')).map((el) => el.textContent.trim()),
    noAgentsText: document.querySelector('#agentEmptyState')?.textContent || '',
    projectMapButton: Boolean(document.querySelector('[data-city-panel="project-map"]')),
    explorerBreadcrumbMounted: Boolean(document.querySelector('#fsBreadcrumb'))
  }));

  if (evidence.tower !== 'FENIX TOWER') throw new Error(`tower not rendered: ${evidence.tower}`);
  if (evidence.floors < 13) throw new Error(`expected at least 13 floors, got ${evidence.floors}`);
  if (evidence.rooms < 2) throw new Error(`expected selected floor rooms, got ${evidence.rooms}`);
  if (!evidence.breadcrumb.includes('FENIX')) throw new Error('tower breadcrumb missing FENIX');
  if (!evidence.projectMapButton) throw new Error('project map button missing');
  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  const criticalNetwork = networkErrors.filter((item) => !/favicon\.ico/.test(item));
  if (criticalNetwork.length) throw new Error(`network errors: ${criticalNetwork.slice(0, 5).join(' | ')}`);

  const dir = path.join(process.cwd(), 'temp_artifacts');
  fs.mkdirSync(dir, { recursive: true });
  const screenshot = path.join(dir, 'phase4-fenix-tower.png');
  try {
    await page.screenshot({ path: screenshot, fullPage: false, timeout: 10000, animations: 'disabled' });
  } catch {
    const client = await context.newCDPSession(page);
    const captured = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    fs.writeFileSync(screenshot, Buffer.from(captured.data, 'base64'));
  }

  await browser.close();
  console.log(JSON.stringify({ ok: true, evidence, screenshot }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
