import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const base = 'http://209.50.241.22:3000';
const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials), signal: AbortSignal.timeout(15000) });
const session = await login.json();
if (!login.ok || !session.token) throw new Error(`VPS login HTTP ${login.status}`);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, session.token);
  const page = await context.newPage();
  const errors = [];
  const analyzeResponses = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.url().includes('/api/fenix/projects/api-platform-live/analyze')) analyzeResponses.push(response.status()); });
  await page.goto(`${base}/app#ide`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-nav="ide"]').first().click();
  await page.waitForFunction(() => document.getElementById('fenixIdeProject')?.value === 'api-platform-live' && document.querySelectorAll('#fenixIdeLiveTree button').length > 0, { timeout: 30000 });
  const treeFiles = await page.locator('#fenixIdeLiveTree button.fenix-live-ide-file').count();
  await page.locator('#fenixIdeLiveTree button[title="app_front.js"]').click();
  await page.waitForFunction(() => document.getElementById('fenixIdeLivePath')?.textContent === 'app_front.js');
  await page.locator('#fenixIdeAnalyze').click();
  await page.waitForFunction(() => !document.getElementById('fenixIdeLiveStatus')?.textContent?.startsWith('Analisando'), { timeout: 15000 }).catch(() => {});
  const analysis = await page.locator('#fenixIdeLiveStatus').textContent();
  await page.locator('#fenixIdeLiveTree button[title="AGENTS.md"]').click();
  await page.waitForFunction(() => document.getElementById('fenixIdeLivePath')?.textContent === 'AGENTS.md');
  const screenshot = path.resolve('qa-results/playwright/vps-project-ide.png');
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const result = { ok: treeFiles > 0 && analysis.startsWith('Análise registrada') && errors.length === 0, project: await page.locator('#fenixIdeProject').inputValue(), treeFiles, file: await page.locator('#fenixIdeLivePath').textContent(), analysis, analyzeResponses, errors, screenshot };
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  await fetch(`${base}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
}
