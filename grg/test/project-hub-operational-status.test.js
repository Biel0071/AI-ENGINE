'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('Project Hub separates measured service status from catalog status', async (t) => {
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let body = {};
    if (pathname === '/api/fenix/projects') body = { projects: [
      { id: 'catalog-online-only', name: 'Catalogo sem medição', status: 'ONLINE', workspace: '/workspace/catalog', localPort: 3000 },
      { id: 'service-online', name: 'Serviço ativo', status: 'OFFLINE', workspace: '/workspace/online' },
      { id: 'service-offline', name: 'Serviço indisponível', status: 'ONLINE', workspace: '/workspace/offline' },
    ] };
    if (pathname === '/api/v2/projects/catalog-status') body = { projects: {
      'service-online': { id: 'service-online', online: true, activeUrl: 'http://127.0.0.1:3001', port: 3001, latencyMs: 18, checkedAt: Date.now() },
      'service-offline': { id: 'service-offline', online: false, port: 3002, checkedAt: Date.now() },
    } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/fixture#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('.flp-card[data-project-id="catalog-online-only"]').waitFor();
  await page.locator('#flpDetail .flp-detail-status-banner').waitFor();

  const unknown = page.locator('.flp-card[data-project-id="catalog-online-only"] .flp-card-status-pill');
  assert.match(await unknown.innerText(), /NÃO VERIFICADO/);
  assert.match(await page.locator('#flpDetail').innerText(), /STATUS NÃO VERIFICADO/);
  assert.equal(await page.locator('#flpDetail').getByRole('button', { name: /Abrir Sistema Agora/ }).count(), 0);
  assert.match(await page.locator('.flp-card[data-project-id="service-online"] .flp-card-status-pill').innerText(), /ONLINE/);
  assert.match(await page.locator('.flp-card[data-project-id="service-offline"] .flp-card-status-pill').innerText(), /OFFLINE/);
  assert.deepEqual(await page.locator('#flpOnlineCountBadge').innerText(), '1');
  assert.deepEqual(await page.locator('#flpOfflineCountBadge').innerText(), '1');
  assert.deepEqual(await page.locator('#flpUnknownCountBadge').innerText(), '1');

  await page.getByRole('button', { name: /Não verificado/ }).click();
  assert.deepEqual(await page.locator('.flp-card[data-project-id]').evaluateAll((cards) => cards.map((card) => card.dataset.projectId)), ['catalog-online-only']);
  await page.locator('.flp-status-pill-btn[data-status-filter="all"]').click();
  await page.locator('.flp-card[data-project-id="service-online"]').click();
  await page.getByRole('button', { name: /Abrir Sistema Agora/ }).waitFor();
  assert.match(await page.locator('#flpDetail').innerText(), /respondeu na checagem.*porta :3001/i);
  assert.match(await page.locator('#flpDetail').innerText(), /SERVIÇO ONLINE/);
});
