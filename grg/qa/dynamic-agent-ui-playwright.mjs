import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { start } = require('../src/server');
const admin = { tenantId: 'grg', userId: 'agent-ui-qa', password: crypto.randomBytes(24).toString('base64url') };
const dataFile = path.join(os.tmpdir(), `fenix-agent-ui-${crypto.randomUUID()}.json`);
const screenshot = path.resolve('qa-results/playwright/dynamic-agent-ui.png');
let server; let browser;
try {
  server = await start(0, { dataFile, llm: false, bootstrapAdmin: { ...admin, tenantName: 'Agent UI QA', name: 'Agent UI QA', role: 'master_admin' }, operationalActivation: false, localRuntimeWorker: false });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, session.token);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/app#agents`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-nav="agents"]').first().click();
  await page.locator('#fenixAgentTeamName').fill('Equipe de Pesquisa');
  await page.getByRole('button', { name: 'Criar equipe', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('fenixAgentEntity')?.value, { timeout: 15000 });
  await page.locator('#fenixAgentName').fill('Investigador de API');
  await page.locator('#fenixAgentRole').fill('Pesquisa de API');
  await page.getByRole('button', { name: 'Criar agente', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('fenixAgentCreatorStatus')?.textContent?.includes('criado e registrado'), { timeout: 15000 });
  await page.waitForFunction(() => [...document.querySelectorAll('#fenix-agents-grid .cp-agent-name')].some((element) => element.textContent === 'Investigador de API'), { timeout: 15000 });
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  const listRows = await page.locator('#fenixAgentsListView tbody tr').count();
  await page.getByRole('button', { name: /^Visão/ }).click();
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/v2/living-city/agents');
    const city = await response.json();
    const agent = city.agents.find((item) => item.name === 'Investigador de API');
    const legacy = document.getElementById('fenixAgentsLiveTrap');
    return { status: response.status, count: city.count, cardCount: document.querySelectorAll('#fenix-agents-grid .cp-agent-card').length, legacyChildren: legacy?.querySelectorAll('#agentCardsGrid > *').length || 0, agentId: agent?.id || null, agentKind: agent?.kind || null, registered: document.getElementById('fenixAgentRegisteredCount')?.textContent, working: document.getElementById('fenixAgentWorkingCount')?.textContent, creatorStatus: document.getElementById('fenixAgentCreatorStatus')?.textContent };
  });
  await page.waitForTimeout(800);
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const ok = result.status === 200 && result.agentKind === 'cognitive' && result.cardCount === result.count && listRows === result.count && result.registered === String(result.count) && errors.length === 0;
  console.log(JSON.stringify({ ok, ...result, listRows, errors, screenshot }));
  if (!ok) process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.rm(dataFile, { force: true }).catch(() => {});
}
process.exit(process.exitCode || 0);
