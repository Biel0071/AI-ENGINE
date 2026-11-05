'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('Project Hub lists observed project screens and opens the project Screen DNA', async (t) => {
  const app = express();
  app.get('/portfolio-fixture', (_req, res) => res.type('html').send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-hub-live.css"><main id="view-projects"></main><script src="/project-hub-live.js"></script>'));
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.__screenIdeHandoff = [];
    window.fenixSelectIdeProject = async (projectId) => { window.__screenIdeHandoff.push({ projectId }); return true; };
    window.fenixSelectIdeFile = async (file) => { window.__screenIdeHandoff.push({ file }); return true; };
    window.fenixSetIdePreviewTarget = async (projectId, screen) => { window.__screenIdeHandoff.push({ previewProjectId: projectId, screenId: screen.screenId, route: screen.route, sourceFile: screen.sourceFile }); return true; };
    window.fenixOpenFlowGraph = (context) => { window.__screenFlowHandoff = context; };
  });
  page.setDefaultTimeout(1800);
  const pageErrors = [];
  const consoleMessages = [];
  let absorptionReads = 0;
  page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleMessages.push(message.text()); });
  await page.route('**/test/fixtures/demo-screen.png', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64') }));
  await page.route('**/test/fixtures/real-screen.svg', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#17181c"/><rect x="16" y="16" width="288" height="26" rx="6" fill="#303137"/><rect x="16" y="56" width="136" height="108" rx="8" fill="#222328"/><rect x="164" y="56" width="140" height="108" rx="8" fill="#222328"/></svg>' }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let body = {};
    if (url.pathname === '/api/fenix/projects') body = { projects: [{ id: 'demo', name: 'Projeto Demo', workspace: 'C:/workspace/demo', screens: [{ id: 'demo-unmeasured', title: 'Configuração', route: '/config' }, { id: 'admin-home', title: 'Admin', route: '/home', applicationId: 'admin' }, { id: 'store-home', title: 'Storefront', route: '/home', applicationId: 'store' }] }] };
    else if (url.pathname === '/api/fenix/projects/demo/state') body = { progress: { totalJobs: 0, running: 0, failed: 0 } };
    else if (url.pathname === '/api/v2/pages') body = { pages: Array.from({ length: 5 }, (_, index) => ({ id: `demo-${index}`, title: index === 0 ? 'Visão Geral' : `Tela ${index + 1}`, route: index === 0 ? '/' : `/tela-${index + 1}`, screenshot: index === 0 ? '/test/fixtures/demo-screen.png' : '/test/fixtures/real-screen.svg', screenshotFreshness: 'ARCHIVED', screenshotCapturedOn: '2026-10-01' })) };
    else if (url.pathname === '/api/v2/company/projects/demo/absorption') {
      absorptionReads += 1;
      body = { projectId: 'demo', screens: [{ screenId: 'demo-settings', name: 'Settings Console', route: '/settings', sourceFile: 'src/pages/Settings.tsx', captureStatus: 'NOT_CAPTURED', source: 'PROJECT_ABSORPTION' }] };
    }
    else if (url.pathname === '/api/v2/frontend-reality/screens') body = { projectId: 'fenix_enterprise', totalScreens: 9, status: 'STATIC_INVENTORY', verificationStatus: 'NOT_VERIFIED', screens: ['City', 'Projects', 'Agents', 'IDE', 'Memory', 'Runtime', 'Command', 'DNA', 'Metrics'].map((title) => ({ screenId: `screen_${title.toLowerCase()}`, title, route: `#${title.toLowerCase()}`, relPath: 'public/index.html', evidenceSource: 'STATIC_SOURCE', verificationStatus: 'NOT_VERIFIED' })) };
    else if (url.pathname === '/api/fenix/projects/demo/git') body = { branch: 'main', remote: null, clean: true };
    else if (url.pathname === '/api/fenix/projects/demo/git/connection') body = { connected: false };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/portfolio-fixture#projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#flpModeScreens');
  assert.equal(await page.getByRole('button', { name: 'MEUS PROJETOS' }).count(), 1, 'Project Hub exposes the user project catalog');
  await page.getByRole('button', { name: 'MEUS PROJETOS' }).click();
  await page.getByText(/O catálogo local é lido na máquina que executa o Fênix/i).waitFor();
  await page.getByRole('button', { name: 'PROJETOS FÊNIX' }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.flp-hub-mode-tab.active')).color === 'rgb(100, 170, 255)');
  const projectSurface = await page.locator('.fenix-live-projects').evaluate((node) => ({ font: getComputedStyle(node).fontFamily, buttonBackground: getComputedStyle(node.querySelector('.flp-button-primary')).backgroundColor, activeTabColor: getComputedStyle(node.querySelector('.flp-hub-mode-tab.active')).color, cardShadow: getComputedStyle(node.querySelector('.flp-metrics > div')).boxShadow, buttonHeight: node.querySelector('.flp-button-primary').getBoundingClientRect().height }));
  assert.match(projectSurface.font, /-apple-system|system-ui/i, `Project Hub uses system typography: ${JSON.stringify(projectSurface)}`);
  assert.equal(projectSurface.buttonBackground, 'rgb(10, 132, 255)', `primary action uses the system blue: ${JSON.stringify(projectSurface)}`);
  assert.equal(projectSurface.activeTabColor, 'rgb(100, 170, 255)', `selected navigation uses the system accent: ${JSON.stringify(projectSurface)}`);
  assert.equal(projectSurface.cardShadow, 'none', `metric surfaces avoid decorative shadows: ${JSON.stringify(projectSurface)}`);
  assert.ok(projectSurface.buttonHeight >= 40, `primary actions have comfortable hit targets: ${JSON.stringify(projectSurface)}`);
  await page.getByRole('button', { name: /Telas & DNA/i }).click();
  const systemMap = page.getByRole('region', { name: 'Mapa de telas do GRG SPACE' });
  await systemMap.waitFor();
  await systemMap.getByText('City', { exact: true }).waitFor();
  assert.equal(await systemMap.getByText(/Inventário do HTML/).count(), 1, 'map distinguishes static discovery from runtime verification');
  assert.equal(await systemMap.getByRole('heading', { name: /Comando/ }).count(), 1, 'screens are grouped by their mapped functional domain');
  assert.equal(await systemMap.getByRole('heading', { name: /Construção/ }).count(), 1, 'project and IDE routes share the build domain');
  assert.equal(await systemMap.getByText('runtime visual, workers e métricas').count(), 1, 'screen purpose is visible from the system inventory');
  assert.equal(await systemMap.getByText('Command', { exact: true }).count(), 0, 'legacy command route is not shown as a second screen');
  assert.equal(await systemMap.getByText(/3 aliases legados ocultos/).count(), 1, 'legacy routes remain counted and disclosed');
  assert.equal(await systemMap.locator('.flp-shell-screen-map-item').count(), 4, 'screen map starts with a compact four-route overview');
  await systemMap.getByRole('button', { name: 'Ver todas as 6 telas' }).click();
  assert.equal(await systemMap.locator('.flp-shell-screen-map-item').count(), 6, 'screen map expands to the full shell inventory');
  assert.equal(await systemMap.getByText('2 leituras · 1 ação declarada', { exact: true }).count(), 1, 'declared read and action contracts remain visible without implying execution');
  if (process.env.FENIX_PORTFOLIO_DESKTOP_SCREENSHOT) await page.screenshot({ path: process.env.FENIX_PORTFOLIO_DESKTOP_SCREENSHOT, fullPage: true });
  await systemMap.getByRole('button', { name: 'Abrir tela City' }).click();
  assert.equal(new URL(page.url()).hash, '#city', 'mapped shell routes open the corresponding system view');
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  await page.locator('.flp-screen-portfolio-project-title').waitFor().catch(async () => { throw new Error(`portfolio not rendered: ${JSON.stringify({ text: await page.locator('body').innerText(), pageErrors, consoleMessages })}`); });
  const projectCardGeometry = await page.evaluate(() => ({ grid: document.querySelector('.flp-screen-portfolio-grid').clientWidth, card: document.querySelector('.flp-screen-portfolio-project').getBoundingClientRect().width }));
  assert.ok(Math.abs(projectCardGeometry.grid - projectCardGeometry.card) <= 1, `a single project should use the available portfolio width: ${JSON.stringify(projectCardGeometry)}`);
  await page.locator('.flp-screen-portfolio-preview strong').filter({ hasText: 'Visão Geral' }).waitFor().catch(async () => { throw new Error(`registered screen missing: ${JSON.stringify({ text: await page.locator('body').innerText(), pageErrors, consoleMessages })}`); });
  assert.equal(await page.getByText(/Histórica · 2026-10-01/).count(), 1);
  assert.equal(await page.locator('.flp-screen-portfolio-preview').count(), 4, 'portfolio starts with a compact preview');
  await page.getByRole('button', { name: 'Ver todas as 8 telas' }).click();
  assert.equal(await page.locator('.flp-screen-portfolio-preview').count(), 8, 'expanding reveals routes from both app shells');
  assert.equal(await page.getByText('Aplicação: admin', { exact: true }).count(), 1, 'same-route screens identify the admin app in the project portfolio');
  assert.equal(await page.getByText('Aplicação: store', { exact: true }).count(), 1, 'same-route screens identify the storefront app in the project portfolio');
  await page.getByText('Captura em baixa resolução', { exact: true }).waitFor();
  assert.equal(await page.getByText('Captura em baixa resolução', { exact: true }).count(), 1, 'a 1×1 placeholder must not be presented as a useful screen preview');
  assert.equal(await page.locator('.flp-screen-portfolio-preview img').count(), 4, 'valid screenshots remain visible after rejecting the undersized image');
  assert.ok(await page.locator('.flp-screen-portfolio-preview img').evaluateAll((images) => images.every((image) => image.naturalWidth >= 64 && image.naturalHeight >= 36)), 'every rendered preview has usable intrinsic dimensions');
  assert.equal(await page.getByText('Prévia não medida', { exact: true }).count(), 3, 'screens without visual evidence have one clear preview state each');
  const unmeasuredMediaHeights = await page.locator('.flp-screen-portfolio-preview.no-capture .flp-screen-preview-media').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert.ok(unmeasuredMediaHeights.length > 0 && unmeasuredMediaHeights.every((height) => height <= 84), `unmeasured screens should use compact explicit states, not empty screenshot-sized panels: ${JSON.stringify(unmeasuredMediaHeights)}`);
  assert.equal(await page.getByText('Sem captura · não medido').count(), 0, 'the card does not repeat its missing-capture state');
  await page.getByRole('button', { name: 'Inspecionar Tela 5' }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'Tela 5' }).waitFor();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByLabel('Filtrar telas por nome ou rota').fill('tela-5');
  assert.equal(await page.locator('.flp-screen-portfolio-preview').count(), 1, 'search filters by the observed route');
  await page.getByLabel('Estado da captura').selectOption('historical');
  assert.equal(await page.locator('.flp-screen-portfolio-preview').count(), 1, 'capture state filter retains historical evidence');
  await page.getByLabel('Filtrar telas por nome ou rota').fill('');
  await page.getByLabel('Estado da captura').selectOption('unmeasured');
  assert.equal(await page.locator('.flp-screen-portfolio-preview').count(), 3, 'unmeasured screens from both apps remain discoverable');
  await page.getByLabel('Estado da captura').selectOption('all');
  await systemMap.getByRole('button', { name: 'Recolher mapa' }).click();
  await page.getByRole('button', { name: 'Recolher telas' }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  if (process.env.FENIX_PORTFOLIO_SCREENSHOT) await page.screenshot({ path: process.env.FENIX_PORTFOLIO_SCREENSHOT, fullPage: true });
  assert.deepEqual(pageErrors, []);
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.locator('.flp-detail').evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.client + 1, `screen portfolio overflows at ${width}px: ${JSON.stringify(dimensions)}`);
  }

  await page.getByRole('button', { name: 'Abrir projeto e telas' }).click();
  assert.equal(absorptionReads, 1, 'opening project Screen DNA reads its persisted project absorption once');
  const screenCanvas = page.getByRole('region', { name: 'Telas observadas do projeto Projeto Demo' });
  await screenCanvas.waitFor();
  await screenCanvas.getByText('Settings Console', { exact: true }).waitFor();
  assert.equal(await screenCanvas.locator('.flp-dna-node').count(), 9, 'project canvas retains absorption, discovered, and registered screens');
  const unmeasuredCanvasPreviews = await screenCanvas.locator('.flp-dna-preview').filter({ hasText: 'Ainda sem captura visual' }).evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert.ok(unmeasuredCanvasPreviews.length > 0 && unmeasuredCanvasPreviews.every((height) => height <= 110), `unmeasured canvas previews should stay within the list-preview height: ${JSON.stringify(unmeasuredCanvasPreviews)}`);
  assert.equal(await screenCanvas.getByText(/^Aplicação: /).count(), 2, 'app labels disambiguate same-route screens');
  assert.equal(await screenCanvas.getByText('Admin', { exact: true }).count(), 1, 'absorbed screen title is used when the API omits a display name');
  assert.equal(await screenCanvas.getByText('Storefront', { exact: true }).count(), 1, 'second app screen keeps its own title');
  await screenCanvas.getByText('Captura em baixa resolução', { exact: true }).waitFor();
  await screenCanvas.getByRole('button', { name: 'Abrir arquivo na IDE' }).click();
  await page.waitForFunction(() => window.__screenIdeHandoff.some((item) => item.file === 'src/pages/Settings.tsx'));
  assert.deepEqual(await page.evaluate(() => window.__screenIdeHandoff), [
    { projectId: 'demo' },
    { previewProjectId: 'demo', screenId: 'demo-settings', route: '/settings', sourceFile: 'src/pages/Settings.tsx' },
    { file: 'src/pages/Settings.tsx' }
  ], 'a Screen DNA source-file action hands off the selected project and its observed file to IDE');
  await screenCanvas.locator('.flp-dna-node').filter({ hasText: 'Settings Console' }).getByRole('button', { name: 'Ver relações no Flow Graph' }).click();
  const flowHandoff = await page.evaluate(() => window.__screenFlowHandoff);
  assert.equal(flowHandoff.context, 'PROJECT');
  assert.equal(flowHandoff.entityId, 'project:demo', 'Screen DNA opens Flow Graph in the same project context');
  assert.equal(flowHandoff.focusNodeId, 'screen:demo:demo-settings', 'Flow Graph receives the canonical ID of the selected Screen DNA node');
  assert.equal(flowHandoff.absorptionReport.projectId, 'demo', 'Flow Graph receives only the selected project absorption report');
  const initialBoardOrder = await screenCanvas.locator('.flp-dna-node').evaluateAll((cards) => cards.map((card) => card.dataset.screenId));
  await screenCanvas.locator('.flp-dna-node').last().evaluate((card) => {
    const first = document.querySelector('.flp-dna-node');
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));
    first.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
  });
  const savedBoardOrder = await page.evaluate(() => JSON.parse(localStorage.getItem('fenix_screen_dna_order:demo') || '[]'));
  assert.equal(savedBoardOrder[0], initialBoardOrder.at(-1), 'reordering a Screen DNA card saves the order for this project');
  assert.match(await page.locator('.flp-dna-board-order-status').textContent(), /salva neste navegador/, 'the UI discloses that board order is browser-local');
  await page.locator('[data-workspace-tab="overview"]').click();
  await page.locator('[data-workspace-tab="screens"]').click();
  const restoredBoardOrder = await page.locator('.flp-dna-node').evaluateAll((cards) => cards.map((card) => card.dataset.screenId));
  assert.deepEqual(restoredBoardOrder, savedBoardOrder, 'the project board restores its order after leaving and reopening Screen DNA');
  if (process.env.FENIX_SCREEN_DNA_BOARD_SCREENSHOT) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: process.env.FENIX_SCREEN_DNA_BOARD_SCREENSHOT, fullPage: true });
  }
  assert.deepEqual(pageErrors, []);
});

test('large Screen DNA catalogs render in batches while search covers unloaded screens', async (t) => {
  const app = express();
  app.get('/large-screen-fixture', (_req, res) => res.type('html').send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-hub-live.css"><main id="view-projects"></main><script src="/project-hub-live.js"></script>'));
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const screens = Array.from({ length: 718 }, (_, index) => ({
    screenId: `screen-${String(index + 1).padStart(3, '0')}`,
    name: `Tela ${String(index + 1).padStart(3, '0')}`,
    route: `/tela-${String(index + 1).padStart(3, '0')}`,
    source: 'PROJECT_ABSORPTION',
    ...(index === 717 ? { captureStatus: 'CAPTURED', screenshotFreshness: 'CURRENT', screenshotPath: '/test/fixtures/large-screen.svg' } : {})
  }));
  await page.route('**/test/fixtures/large-screen.svg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#17181c"/></svg>'
  }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let body = {};
    if (url.pathname === '/api/fenix/projects') body = { projects: [{ id: 'large', name: 'Projeto Grande', workspace: '/workspace/large', screens }] };
    else if (url.pathname === '/api/fenix/projects/large/state') body = { progress: { totalJobs: 0, running: 0, failed: 0 } };
    else if (url.pathname === '/api/v2/pages') body = { pages: [] };
    else if (url.pathname === '/api/v2/company/projects/large/absorption') body = { projectId: 'large', screens: [] };
    else if (url.pathname === '/api/v2/frontend-reality/screens') body = { projectId: 'fenix_enterprise', totalScreens: 0, status: 'STATIC_INVENTORY', verificationStatus: 'NOT_VERIFIED', screens: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/large-screen-fixture#projects`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Abrir projeto Projeto Grande' }).click();
  await page.locator('[data-workspace-tab="screens"]').click();
  const canvas = page.getByRole('region', { name: 'Telas observadas do projeto Projeto Grande' });
  await canvas.waitFor();
  assert.equal(await canvas.locator('.flp-dna-node').count(), 48, 'initial DOM is capped to one screen batch');
  assert.equal(await canvas.locator('.flp-dna-node button').count(), 144, 'initial screen actions are capped with their cards');
  await page.getByRole('button', { name: /Carregar mais telas/ }).click();
  assert.equal(await canvas.locator('.flp-dna-node').count(), 96, 'loading more appends one additional batch');
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await canvas.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const offenders = [...node.querySelectorAll('*')]
        .map((item) => ({ tag: item.tagName, cls: String(item.className || '').slice(0, 60), left: Math.round(item.getBoundingClientRect().left), right: Math.round(item.getBoundingClientRect().right), scroll: item.scrollWidth, client: item.clientWidth }))
        .filter((item) => item.right > bounds.right + 1 || item.left < bounds.left - 1)
        .slice(0, 6);
      return { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, offenders };
    });
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `Screen DNA should not overflow horizontally at ${width}px: ${JSON.stringify(geometry)}`);
  }
  await page.getByLabel('Buscar tela por nome, rota ou arquivo').fill('tela-718');
  assert.equal(await canvas.locator('.flp-dna-node').count(), 1, 'search locates a screen not present in the loaded batches');
  assert.match(await page.locator('.flp-dna-result-count').innerText(), /1 exibida\(s\) de 1 tela\(s\)/);
  assert.deepEqual(await page.locator('.flp-dna-node').evaluateAll((nodes) => nodes.map((node) => node.dataset.screenId)), ['screen-718']);
  await page.getByLabel('Buscar tela por nome, rota ou arquivo').fill('');
  await page.getByLabel('Filtrar telas pelo estado da captura').selectOption('captured');
  assert.deepEqual(await page.locator('.flp-dna-node').evaluateAll((nodes) => nodes.map((node) => node.dataset.screenId)), ['screen-718'], 'capture filtering also includes screens beyond the initial DOM batch');
});
