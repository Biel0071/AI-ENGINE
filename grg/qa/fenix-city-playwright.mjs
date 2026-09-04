import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
// Explicit credentials intentionally bypass the local token cache so a stale
// session cannot mask the real login/reconnect path.
let token = process.env.FENIX_QA_TOKEN || (!process.env.FENIX_USER && fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');
if (!token && process.env.FENIX_USER && process.env.FENIX_PASSWORD) {
  const login = await fetch(`${baseURL}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: process.env.FENIX_USER, password: process.env.FENIX_PASSWORD }),
  });
  const payload = await login.json();
  if (!login.ok || !payload.token) throw new Error(`API login failed: ${payload.error || login.status}`);
  token = payload.token;
}
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
if (!token && page.url().includes('GRG-login') && process.env.FENIX_USER && process.env.FENIX_PASSWORD) {
  await page.fill('#user', process.env.FENIX_USER);
  await page.fill('#pw', process.env.FENIX_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  if (page.url().includes('GRG-login')) throw new Error('login did not reach application');
}
await page.waitForFunction(() => window.FENIX?.ws?.readyState === 1, { timeout: 15000 });
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
const persistedTasks = Array.isArray(snapshot.body.payload.tasks) ? snapshot.body.payload.tasks : [];
if (persistedTasks.length) {
  const malformedTask = persistedTasks.find((task) => !task.id || !task.status || (!task.missionId && !task.jobId));
  if (malformedTask) throw new Error('runtime snapshot contains a malformed persisted task');
}
if (publishedAgents > 0) {
  const renderedAgents = await page.locator('#orchActiveAgentsList [data-agent-id]').count();
  if (renderedAgents === 0) throw new Error('snapshot has agents but Command Center rendered none');
}
await page.locator('[data-nav="command"]').first().click();
await page.locator('#view-command').waitFor({ state: 'visible' });
if (publishedAgents > 0) await page.locator('#orchActiveAgentsList [data-agent-id]').first().waitFor({ state: 'visible' });
if (persistedTasks.length > 0) {
  const missionCard = page.locator('#floatingMissionCard');
  if (await missionCard.count() && await missionCard.isVisible()) {
    await missionCard.click();
    const missionDesk = page.locator('.orch-modal').last();
    await missionDesk.waitFor({ state: 'visible' });
    const taskButtons = missionDesk.locator('[data-task-id]');
    await taskButtons.first().waitFor({ state: 'visible', timeout: 12000 });
    await taskButtons.first().click();
    const taskDesk = page.locator('.orch-modal').last();
    await taskDesk.waitFor({ state: 'visible' });
    if (!(await taskDesk.innerText()).includes('TASK DESK')) throw new Error('persisted task did not open canonical Task Desk');
    await taskDesk.locator('#modalTaskBtnClose').click();
  }
}
if (publishedAgents > 0) {
  const agentRows = page.locator('#orchActiveAgentsList [data-agent-id]');
  await agentRows.first().click();
  await page.locator('.orch-modal').last().waitFor({ state: 'visible' });
  const desk = page.locator('.orch-modal').last();
  await desk.locator('.orch-modal-window-btn').nth(0).click();
  if (!(await desk.evaluate((element) => element.classList.contains('is-minimized')))) throw new Error('agent desk did not minimize');
  await desk.locator('.orch-modal-window-btn').nth(0).click();
  await desk.locator('.orch-modal-window-btn').nth(1).click();
  if (!(await desk.evaluate((element) => element.classList.contains('is-maximized')))) throw new Error('agent desk did not maximize');
  await desk.locator('.orch-modal-window-btn').nth(1).click();
  if (await agentRows.count() > 1) {
    await agentRows.nth(1).click();
    if (await page.locator('.orch-modal').count() < 2) throw new Error('second agent desk did not open independently');
  }
}
await page.screenshot({ path: `${outputDir}/command-1440.png`, fullPage: true });
const unexpectedConsoleErrors = consoleErrors.filter((message) => !/ERR_NETWORK_CHANGED/.test(message));
if (unexpectedConsoleErrors.length) throw new Error(`browser errors: ${unexpectedConsoleErrors.join(' | ')}`);
console.log(JSON.stringify({ ok: true, views: 7, snapshotStatus: snapshot.status, publishedAgents, persistedTasks: persistedTasks.length, screenshot: `${outputDir}/command-1440.png` }));
await browser.close();
