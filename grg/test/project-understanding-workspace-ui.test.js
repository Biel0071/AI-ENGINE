'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { start } = require('../src/server');
const { GraphBrain } = require('../src/brain/graph-brain');
const { SystemTwinEngine } = require('../src/reconstruction/system-twin');

test('authenticated Project Hub maps a project and renders the persisted evidence report', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-map-ui-'));
  const systemStateDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-map-ui-state-'));
  const dataFile = path.join(os.tmpdir(), `fenix-map-ui-${crypto.randomUUID()}.json`);
  const password = crypto.randomBytes(24).toString('base64url');
  let server;
  let browser;
  t.after(async () => {
    await browser?.close();
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    }
    await fs.rm(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await fs.rm(systemStateDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await fs.rm(dataFile, { force: true });
  });

  execFileSync('git', ['init', '-b', 'main'], { cwd: workspace, stdio: 'ignore' });
  await fs.mkdir(path.join(workspace, 'src'));
  await fs.writeFile(path.join(workspace, 'package.json'), JSON.stringify({ dependencies: { express: '^5.0.0' } }));
  await fs.writeFile(path.join(workspace, 'src', 'app.js'), "const app = require('express')();\napp.get('/api/health', () => 'ok');\n");
  execFileSync('git', ['add', 'package.json', 'src/app.js'], { cwd: workspace, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.email=fenix@test.invalid', '-c', 'user.name=Fenix Test', 'commit', '-m', 'fixture'], { cwd: workspace, stdio: 'ignore' });

  const graphBrain = new GraphBrain({ storagePath: path.join(systemStateDirectory, 'graph.json') });
  const systemTwinEngine = new SystemTwinEngine({ storageDir: path.join(systemStateDirectory, 'twins'), graphBrain });
  server = await start(0, { dataFile, graphBrain, systemTwinEngine, llm: false, localRuntimeWorker: false, bootstrapAdmin: { tenantId: 'grg', userId: 'project-ui-admin', password, tenantName: 'Project UI Test', name: 'Project UI Admin', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  const loginResponse = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: 'grg', userId: 'project-ui-admin', password }) });
  const login = await loginResponse.json();
  const sessionCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
  assert.ok(login.token);
  assert.match(sessionCookie || '', /^fenix_session=/);
  const headers = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
  const created = await fetch(`${base}/api/fenix/projects`, { method: 'POST', headers, body: JSON.stringify({ id: 'project-map-ui', name: 'Project map UI', workspace }) });
  assert.equal(created.status, 201);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const [cookieName, cookieValue] = sessionCookie.split('=', 2);
  await context.addCookies([{ name: cookieName, value: cookieValue, domain: '127.0.0.1', path: '/' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, login.token);
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(20000);
  const pageErrors = [];
  const analysisResponses = [];
  const failedRoutes = new Map();
  const expectedBearer = `Bearer ${login.token}`;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === base) {
      const pathname = new URL(response.url()).pathname;
      const bearer = response.request().headers()['authorization'];
      failedRoutes.set(pathname, { status: response.status(), bearerSent: Boolean(bearer), bearerMatchesTestSession: bearer === expectedBearer });
    }
    if (/\/api\/fenix\/projects\/project-map-ui\/(?:analyze|analysis)$/.test(response.url())) analysisResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
  });
  await page.goto(`${base}/index.html#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-nav="projects"]').click();
  await page.locator('#flpCards [data-project-id="project-map-ui"]').waitFor({ state: 'visible' });
  await page.locator('#flpCards [data-project-id="project-map-ui"]').click();
  await page.getByRole('button', { name: 'Mapear Sistema' }).click();
  await page.getByText('Mapa estrutural com evidências').waitFor({ state: 'visible' });
  await page.getByText('GET /api/health', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('NÃO EXECUTADOS', { exact: true }).waitFor({ state: 'visible' });
  const intelligenceSummary = await page.locator('.flp-intelligence-summary').innerText();
  assert.match(intelligenceSummary, /SYSTEM TWIN[\s\S]*Vinculado/i);
  assert.match(intelligenceSummary, /GRAPH BRAIN[\s\S]*LINKED/i);
  assert.deepEqual(analysisResponses.map((item) => item.status), [202, 200]);
  assert.deepEqual(pageErrors, []);
  const savedMap = await fetch(`${base}/api/fenix/projects/project-map-ui/analysis`, { headers }).then((response) => response.json());
  assert.equal(savedMap.integration.status, 'LINKED');
  assert.equal(savedMap.integration.graphBrain.status, 'LINKED');
  const twin = await fetch(`${base}/api/v2/system-reconstruction/twin?id=${encodeURIComponent(savedMap.systemTwin.id)}`, { headers }).then((response) => response.json());
  assert.equal(twin.twin.perception.source, 'ProjectUnderstandingScanner');
  const graph = await fetch(`${base}/api/v2/graph/data`, { headers }).then((response) => response.json());
  assert.ok(graph.nodes.some((node) => node.id === savedMap.integration.graphBrain.projectNodeId));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-nav="projects"]').click();
  await page.locator('#flpCards [data-project-id="project-map-ui"]').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Inteligência do Sistema/ }).click();
  await page.getByText('GET /api/health', { exact: false }).waitFor({ state: 'visible' });
  await page.locator('.flp-system-observation').waitFor({ state: 'visible' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const selector of ['.flp-intelligence', '.flp-system-observation']) {
    const geometry = await page.locator(selector).evaluate((node) => ({ width: node.clientWidth, scrollWidth: node.scrollWidth }));
    assert.ok(geometry.scrollWidth <= geometry.width + 1, `System Intelligence overflows at mobile width: ${JSON.stringify(geometry)}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  server.app.systemAnalyses.directory = path.join(systemStateDirectory, 'system-analyses');
  const analysisRequest = page.waitForResponse((response) => response.url().includes('/api/system-analyses') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar análise visual e estrutural' }).click();
  const analysisResponse = await analysisRequest;
  assert.equal(analysisResponse.status(), 202);
  const analysisRun = await analysisResponse.json();
  assert.equal(analysisRun.projectId, 'project-map-ui');
  assert.ok(analysisRun.jobId, 'the visual inspection is persisted as a JobEngine job');
  await page.locator('.flp-observation-status').waitFor({ state: 'visible' });
  await page.getByText('Verificação funcional · NOT_VERIFIED', { exact: true }).waitFor({ state: 'visible' });
  await page.setViewportSize({ width: 390, height: 844 });
  const verificationGeometry = await page.locator('.flp-observation-verification').evaluate((node) => ({ width: node.clientWidth, scrollWidth: node.scrollWidth }));
  assert.ok(verificationGeometry.scrollWidth <= verificationGeometry.width + 1, `verification state overflows at mobile width: ${JSON.stringify(verificationGeometry)}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  const capturedImage = page.locator('.flp-observation-shot img').first();
  try { await capturedImage.waitFor({ state: 'visible', timeout: 60000 }); }
  catch (error) {
    const observedRun = await fetch(`${base}/api/system-analyses/${analysisRun.id}`, { headers }).then(response => response.json());
    assert.fail(`capture image not rendered: ${JSON.stringify({ status: observedRun.status, stage: observedRun.stage, progress: observedRun.progress, errors: observedRun.errors, targets: observedRun.evidence?.targets?.slice(0, 4).map(target => ({ route: target.route, status: target.status, error: target.error, images: target.images })) })}; ${error.message}`);
  }
  assert.match(await capturedImage.getAttribute('alt'), /Captura de/);
  const cancel = page.getByRole('button', { name: 'Cancelar análise' });
  if (await cancel.isVisible().catch(() => false)) {
    const cancellation = page.waitForResponse((response) => response.url().includes(`/api/system-analyses/${analysisRun.id}/cancel`) && response.request().method() === 'POST');
    await cancel.click();
    assert.equal((await cancellation).status(), 202);
  }
  const savedAnalysis = await fetch(`${base}/api/system-analyses/${analysisRun.id}`, { headers }).then((response) => response.json());
  assert.ok(['CANCELLING', 'CANCELLED', 'PARTIAL', 'COMPLETED', 'FAILED'].includes(savedAnalysis.status), `unexpected persisted status: ${savedAnalysis.status}`);
  assert.ok(savedAnalysis.evidence.targets.some((target) => target.status === 'capturado' && target.images.length > 0));

  const otherPassword = crypto.randomBytes(24).toString('base64url');
  await server.app.controlPlane.createTenant({ id: 'tenant-other', name: 'Other Tenant' }, 'other-admin');
  await server.app.auth.ensureUser('tenant-other', 'other-admin', otherPassword, 'master_admin', 'Other Admin');
  const otherLogin = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: 'tenant-other', userId: 'other-admin', password: otherPassword }) }).then((response) => response.json());
  const otherHeaders = { authorization: `Bearer ${otherLogin.token}` };
  const hiddenTwin = await fetch(`${base}/api/v2/system-reconstruction/twin?id=${encodeURIComponent(savedMap.systemTwin.id)}`, { headers: otherHeaders });
  assert.equal(hiddenTwin.status, 404, 'a different tenant must not read this project Twin');
  const otherGraph = await fetch(`${base}/api/v2/graph/data`, { headers: otherHeaders }).then((response) => response.json());
  assert.equal(otherGraph.nodes.some((node) => node.id === savedMap.integration.graphBrain.projectNodeId), false, 'a different tenant must not read this project graph');
  if (process.env.FENIX_DEBUG_UI_NETWORK === '1') console.log(`Unhealthy same-origin UI requests: ${JSON.stringify([...failedRoutes].map(([path, result]) => ({ path, ...result })))}`);
});
