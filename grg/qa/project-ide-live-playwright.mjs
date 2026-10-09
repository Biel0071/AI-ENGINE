import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { start } = require('../src/server');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-ide-visual-'));
const dataFile = path.join(os.tmpdir(), `fenix-ide-visual-${crypto.randomUUID()}.json`);
const password = crypto.randomBytes(24).toString('base64url');
let server;
let browser;
try {
  execFileSync('git', ['init', '-b', 'main'], { cwd: root });
  await fs.writeFile(path.join(root, 'app.js'), 'module.exports = { ready: true };\n');
  execFileSync('git', ['add', 'app.js'], { cwd: root });
  execFileSync('git', ['-c', 'user.email=fenix@test.invalid', '-c', 'user.name=FENIX Test', 'commit', '-m', 'initial'], { cwd: root });
  server = await start(0, { dataFile, llm: false, bootstrapAdmin: { tenantId: 'grg', userId: 'ide-visual-admin', password, tenantName: 'IDE Visual', name: 'IDE Admin', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: 'grg', userId: 'ide-visual-admin', password }) }).then((response) => response.json());
  const headers = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
  await fetch(`${base}/api/fenix/projects`, { method: 'POST', headers, body: JSON.stringify({ id: 'ide-visual', name: 'Projeto de QA', workspace: root, branch: 'main' }) });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(login.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => {
    localStorage.setItem('grg_token', token);
    localStorage.setItem('fenix_token', token);
    localStorage.setItem('fenix_active_project', 'fenix-os');
    localStorage.setItem('fenix_active_project_name', 'FÊNIX HQ');
  }, login.token);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/app#ide`, { waitUntil: 'domcontentloaded' });
  const initialQaText = await page.locator('#qaSummary').textContent();
  if (/100% AUDITADO|PASSED|14\s+passou/i.test(initialQaText)) throw new Error(`QA screen exposed seeded results before loading the API: ${initialQaText}`);
  await page.evaluate(() => window.showView('dna'));
  await page.locator('#view-knowledge.active').waitFor({ state: 'visible', timeout: 3000 });
  await page.evaluate(() => window.showView('metrics'));
  await page.locator('#view-observability.active').waitFor({ state: 'visible', timeout: 3000 });
  await page.evaluate(() => window.showView('browser'));
  await page.locator('#qaSummary').waitFor({ state: 'visible', timeout: 3000 });
  await page.waitForFunction(() => document.querySelector('#qaSummary')?.textContent?.includes('NOT_RUN'));
  const qaText = await page.locator('#qaSummary').textContent();
  if (qaText.includes('100% PASS') || qaText.includes('ZERO COLISÕES')) throw new Error(`Visual QA reported unsupported success: ${qaText}`);
  await page.evaluate(() => window.showView('mcp'));
  await page.locator('#connectorList').waitFor({ state: 'visible', timeout: 3000 });
  await page.waitForFunction(() => document.querySelector('#connectorList')?.getAttribute('aria-busy') === 'false', { timeout: 5000 });
  const connectorText = await page.locator('#connectorList').textContent();
  if (connectorText.includes('Docker Engine') && connectorText.includes('ONLINE')) throw new Error('MCP screen rendered a seeded Docker connector as online');
  const mcpState = await page.evaluate(() => {
    const view = document.querySelector('#view-mcp');
    const button = document.querySelector('#checkApiBtn');
    const rect = button?.getBoundingClientRect();
    return { hash: location.hash, route: window.__fenixState?.currentRoute, active: view?.classList.contains('active'), viewDisplay: view && getComputedStyle(view).display, buttonDisplay: button && getComputedStyle(button).display, buttonVisibility: button && getComputedStyle(button).visibility, buttonRect: rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, handlers: button && { onclick: String(button.onclick), listeners: button.__fenixBound || false } };
  });
  if (!mcpState.active || mcpState.buttonDisplay === 'none' || !mcpState.buttonRect?.width || !mcpState.buttonRect?.height) throw new Error(`MCP refresh control is not visible in its active view: ${JSON.stringify(mcpState)}`);
  await page.waitForTimeout(500);
  const connectorRefresh = page.waitForRequest((request) => request.url().endsWith('/api/connectors') && request.method() === 'GET', { timeout: 5000 });
  await page.locator('#checkApiBtn').click();
  await connectorRefresh;
  await page.waitForFunction(() => document.querySelector('#checkApiBtn')?.textContent.includes('Consulta concluída'), { timeout: 5000 });
  const refreshLabel = await page.locator('#checkApiBtn').textContent();
  if (/100%\s*OK|conexões verificadas/i.test(refreshLabel)) throw new Error(`MCP refresh claimed success without evaluating the measured connector states: ${refreshLabel}`);
  await page.evaluate(() => window.showView('runtime'));
  await page.locator('#view-runtime.active #workerList').waitFor({ state: 'visible', timeout: 3000 });
  await page.waitForFunction(() => document.querySelector('#workerList')?.textContent?.includes('Fila local'));
  const runtimeText = await page.locator('#workerList').textContent();
  if (!runtimeText.includes('JobEngine')) throw new Error(`Runtime queue source was not shown: ${runtimeText}`);
  await page.evaluate(() => window.showView('operations'));
  await page.waitForFunction(() => document.querySelector('#view-operations')?.classList.contains('active'), { timeout: 3000 });
  await page.waitForFunction(() => document.querySelector('#view-operations .fenix-live-operations')?.isConnected, { timeout: 3000 });
  const operationsRoute = await page.evaluate(() => {
    const view = document.querySelector('#view-operations');
    const main = view?.querySelector('.fenix-live-operations');
    return { active: view?.classList.contains('active'), connected: main?.isConnected, liveOperations: view?.dataset.liveOperations, loader: typeof window.loadLiveOperations, display: main ? getComputedStyle(main).display : null, visibility: main ? getComputedStyle(main).visibility : null, text: main?.textContent?.slice(0, 160) };
  });
  if (!operationsRoute.active || !operationsRoute.connected) throw new Error(`Operations route did not open: ${JSON.stringify(operationsRoute)}`);
  await page.waitForTimeout(1500);
  const operationsText = await page.locator('#view-operations').textContent();
  if (/Auditoria Visual de 14 Telas|System Self-Improvement Loop|screensCertified/.test(operationsText)) throw new Error('Operations screen rendered a seeded job');
  const screenRoutes = ['command', 'city', 'agents', 'operations', 'projects', 'ide', 'terminal', 'flowgraph', 'memory', 'knowledge', 'mcp', 'marketplace', 'runtime', 'observability', 'project', 'browser'];
  for (const route of screenRoutes) {
    await page.evaluate((target) => window.showView(target), route);
    try {
      await page.waitForFunction((target) => location.hash === `#${target}` && document.getElementById(`view-${target}`)?.classList.contains('active') && document.querySelectorAll('.view.active').length === 1, route, { timeout: 10000 });
    } catch {
      const state = await page.evaluate((target) => ({
        target,
        hash: location.hash,
        hashMatches: location.hash === `#${target}`,
        targetActive: document.getElementById(`view-${target}`)?.classList.contains('active'),
        active: [...document.querySelectorAll('.view.active')].map((view) => view.id),
        route: window.__fenixState?.currentRoute,
      }), route);
      throw new Error(`Navigation to ${route} did not stabilize: ${JSON.stringify(state)}`);
    }
  }
  await page.evaluate(() => window.showView('observability'));
  await page.locator('#view-observability.active #sampleBtn').waitFor({ state: 'visible', timeout: 3000 });
  await page.waitForTimeout(500);
  const eventRefresh = page.waitForRequest((request) => request.url().includes('/api/events?limit=60') && request.method() === 'GET', { timeout: 5000 });
  await page.locator('#sampleBtn').click();
  await eventRefresh;
  await page.waitForFunction(() => document.querySelector('#sampleBtn')?.textContent.includes('Consulta concluída'), { timeout: 5000 });
  await page.evaluate(() => window.showView('ide'));
  await page.locator('#fenixIdeProject option[value="ide-visual"]').waitFor({ state: 'attached' });
  await page.locator('#fenixIdeProject').selectOption('ide-visual');
  await page.waitForFunction(
    () => document.querySelector('.fenix-context-project')?.textContent?.trim() === 'Projeto de QA',
    { timeout: 3000 }
  );
  const globallySelectedProject = await page.evaluate(() => window.GlobalSelectionStore?.selectedProject?.id || null);
  if (globallySelectedProject !== 'ide-visual') {
    throw new Error(`IDE project selection did not update the shared selection store: ${globallySelectedProject}`);
  }
  await page.locator('#fenixIdeLiveTree button[title="app.js"]').click();
  await page.waitForFunction(
    () => document.querySelector('#fenixIdeLiveStatus')?.textContent?.includes('pronto para edição'),
    { timeout: 5000 }
  );
  await page.locator('#fenixIdeCodeEditor').fill('module.exports = { ready: false };\n');
  const editorValue = await page.locator('#fenixIdeCodeEditor').inputValue();
  const saveEnabled = await page.locator('#fenixIdeLiveSave').isEnabled();
  const dirtyLabel = await page.locator('#fenixIdeDirtyState').textContent();
  if (!saveEnabled) throw new Error(`IDE edit did not enable save: ${JSON.stringify({ editorValue, dirtyLabel })}`);
  const saveResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/fenix/projects/ide-visual/file') && response.request().method() === 'PUT',
    { timeout: 5000 }
  );
  await page.locator('#fenixIdeLiveSave').click();
  const saveResponse = await saveResponsePromise;
  if (!saveResponse.ok()) throw new Error(`IDE save failed (${saveResponse.status()}): ${await saveResponse.text()}`);
  await page.waitForTimeout(1500);
  const screenshot = path.resolve('qa-results/playwright/project-ide-live.png');
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const content = await fs.readFile(path.join(root, 'app.js'), 'utf8');
  const saveStatus = await page.locator('#fenixIdeLiveStatus').textContent();
  await page.evaluate(() => window.showView('projects'));
  const projectCard = page.locator('#flpCards .flp-card[data-project-id="ide-visual"]');
  await projectCard.waitFor({ state: 'visible', timeout: 5000 });
  await projectCard.click();
  await page.locator('#flpDetail').getByRole('button', { name: 'Abrir na IDE', exact: true }).click();
  await page.waitForFunction(() => location.hash === '#ide' && document.querySelector('#fenixIdeProject')?.value === 'ide-visual');
  const hubContext = await page.evaluate(() => ({
    project: document.querySelector('#fenixIdeProject')?.value,
    context: document.querySelector('.fenix-context-project')?.textContent?.trim(),
    selected: window.GlobalSelectionStore?.selectedProject?.id || null,
  }));
  if (hubContext.project !== 'ide-visual' || hubContext.context !== 'Projeto de QA' || hubContext.selected !== 'ide-visual') {
    throw new Error(`Project Hub did not carry its project context into the IDE: ${JSON.stringify(hubContext)}`);
  }
  const result = { ok: content === 'module.exports = { ready: false };\n' && saveStatus.startsWith('Salvo com sucesso') && await page.locator('.fenix-context-project').textContent() === 'Projeto de QA' && hubContext.selected === 'ide-visual' && errors.length === 0, screenRoutes, project: await page.locator('#fenixIdeProject').inputValue(), contextProject: await page.locator('.fenix-context-project').textContent(), selectedProject: hubContext.selected, editorValue, saveStatus, savedContent: content, errors, screenshot };
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  if (server) server.close();
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(dataFile, { force: true });
}
process.exit(process.exitCode || 0);
