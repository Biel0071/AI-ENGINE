import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';

const credentials = JSON.parse(execFileSync('ssh', [
  '-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22',
  'node /tmp/vps-city-qa-credentials.js',
], { encoding: 'utf8', timeout: 20000 }));
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
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-nav="city"]').first().click();
  await page.locator('#cityCanvas').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/v2/living-city/agents');
    const data = await response.json();
    const canvas = document.getElementById('cityCanvas');
    const frame = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let terrainPixels = 0;
    for (let i = 0; i < frame.length; i += 16) if (frame[i + 1] > frame[i] * 1.4 && frame[i + 1] > frame[i + 2] * 1.2 && frame[i + 1] > 50) terrainPixels++;
    return { agentsStatus: response.status, agents: data.count, terrainPixels, cityAgents: window.fenixCity?.world?.agents?.size ?? null, footer: document.getElementById('cityOnlineCount')?.textContent?.trim(), canvas: [canvas.width, canvas.height] };
  });
  const screenshot = path.resolve('qa-results/playwright/vps-city-live.png');
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const ok = result.agentsStatus === 200 && result.agents > 0 && result.terrainPixels > 100 && result.footer === `${result.agents} REGISTRADOS` && errors.length === 0;
  console.log(JSON.stringify({ ok, ...result, errors, screenshot }));
  if (!ok) process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  await fetch(`${base}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
}
