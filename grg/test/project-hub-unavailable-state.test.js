'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const publicDir = path.resolve(__dirname, '../public');

test('Project Hub distinguishes unavailable projects from a measured empty catalog and can retry', async (t) => {
  const app = express();
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections?.(); await new Promise((resolve) => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let available = false;
  await page.route('**/api/**', (route) => {
    const isCatalog = new URL(route.request().url()).pathname === '/api/fenix/projects';
    if (isCatalog) return route.fulfill(available
      ? { status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [] }) }
      : { status: 503, contentType: 'text/html', body: '<html>service unavailable</html>' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('#flpMeasured').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#flpMeasured')?.dataset.error === 'true');

  assert.equal(await page.locator('[data-nav="projects"] .fnx-nav-subtitle').innerText(), 'Catálogo indisponível');
  assert.deepEqual(await page.locator('#flpTotal,#flpWorkspaces,#flpRunning,#flpFailed').allTextContents(), ['—', '—', '—', '—']);
  assert.match(await page.locator('#flpDetail').innerText(), /Catálogo de projetos indisponível/);
  const retry = page.locator('#flpRetryCatalog');
  assert.equal(await retry.count(), 1);
  assert.equal(await retry.isVisible(), true);
  const evidenceDir = path.resolve(__dirname, '../docs/visual-evidence/2026-10-21');
  fs.mkdirSync(evidenceDir, { recursive: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
  await page.screenshot({ path: path.join(evidenceDir, 'projects-unavailable-1280-after.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
  const mobileGeometry = await page.evaluate(() => {
    const root = document.querySelector('.fenix-live-projects');
    const actions = document.querySelector('.flp-header-actions').getBoundingClientRect();
    const header = document.querySelector('.flp-header').getBoundingClientRect();
    return { rootWidth: root.clientWidth, rootScrollWidth: root.scrollWidth, actionsLeft: actions.left, actionsRight: actions.right, headerLeft: header.left, headerRight: header.right };
  });
  assert.equal(mobileGeometry.rootScrollWidth, mobileGeometry.rootWidth, 'Project Hub must not clip horizontal content');
  assert.ok(mobileGeometry.actionsLeft >= mobileGeometry.headerLeft && mobileGeometry.actionsRight <= mobileGeometry.headerRight, 'header actions must stay inside the header');
  await page.screenshot({ path: path.join(evidenceDir, 'projects-unavailable-375-after.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  available = true;
  await retry.click();
  await page.waitForFunction(() => document.querySelector('#flpMeasured')?.dataset.error === 'false');
  assert.deepEqual(await page.locator('#flpTotal,#flpWorkspaces,#flpRunning,#flpFailed').allTextContents(), ['0', '0', '0', '0']);
  assert.equal(await page.locator('[data-nav="projects"] .fnx-nav-subtitle').innerText(), '0 projetos cadastrados');
  assert.match(await page.locator('#flpCards').innerText(), /Nenhum projeto registrado no Project Kernel/);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(evidenceDir, 'projects-empty-1280-after.png'), fullPage: true });
});

test('Project Hub returns to login when its API confirms the browser session expired', async (t) => {
  const app = express();
  app.get('/app', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  app.get('/GRG-login', (_req, res) => res.sendFile(path.join(publicDir, 'login.html')));
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections?.(); await new Promise((resolve) => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('**/api/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/fenix/projects') return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Authentication required' }),
    });
    if (pathname === '/api/v2/auth/check') return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/app#projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/GRG-login');
  assert.match(page.url(), /\/GRG-login$/);
});


