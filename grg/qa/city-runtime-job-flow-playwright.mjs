import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const { start } = require('../src/server');
const admin = { tenantId: 'grg', userId: 'city-qa', password: crypto.randomBytes(24).toString('base64url') };
const dataFile = path.join(os.tmpdir(), `fenix-city-qa-${crypto.randomUUID()}.json`);
const screenshot = path.resolve(process.env.FENIX_CITY_QA_SCREENSHOT || 'qa-results/playwright/city-runtime-job-flow.png');
const screenshotBase = screenshot.replace(/\.png$/i, '');
let server; let browser;
try {
  server = await start(0, { dataFile, llm: false, bootstrapAdmin: { ...admin, tenantName: 'City QA', name: 'City QA', role: 'master_admin' }, operationalActivation: false, localRuntimeWorker: false });
  const cityProject = await server.app.projectKernel.create('grg', admin.userId, { id: 'city-visual-project', name: 'City Visual Project' });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(admin) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, session.token);
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto(`${base}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.FENIX?.live?.status === 'ONLINE', { timeout: 30000 });
  const cityNav = page.locator('[data-nav="city"]').first();
  if (await cityNav.count()) await cityNav.click();
  await page.locator('#cityCanvas3D').waitFor({ state: 'visible', timeout: 15000 });
  const cityResponse = await page.evaluate(async () => {
    const response = await fetch('/api/v2/living-city/agents');
    const body = await response.json();
    return { status: response.status, count: body.count, agents: body.agents?.length };
  });
  if (cityResponse.status !== 200 || !cityResponse.agents) throw new Error(`city agents unavailable: ${JSON.stringify(cityResponse)}`);
  await page.waitForFunction((projectId) => window.fenixWorld3D?.projectNodes?.has(projectId), cityProject.id, { timeout: 20000 });
  await page.evaluate(() => { window.__cityQaEvents = []; window.addEventListener('fenix-city-event', (event) => window.__cityQaEvents.push(event.detail)); });
  let release;
  let started;
  const startedSignal = new Promise((resolve) => { started = resolve; });
  const releaseSignal = new Promise((resolve) => { release = resolve; });
  server.app.jobs.register('city.visual-probe', async () => { started(); await releaseSignal; return { verified: true }; });
  const job = await server.app.jobs.submit('grg', admin.userId, { type: 'city.visual-probe', requiredCapabilities: ['backend'], maxAttempts: 1 });
  const running = server.app.jobs.run('grg', job.id, 'city-visual-worker');
  await startedSignal;
  await page.waitForFunction((jobId) => window.__cityQaEvents?.some((item) => item.type === 'runtime.job.started' && item.payload?.jobId === jobId), job.id, { timeout: 15000 });
  const cityWhileRunning = await page.evaluate(async (agentId) => {
    const response = await fetch('/api/v2/living-city/agents');
    const body = await response.json();
    return body.agents.find((agent) => agent.id === agentId);
  }, job.agent.agentId);
  if (cityWhileRunning?.status !== 'WORKING' || cityWhileRunning.currentJob?.id !== job.id) throw new Error('assigned agent was not working in City projection');
  release();
  const done = await running;
  if (done.status !== 'SUCCEEDED') throw new Error(`job ended ${done.status}`);
  await page.waitForFunction((jobId) => window.__cityQaEvents?.some((item) => item.type === 'runtime.job.succeeded' && item.payload?.jobId === jobId), job.id, { timeout: 15000 });
  await page.waitForFunction((agentId) => window.fenixWorld3D?.agents?.has(agentId), job.agent.agentId, { timeout: 20000 });
  const events = await page.evaluate(() => window.__cityQaEvents.filter((item) => item.type.startsWith('runtime.job.')).map((item) => item.type));
  const initialCameraDistance = await page.evaluate(() => window.fenixWorld3D?.cameraState?.targetDistance ?? null);
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: `${screenshotBase}-world.png`, fullPage: true });
  await page.evaluate(() => {
    const world = window.fenixWorld3D;
    world.focusEntity(new THREE.Vector3(26, 0, -10), 38, 1.62, 0.28);
    world.saveCamera();
  });
  await page.screenshot({ path: `${screenshotBase}-building.png`, fullPage: true });
  const expectedCamera = await page.evaluate((agentId) => {
    const world = window.fenixWorld3D;
    world.focusAgent(agentId);
    world.saveCamera();
    return {
      target: world.cameraState.targetLookAt.toArray(),
      distance: world.cameraState.targetDistance,
    };
  }, job.agent.agentId);
  await page.screenshot({ path: `${screenshotBase}-agent.png`, fullPage: true });
  await page.evaluate(() => window.fenixWorld3D?.resetCamera?.());
  await page.waitForFunction(() => (window.fenixWorld3D?.cameraState?.distance || 0) > 150, { timeout: 10000 });
  const projectTarget = await page.evaluate((projectId) => {
    const world = window.fenixWorld3D;
    const node = world?.projectNodes?.get(projectId);
    const canvas = document.getElementById('cityCanvas3D');
    if (!node || !canvas || !world.camera) return null;
    const point = new THREE.Vector3();
    node.hitBox.getWorldPosition(point);
    point.project(world.camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((point.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - point.y) / 2) * rect.height,
      depth: point.z,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    };
  }, cityProject.id);
  if (!projectTarget || projectTarget.depth < -1 || projectTarget.depth > 1) throw new Error('real project site is not projected into the City canvas');
  if (projectTarget.x < projectTarget.rect.left || projectTarget.x > projectTarget.rect.left + projectTarget.rect.width || projectTarget.y < projectTarget.rect.top || projectTarget.y > projectTarget.rect.top + projectTarget.rect.height) throw new Error(`real project site is outside the visible canvas: ${JSON.stringify(projectTarget)}`);
  await page.mouse.move(projectTarget.x, projectTarget.y);
  await page.waitForTimeout(100);
  const projectHover = await page.evaluate(() => window.fenixWorld3D?.hoveredObject?.userData || null);
  if (projectHover?.type !== 'project' || projectHover.projectId !== cityProject.id) throw new Error(`project site is not interactive at its rendered location: ${JSON.stringify({ projectTarget, projectHover })}`);
  await page.mouse.click(projectTarget.x, projectTarget.y);
  await page.waitForTimeout(150);
  const projectClickDebug = await page.evaluate(() => ({
    selected: window.fenixWorld3D?.state?.selected || null,
    level: window.fenixWorld3D?.state?.level || null,
    inspectorDisplay: document.getElementById('fenixWorldBuildingInspector')?.style.display || null,
    projectInspector: typeof window.fenixShowWorldProjectInspector,
    hovered: window.fenixWorld3D?.hoveredObject?.userData || null,
  }));
  if (projectClickDebug.selected?.id !== cityProject.id || projectClickDebug.inspectorDisplay !== 'block') {
    throw new Error(`click did not select and inspect the real project: ${JSON.stringify(projectClickDebug)}`);
  }
  const projectInspector = page.locator('#fenixWorldBuildingInspector');
  await projectInspector.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction((projectName) => document.querySelector('#fenixWorldBuildingInspector [data-project-name]')?.textContent === projectName, cityProject.name, { timeout: 10000 });
  const projectCameraBeforeOpen = await page.evaluate(() => window.fenixWorld3D?.cameraState?.targetLookAt?.toArray?.() || null);
  await page.screenshot({ path: `${screenshotBase}-project.png`, fullPage: true });
  await projectInspector.locator('[data-action="open-project"]').click();
  await page.waitForFunction(() => location.hash === '#projects' && document.getElementById('view-projects')?.classList.contains('active'), { timeout: 10000 });
  await page.waitForFunction((projectName) => document.querySelector('#flpDetail h2')?.textContent === projectName, cityProject.name, { timeout: 20000 });
  const projectNavigation = await page.evaluate((projectId) => ({
    selectedProject: document.querySelector('#flpDetail h2')?.textContent || null,
    projectsViewActive: document.getElementById('view-projects')?.classList.contains('active') || false,
    projectDetailVisible: Boolean(document.querySelector('#flpDetail h2')),
    activeViews: [...document.querySelectorAll('.view.active')].map((view) => view.id),
    route: window.__fenixState?.currentRoute || null,
    hash: location.hash,
    projectId,
  }), cityProject.id);
  if (projectNavigation.selectedProject !== cityProject.name || !projectNavigation.projectsViewActive) throw new Error(`project inspector did not open its real workspace: ${JSON.stringify(projectNavigation)}`);
  await page.evaluate(() => window.showView?.('city'));
  await page.waitForFunction(() => document.getElementById('view-city')?.classList.contains('active'), { timeout: 10000 });
  const projectCameraTarget = await page.evaluate(() => window.fenixWorld3D?.cameraState?.targetLookAt?.toArray?.() || null);
  const cameraReturned = projectCameraBeforeOpen && projectCameraTarget?.every((value, index) => Math.abs(value - projectCameraBeforeOpen[index]) < 0.01);
  const cityProjectFlow = projectTarget && projectNavigation.projectDetailVisible && cameraReturned;
  await page.evaluate(() => window.fenixCity?.back?.());
  const expectedReloadCamera = await page.evaluate(() => ({
    target: window.fenixWorld3D?.cameraState?.targetLookAt?.toArray?.() || null,
    distance: window.fenixWorld3D?.cameraState?.targetDistance ?? null,
  }));
  await page.goto(`${base}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#cityCanvas3D').waitFor({ state: 'visible', timeout: 15000 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#cityCanvas3D').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.fenixWorld3D?.renderer), { timeout: 15000 });
  await page.waitForFunction((agentId) => window.fenixWorld3D?.agents?.has(agentId), job.agent.agentId, { timeout: 20000 });
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  const cityDebug = await page.evaluate((agentId) => {
    const city = window.fenixWorld3D;
    const canvas = document.getElementById('cityCanvas3D');
    return {
      agents: city?.agents?.size ?? null,
      jobAgentVisible: city?.agents?.has(agentId) ?? false,
      cameraTarget: city?.cameraState?.targetLookAt?.toArray?.() ?? null,
      cameraDistance: city?.cameraState?.targetDistance ?? null,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      rendererReady: Boolean(city?.renderer),
    };
  }, job.agent.agentId);
  const cameraRestored = cityDebug.cameraTarget?.every((value, index) => Math.abs(value - expectedReloadCamera.target[index]) < 0.01)
    && Math.abs(cityDebug.cameraDistance - expectedReloadCamera.distance) < 0.01;
  await page.screenshot({ path: screenshot, fullPage: true });
  const ok = cityDebug.jobAgentVisible && cityDebug.rendererReady && initialCameraDistance >= 150 && cameraRestored && cityDebug.canvas?.width > 0 && cityDebug.canvas?.height > 0 && cityProjectFlow && browserErrors.length === 0;
  console.log(JSON.stringify({ ok, cityResponse, projectNavigation, cityProjectFlow, jobId: job.id, events, initialCameraDistance, expectedCamera, expectedReloadCamera, cameraRestored, cityDebug, browserErrors, screenshots: { world: `${screenshotBase}-world.png`, building: `${screenshotBase}-building.png`, agent: `${screenshotBase}-agent.png`, project: `${screenshotBase}-project.png`, restored: screenshot } }));
  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.rm(dataFile, { force: true }).catch(() => {});
}
process.exit(process.exitCode || 0);
