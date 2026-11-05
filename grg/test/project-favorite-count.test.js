'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('Project Hub counts only favorites present in the loaded catalog', async (t) => {
  const app = express();
  app.get('/fixture', (_req, res) => res.type('html').send(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-hub-live.css"><main id="view-projects"></main><script src="/project-hub-live.js"></script>'
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
  await page.addInitScript(() => localStorage.setItem('fenix_project_hub_view_mode', 'fenix'));
  await page.addInitScript(() => localStorage.setItem('fenix_project_catalog_preferences_v1', JSON.stringify({ favorites: ['retired-id', 'project-1'] })));
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname === '/api/fenix/projects' ? { projects: [
      { id: 'project-1', name: 'Project One', status: 'ONLINE', source: 'LOCAL_PROJECT_CATALOG', workspaceAvailable: true },
      { id: 'project-2', name: 'Project Two', status: 'OFFLINE', source: 'LOCAL_PROJECT_CATALOG', workspaceAvailable: false },
      { id: 'project-3', name: 'Project Three', status: 'ONLINE', workspace: '/opt/project-3' },
    ] } : {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/fixture#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('.flp-card[data-project-id="project-1"]').waitFor();

  const favoriteScope = page.locator('.flp-tree-item').filter({ hasText: 'Favoritos' });
  assert.equal(await favoriteScope.locator('.flp-tree-item-count').innerText(), '1');
  assert.equal(await page.locator('#flpFavCount').innerText(), '1');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('fenix_project_catalog_preferences_v1')).favorites), ['project-1']);
  const localScope = page.locator('.flp-tree-item').filter({ hasText: 'Projetos Locais' });
  assert.equal(await localScope.locator('.flp-tree-item-count').innerText(), '2');
  const localFolder = page.locator('.flp-folder-card').filter({ hasText: 'Projetos Locais' });
  assert.match(await localFolder.getAttribute('aria-label'), /2 sistemas/);

  await favoriteScope.click();
  assert.deepEqual(await page.locator('.flp-card[data-project-id]').evaluateAll((cards) => cards.map((card) => card.dataset.projectId)), ['project-1']);
  await page.locator('.flp-tree-item').filter({ hasText: 'Projetos Locais' }).click();
  assert.deepEqual(await page.locator('.flp-card[data-project-id]').evaluateAll((cards) => cards.map((card) => card.dataset.projectId)), ['project-1', 'project-2']);
});
