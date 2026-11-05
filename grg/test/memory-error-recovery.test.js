'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('memory tabs isolate persisted search and recover the graph after login', async (t) => {
  const app = express();
  app.get('/memory-fixture', (_req, res) => res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{min-height:100%;margin:0;background:#07090d;color:#f5f5f7}#view-memory{min-height:100vh}</style><link rel="stylesheet" href="/memory-live.css"></head><body><main id="view-memory" class="view active"></main><script src="/memory-brain-layout.js"></script><script src="/memory-provenance.js"></script><script src="/memory-live.js?v=qa"></script></body></html>`));
  app.get('/GRG-login', (_req, res) => res.type('html').send('<!doctype html><title>Login fixture</title>'));
  app.use(express.static(require('node:path').resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  let browser;
  let graphStatus = 401;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const pageErrors = [];
  const apiResponses = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => { if (response.url().includes('/api/')) apiResponses.push({ url: response.url(), status: response.status() }); });
  await page.route(/\/api\/v2\/graph\/data(?:\?.*)?$/, (route) => route.fulfill({
    status: graphStatus,
    contentType: 'application/json',
    body: JSON.stringify(graphStatus === 401
      ? { error: 'not authenticated - login at /GRG-login' }
      : { nodes: [{ id: 'project:fenix-os', type: 'PROJECT', properties: { name: 'Fênix OS' } }], edges: [], stats: { totalNodes: 1, totalEdges: 0 } }),
  }));
  await page.route('**/api/memories/search?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ results: [{ id: 'memory-1', title: 'Contexto persistido', content: 'A conversa continua disponível.' }] }),
  }));
  await page.goto(`http://127.0.0.1:${server.address().port}/memory-fixture`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const renderedState = await page.evaluate(() => ({
    message: document.querySelector('#fmlMemoryErrorMessage')?.textContent || '',
    shell: Boolean(document.querySelector('#fenixMemoryOperationalContainer')),
    status: document.querySelector('#fmlStatus')?.textContent || '',
    loader: typeof window.loadMemoryView,
    scripts: [...document.scripts].map((script) => script.src),
  }));
  assert.ok(renderedState.message, `memory error did not render: ${JSON.stringify({ renderedState, pageErrors, apiResponses })}`);

  const notice = page.locator('#fenixMemoryErrorNotice');
  assert.equal(await notice.getAttribute('role'), 'alert');
  assert.match(await page.locator('#fmlMemoryErrorMessage').innerText(), /sessão expirou/i);
  assert.doesNotMatch(await notice.innerText(), /not authenticated|login at \/GRG-login/i);
  assert.equal(await page.locator('#fmlStatus').isVisible(), false, 'duplicate graph error status should be hidden');
  assert.equal(await notice.locator('details').isVisible(), true);
  assert.equal(await notice.locator('details').evaluate((details) => details.open), false, 'technical details stay collapsed by default');
  assert.match(await notice.locator('details').evaluate((details) => details.textContent), /not authenticated - login at \/GRG-login/);

  const graphTab = page.getByRole('tab', { name: 'Grafo & Camadas' });
  const persistedTab = page.getByRole('tab', { name: 'Registros Persistidos' });
  assert.equal(await graphTab.getAttribute('aria-selected'), 'true');
  assert.equal(await persistedTab.getAttribute('aria-selected'), 'false');
  assert.equal(await page.locator('#fmlWorkspace').isVisible(), false, 'failed graph data should not leave an empty workspace visible');
  assert.equal(await page.locator('#fmlProvenanceStrip').isVisible(), false, 'unavailable graph should not show a pending provenance summary');
  await persistedTab.click();
  assert.equal(await persistedTab.getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#fmlPersistent').isVisible(), true, 'persisted search remains available when graph API is unavailable');
  assert.equal(await notice.isVisible(), false, 'graph error belongs to its tab');
  await page.getByRole('searchbox', { name: 'Buscar memórias persistidas' }).fill('contexto');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByText('A conversa continua disponível.').waitFor();
  await persistedTab.press('ArrowLeft');
  assert.equal(await graphTab.getAttribute('aria-selected'), 'true');
  assert.equal(await notice.isVisible(), true, 'retryable graph error returns with the graph tab');
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.locator('.fml-root').evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.client + 1, `memory tabs overflow at ${width}px: ${JSON.stringify(dimensions)}`);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  const evidencePath = require('node:path').resolve(__dirname, '..', 'docs', 'visual-evidence', '2026-10-21', 'memory-tab-recovery-375-after.png');
  require('node:fs').mkdirSync(require('node:path').dirname(evidencePath), { recursive: true });
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: evidencePath });

  await page.getByRole('button', { name: 'Entrar novamente' }).click();
  await page.waitForURL('**/GRG-login');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('fenix_return_route')), '#memory');
  graphStatus = 200;
  await page.goto(`http://127.0.0.1:${server.address().port}/memory-fixture`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#fmlNodesCount')?.textContent === '1');
  assert.equal(await page.locator('#fmlWorkspace').isVisible(), true, 'a measured graph restores its workspace');
  assert.equal(await page.locator('#fenixMemoryLayers').isVisible(), true);
  assert.equal(await page.locator('#fmlProvenanceStrip').isVisible(), true);
  assert.equal(await page.locator('#fenixMemoryErrorNotice').isVisible(), false);
});
