import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const base = 'http://209.50.241.22:3000';
const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('Login did not return a session');
const routes = ['command', 'city', 'agents', 'projects', 'memory', 'knowledge', 'ide', 'operations', 'flowgraph', 'terminal', 'observability', 'mcp', 'marketplace'];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => localStorage.setItem('grg_token', token), session.token);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/app#command`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const views = [];
  for (const route of routes) {
    await page.locator(`[data-nav="${route}"]`).first().click({ timeout: 30000 });
    await page.waitForTimeout(route === 'city' ? 1500 : 350);
    const state = await page.evaluate(() => ({ hash: location.hash, active: [...document.querySelectorAll('.view.active')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id), title: document.title }));
    views.push({ route, ...state });
    if (['city', 'agents', 'marketplace'].includes(route)) await page.screenshot({ path: `qa-results/playwright/vps-${route}-audit.png` });
  }
  const failures = views.filter(({ route, hash, active }) => hash !== `#${route}` || !active.includes(`view-${route}`));
  console.log(JSON.stringify({ ok: failures.length === 0 && errors.length === 0, views, failures, errors }));
  if (failures.length || errors.length) process.exitCode = 2;
} finally {
  await browser.close();
  await fetch(`${base}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
}
