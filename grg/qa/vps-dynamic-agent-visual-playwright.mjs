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
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/app#agents`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-nav="agents"]').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('#fenix-agents-grid .cp-agent-name')].some((element) => element.textContent === 'Inventário de Infraestrutura'), { timeout: 30000 });
  await page.waitForFunction(() => {
    const select = document.getElementById('fenixAgentEntity');
    return select && !select.disabled && [...select.options].some((option) => option.textContent.includes('Fênix Operações'));
  }, { timeout: 30000 });
  const result = await page.evaluate(() => ({
    registered: document.getElementById('fenixAgentRegisteredCount')?.textContent,
    working: document.getElementById('fenixAgentWorkingCount')?.textContent,
    cards: document.querySelectorAll('#fenix-agents-grid .cp-agent-card').length,
    hasDynamicAgent: [...document.querySelectorAll('#fenix-agents-grid .cp-agent-name')].some((element) => element.textContent === 'Inventário de Infraestrutura'),
    legacyVisible: getComputedStyle(document.getElementById('fenixAgentsLiveTrap')).display !== 'none',
    scope: document.getElementById('fenixAgentEntity')?.selectedOptions[0]?.textContent,
  }));
  const screenshot = path.resolve('qa-results/playwright/vps-dynamic-agents.png');
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const ok = result.hasDynamicAgent && result.registered === String(result.cards) && result.cards > 19 && !result.legacyVisible && errors.length === 0;
  console.log(JSON.stringify({ ok, ...result, errors, screenshot }));
  if (!ok) process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  await fetch(`${base}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
}
