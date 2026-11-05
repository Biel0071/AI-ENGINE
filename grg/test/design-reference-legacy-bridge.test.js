'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('legacy Screen DNA uses absorbed evidence for IDE handoff and saves board order per project', async (t) => {
  const app = express();
  app.get('/legacy-screen-bridge', (_req, res) => res.type('html').send(`<!doctype html>
    <div id="flpCards"><button class="flp-card active" data-project-id="demo"><span class="flp-card-title">Demo</span></button></div>
    <main id="flpDetail">
      <section class="flp-screens-grid">
        ${Array.from({ length: 28 }, (_, index) => `<article class="flp-screen-card"><div class="flp-screen-body"><div class="flp-screen-title">${index === 0 ? 'Home' : index === 1 ? 'Settings' : `Screen ${index + 1}`}</div><div class="flp-screen-route">${index === 0 ? '/home' : index === 1 ? '/settings' : `/screen-${index + 1}`}</div></div></article>`).join('')}
      </section>
    </main>
    <script src="/fenix-design-reference.js"></script><script src="/fenix-design-reference-panel.js"></script>`));
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
  await page.addInitScript(() => {
    window.__screenBridgeCalls = [];
    window.fenixSelectIdeProject = async (projectId) => { window.__screenBridgeCalls.push({ projectId }); return true; };
    window.fenixSelectIdeFile = async (file) => { window.__screenBridgeCalls.push({ file }); return true; };
    window.fenixOpenFlowGraph = (options) => { window.__screenBridgeGraph = options; };
  });
  await page.route('**/api/v2/company/projects/demo/absorption', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ screens: [
      { name: 'Home', route: '/home', sourceFile: 'src/home.js' },
      { name: 'Settings', route: '/settings' }
    ] })
  }));
  await page.goto(`http://127.0.0.1:${server.address().port}/legacy-screen-bridge`);
  await page.evaluate(() => window.FenixDesignReferencePanel.enhanceLegacyScreens());
  const grid = page.locator('.flp-screens-grid');
  await page.getByRole('button', { name: 'Próximas telas' }).waitFor();
  assert.equal(await grid.locator('.flp-screen-card').count(), 24, 'only one page should stay mounted');
  assert.match(await page.locator('.fenix-legacy-board-status').textContent(), /1–24 de 28/);
  await page.getByRole('button', { name: 'Abrir arquivo na IDE' }).waitFor();
  await page.getByRole('button', { name: 'Arquivo de origem não medido' }).first().waitFor();
  await page.getByRole('button', { name: 'Abrir arquivo na IDE' }).click();
  assert.deepEqual(await page.evaluate(() => window.__screenBridgeCalls), [{ projectId: 'demo' }, { file: 'src/home.js' }]);
  await page.getByRole('button', { name: 'Ver relações no Flow Graph' }).first().click();
  assert.deepEqual(await page.evaluate(() => window.__screenBridgeGraph), { context: 'PROJECT', entityId: 'project:demo' });

  const initialOrder = await grid.locator('.flp-screen-card').evaluateAll((cards) => cards.map((card) => `${card.querySelector('.flp-screen-route').textContent}|${card.querySelector('.flp-screen-title').textContent}`));
  await grid.locator('.flp-screen-card').first().evaluate((first) => {
    const last = document.querySelector('.flp-screen-card:last-child');
    last.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));
    first.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    last.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
  });
  const storedOrder = await page.evaluate(() => JSON.parse(localStorage.getItem('fenix_screen_dna_order:demo') || '[]'));
  assert.equal(storedOrder[0].replace(/#\d+$/, ''), initialOrder.at(-1));
  assert.match(await page.locator('.fenix-legacy-board-status').textContent(), /salva neste navegador/);
  await page.getByRole('button', { name: 'Próximas telas' }).click();
  assert.equal(await grid.locator('.flp-screen-card').count(), 4);
  assert.match(await page.locator('.fenix-legacy-board-status').textContent(), /25–28 de 28/);
  await page.getByRole('button', { name: 'Telas anteriores' }).click();
  await page.reload();
  await page.evaluate(() => window.FenixDesignReferencePanel.enhanceLegacyScreens());
  await page.waitForFunction((expected) => {
    const first = document.querySelector('.flp-screens-grid .flp-screen-card');
    return first && `${first.querySelector('.flp-screen-route').textContent}|${first.querySelector('.flp-screen-title').textContent}` === expected;
  }, storedOrder[0].replace(/#\d+$/, ''));
  assert.equal(await grid.locator('.flp-screen-card').count(), 24);
});
