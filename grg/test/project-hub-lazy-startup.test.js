'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('Project Hub defers API loading until the Projects view is opened', async (t) => {
  const app = express();
  app.get('/fixture', (_req, res) => res.type('html').send(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-hub-live.css"><main class="view active" id="view-city"></main><main class="view" id="view-projects"></main><script src="/project-hub-live.js"></script>'
  ));
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
  const page = await browser.newPage();
  const requestedPaths = [];
  let fichaStateAttempts = 0;
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requestedPaths.push(pathname);
    if (pathname === '/api/fenix/projects/zapai-crm/state') await new Promise((resolve) => setTimeout(resolve, 150));
    if (pathname === '/api/fenix/projects/gerar-ficha/state' && fichaStateAttempts++ === 0) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
      return;
    }
    const body = pathname === '/api/fenix/projects'
      ? { projects: [
        { id: 'api-platform-live', name: 'API Platform', workspace: '/workspace/api' },
        { id: 'zapai-crm', name: 'ZapAI CRM', workspace: '/workspace/zapai' },
        { id: 'gerar-ficha', name: 'Gerar Ficha', workspace: '/workspace/ficha' },
      ] }
      : pathname.endsWith('/state') ? { progress: { totalJobs: 0, running: 0, failed: 0 } }
        : {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/fixture#city`, { waitUntil: 'networkidle' });
  assert.deepEqual(requestedPaths, [], 'a City visit must not hydrate the hidden Project Hub');

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fenix:viewchanged', { detail: { viewId: 'projects' } })));
  assert.deepEqual(requestedPaths, [], 'a stale view event during City startup must not hydrate the Project Hub');

  await page.evaluate(() => {
    history.replaceState(null, '', '#projects');
    document.getElementById('view-city').classList.remove('active');
    document.getElementById('view-projects').classList.add('active');
  });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fenix:viewchanged', { detail: { viewId: 'projects' } })));
  await page.getByRole('button', { name: /API Platform/ }).waitFor();
  assert.ok(requestedPaths.includes('/api/fenix/projects'), 'opening Projects loads its project catalog');
  await page.locator('.flp-project-favorite[data-project-id="api-platform-live"]').click();
  assert.equal(await page.locator('.flp-project-favorite[data-project-id="api-platform-live"]').getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Favoritos', exact: true }).click();
  assert.deepEqual(await page.locator('.flp-card[data-project-id]').evaluateAll((cards) => cards.map((card) => card.dataset.projectId)), ['api-platform-live']);
  await page.getByRole('group', { name: 'Organização do catálogo de projetos' }).getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: 'Grade', exact: true }).click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-layout'), 'grid');
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const controls = document.querySelector('.flp-project-recovery-controls');
      const bounds = controls.getBoundingClientRect();
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        controlsFit: [...controls.querySelectorAll('button')].every((button) => {
          const rect = button.getBoundingClientRect();
          return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
        }),
      };
    });
    assert.ok(layout.pageWidth <= layout.viewportWidth + 1 && layout.controlsFit, `project recovery toolbar should fit at ${width}px`);
  }
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-layout'), 'list');
  const stateRequests = () => requestedPaths.filter((pathname) => pathname.endsWith('/state'));
  await page.waitForFunction(() => document.querySelector('#flpDetail')?.textContent.includes('API Platform'));
  assert.deepEqual(stateRequests(), ['/api/fenix/projects/api-platform-live/state'], 'initial load fetches only the selected project state');
  await page.locator('.flp-card[data-project-id="zapai-crm"]').click();
  await page.getByText('Carregando estado do projeto…', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('#flpDetail')?.textContent.includes('ZapAI CRM'));
  assert.deepEqual(stateRequests(), [
    '/api/fenix/projects/api-platform-live/state',
    '/api/fenix/projects/zapai-crm/state',
  ], 'selecting another project fetches that state on demand');
  await page.locator('.flp-card[data-project-id="gerar-ficha"]').click();
  await page.getByRole('alert').getByText('Não foi possível carregar o estado deste projeto.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#flpDetail')?.textContent.includes('Gerar Ficha'));
  assert.equal(stateRequests().filter((pathname) => pathname === '/api/fenix/projects/gerar-ficha/state').length, 2, 'a failed state query has a working explicit retry');
  await page.getByRole('button', { name: 'Abrir projeto ZapAI CRM', exact: true }).click();
  await page.getByRole('button', { name: 'Recentes', exact: true }).click();
  assert.deepEqual(await page.locator('.flp-card[data-project-id]').evaluateAll((cards) => cards.map((card) => card.dataset.projectId)), ['zapai-crm', 'gerar-ficha', 'api-platform-live']);
  const catalogPreferences = await page.evaluate(() => JSON.parse(localStorage.getItem('fenix_project_catalog_preferences_v1')));
  assert.deepEqual(catalogPreferences.favorites, ['api-platform-live']);
  assert.deepEqual(catalogPreferences.recents.map((item) => item.id), ['zapai-crm', 'gerar-ficha', 'api-platform-live']);
  assert.equal(catalogPreferences.layout, 'list');
});
