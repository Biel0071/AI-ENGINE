import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
// Explicit credentials intentionally bypass the local token cache so a stale
// session cannot mask the real login/reconnect path.
const token = process.env.FENIX_QA_TOKEN || (!process.env.FENIX_USER && fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');
const outputDir = 'qa-results/playwright';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
await context.addInitScript((value) => { localStorage.setItem('grg_token', value); localStorage.setItem('fenix_token', value); }, token);
const page = await context.newPage();
page.setDefaultTimeout(8000);
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.goto(`${baseURL}${token ? '/app?qa=playwright#command' : '/GRG-login'}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1000);
if ((page.url().includes('GRG-login') || !token) && process.env.FENIX_USER && process.env.FENIX_PASSWORD) {
  await page.fill('#user', process.env.FENIX_USER);
  await page.fill('#pw', process.env.FENIX_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  if (page.url().includes('GRG-login')) throw new Error('login did not reach application');
}
await page.waitForFunction(() => window.FENIX?.ws?.readyState === 1, { timeout: 15000 });
await page.screenshot({ path: `${outputDir}/command-1440.png`, fullPage: true });
for (const view of ['agents', 'operations', 'ide', 'memory', 'mcp', 'runtime', 'command']) {
  await page.locator(`[data-nav="${view}"]`).first().click();
  await page.waitForTimeout(350);
  await page.locator(`#view-${view}`).waitFor({ state: 'visible' });
}
// Exercise the real recovery path: close the live socket from the page,
// observe reconnecting, then require a fresh authenticated connection without
// reloading the document.
await page.evaluate(() => window.FENIX?.ws?.close());
await page.waitForFunction(() => ['RECONNECTING', 'CONNECTING', 'SYNCING'].includes(window.FENIX?.live?.status), { timeout: 3000 }).catch(() => {});
await page.waitForFunction(() => window.FENIX?.ws?.readyState === 1, { timeout: 12000 });
// Snapshot recovery may legitimately back off on HTTP 429 before promoting
// SYNCING to ONLINE; wait for the state machine, not just the socket.
let reconnectStatus = 'UNKNOWN';
for (let attempt = 0; attempt < 60; attempt += 1) {
  reconnectStatus = await page.evaluate(() => window.FENIX?.live?.status || 'UNKNOWN');
  if (reconnectStatus === 'ONLINE') break;
  await page.waitForTimeout(500);
}
if (reconnectStatus !== 'ONLINE') throw new Error(`reconnect did not return ONLINE: ${reconnectStatus}`);
const snapshot = await page.evaluate(async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch('/runtime/snapshot', { headers: { Authorization: `Bearer ${localStorage.getItem('grg_token') || ''}` } });
    if (response.status !== 429) return { status: response.status, body: await response.json() };
    const seconds = Math.min(Number(response.headers.get('retry-after') || 2), 5);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
  return { status: 429, body: { error: 'rate limited after retries' } };
});
if (snapshot.status !== 200) throw new Error(`runtime snapshot returned HTTP ${snapshot.status}`);
if (!snapshot.body?.payload) throw new Error('runtime snapshot has no payload');
const publishedAgents = Array.isArray(snapshot.body.payload.agents) ? snapshot.body.payload.agents.length : 0;
if (publishedAgents > 0) {
  const renderedAgents = await page.locator('#orchActiveAgentsList [data-agent-id]').count();
  if (renderedAgents === 0) throw new Error('snapshot has agents but Command Center rendered none');
}
if (consoleErrors.length) throw new Error(`browser errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify({ ok: true, views: 7, snapshotStatus: snapshot.status, publishedAgents, screenshot: `${outputDir}/command-1440.png` }));
await browser.close();
