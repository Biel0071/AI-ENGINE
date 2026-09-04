import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const token = process.env.FENIX_QA_TOKEN || (fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');
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

await page.goto(`${baseURL}/app?qa=playwright#command`, { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outputDir}/command-1440.png`, fullPage: true });
for (const view of ['agents', 'operations', 'ide', 'memory', 'mcp', 'runtime', 'command']) {
  await page.locator(`[data-nav="${view}"]`).first().click();
  await page.waitForTimeout(350);
  await page.locator(`#view-${view}`).waitFor({ state: 'visible' });
}
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
if (consoleErrors.length) throw new Error(`browser errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify({ ok: true, views: 7, snapshotStatus: snapshot.status, screenshot: `${outputDir}/command-1440.png` }));
await browser.close();
