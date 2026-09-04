import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const token = process.env.FENIX_QA_TOKEN || (fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');
const outputDir = 'qa-results/playwright';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript((value) => localStorage.setItem('grg_token', value), token);
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.goto(`${baseURL}/app?qa=playwright#command`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outputDir}/command-1440.png`, fullPage: true });
for (const view of ['agents', 'operations', 'ide', 'memory', 'mcp', 'runtime', 'command']) {
  await page.goto(`${baseURL}/app?qa=playwright#${view}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.locator(`#view-${view}`).waitFor({ state: 'visible' });
}
const snapshot = await page.evaluate(async () => {
  const response = await fetch('/runtime/snapshot', { headers: { Authorization: `Bearer ${localStorage.getItem('grg_token') || ''}` } });
  return { status: response.status, body: await response.json() };
});
if (snapshot.status !== 200) throw new Error(`runtime snapshot returned HTTP ${snapshot.status}`);
if (!snapshot.body?.payload) throw new Error('runtime snapshot has no payload');
if (consoleErrors.length) throw new Error(`browser errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify({ ok: true, views: 7, snapshotStatus: snapshot.status, screenshot: `${outputDir}/command-1440.png` }));
await browser.close();
