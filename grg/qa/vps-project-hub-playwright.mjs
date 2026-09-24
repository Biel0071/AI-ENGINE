import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const base = 'http://209.50.241.22:3000';
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('VPS login returned no session token');
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, session.token);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/app#projects`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-nav="projects"]').first().click();
  await page.waitForFunction(() => document.getElementById('flpTotal')?.textContent === '2' && document.querySelectorAll('.flp-card').length === 2, { timeout: 30000 });
  const projectNames = await page.locator('.flp-card-title').allTextContents();
  const mockVisible = await page.getByText('Fênix Authentication', { exact: true }).isVisible().catch(() => false);
  const screenshot = path.resolve('qa-results/playwright/vps-project-hub-live.png');
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.locator('.flp-card[data-project-id="api-platform-live"]').click();
  const selected = await page.locator('.flp-detail-head h2').textContent();
  await page.getByRole('button', { name: 'Abrir na IDE' }).click();
  await page.waitForFunction(() => document.getElementById('fenixIdeProject')?.value === 'api-platform-live', { timeout: 30000 });
  const ideProject = await page.locator('#fenixIdeProject').inputValue();
  const ok = projectNames.includes('API Platform Live') && !mockVisible && selected === 'API Platform Live' && ideProject === 'api-platform-live' && errors.length === 0;
  console.log(JSON.stringify({ ok, projectNames, mockVisible, selected, ideProject, errors, screenshot }));
  if (!ok) process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  await fetch(`${base}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
}
