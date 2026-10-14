'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');

test('root opens the City despite a stale saved view and memory fits tablet and mobile screens', async (t) => {
  const app = express();
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 797, height: 1258 } });
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    setItem.call(localStorage, 'fenix_v10_active_view', 'memory');
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fenix_v10_active_view') return;
      return setItem.call(this, key, value);
    };
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(100);
  const startup = await page.evaluate(() => ({
    hash: location.hash,
    active: document.querySelector('.view.active')?.id,
    saved: localStorage.getItem('fenix_v10_active_view'),
    restoreAvailable: typeof window.restoreRouteOnLoad === 'function',
    sidebarOpen: document.body.classList.contains('has-right-sidebar-open'),
  }));
  assert.equal(startup.active, 'view-city', JSON.stringify(startup));
  assert.equal(startup.sidebarOpen, false, 'a first visit should show the workspace before opening the chat');
  assert.equal(new URL(page.url()).hash, '#city');

  await page.goto(`${base}/index.html#memory`, { waitUntil: 'load' });
  await page.waitForSelector('#view-memory .fml-root');
  for (const viewport of [{ width: 797, height: 1258 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);

    const geometry = await page.evaluate(() => {
      const measure = (selector) => {
        const node = document.querySelector(selector);
        return node && { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth };
      };
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        activeView: document.querySelector('.view.active')?.id,
        topbar: measure('.global-topbar'),
        topbarMetrics: measure('.fnx-topbar-kpis-cluster'),
        brandTitleHeight: document.querySelector('.fnx-brand-meta-title')?.getBoundingClientRect().height,
        header: measure('#view-memory .fml-header'),
        kpis: measure('#view-memory .fml-kpis'),
        workspace: measure('#view-memory .fml-workspace'),
        shell: (() => {
          const nav = document.querySelector('#mainSidebarNav')?.getBoundingClientRect();
          const content = document.querySelector('.views-container')?.getBoundingClientRect();
          return nav && content && {
            navLeft: nav.left, navRight: nav.right, navTop: nav.top, navBottom: nav.bottom,
            contentLeft: content.left, contentRight: content.right, contentTop: content.top, contentBottom: content.bottom,
            overlap: nav.right > content.left && nav.left < content.right && nav.bottom > content.top && nav.top < content.bottom,
          };
        })(),
        chatVisible: (() => { const node = document.getElementById('fenix-right-sidebar'); return node && getComputedStyle(node).display !== 'none'; })(),
      };
    });

    assert.equal(geometry.activeView, 'view-memory', `direct route failed at ${viewport.width}px`);
    assert.ok(geometry.documentWidth <= viewport.width + 1, `document overflows at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.topbar?.scrollWidth <= geometry.topbar?.clientWidth + 1, `top bar overflows at ${viewport.width}px: ${JSON.stringify(geometry.topbar)}`);
    if (viewport.width === 797) {
      assert.ok(geometry.topbarMetrics?.scrollWidth <= geometry.topbarMetrics?.clientWidth + 1, `top bar metrics are clipped at tablet width: ${JSON.stringify(geometry.topbarMetrics)}`);
    }
    if (viewport.width <= 797) assert.ok(geometry.brandTitleHeight <= 24, `brand wraps at ${viewport.width}px: ${geometry.brandTitleHeight}px`);
    assert.equal(geometry.shell.overlap, false, `navigation overlaps the active workspace at ${viewport.width}px: ${JSON.stringify(geometry.shell)}`);
    if (viewport.width === 1440) assert.equal(geometry.chatVisible, false, 'a closed chat must not reserve desktop width');
    for (const part of ['header', 'kpis', 'workspace']) {
      assert.ok(geometry[part]?.scrollWidth <= geometry[part]?.clientWidth + 1, `${part} overflows at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    }
  }

  const legacyPage = await browser.newPage({ viewport: { width: 797, height: 1258 } });
  await legacyPage.route('**/memory-live.js*', (route) => route.abort());
  await legacyPage.goto(`${base}/index.html#memory`, { waitUntil: 'load' });
  await legacyPage.waitForSelector('#fenixMemoryLayers');
  for (const viewport of [{ width: 797, height: 1258 }, { width: 390, height: 844 }]) {
    await legacyPage.setViewportSize(viewport);
    const geometry = await legacyPage.evaluate(() => {
      const measure = (selector) => {
        const node = document.querySelector(selector);
        return node && { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth };
      };
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        header: measure('#view-memory > .fenix-module-header'),
        layers: measure('#fenixMemoryLayers'),
        layerColumns: getComputedStyle(document.getElementById('fenixMemoryLayers')).gridTemplateColumns.split(' ').length,
        timeline: measure('#fenixMemoryTimeline'),
        workspace: measure('#fenixMemoryViewLayout'),
      };
    });
    assert.ok(geometry.documentWidth <= viewport.width + 1, `legacy screen overflows at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    for (const part of ['header', 'layers', 'workspace']) {
      assert.ok(geometry[part]?.scrollWidth <= geometry[part]?.clientWidth + 1, `legacy ${part} overflows at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    }
    assert.ok(geometry.timeline?.scrollWidth <= geometry.timeline?.clientWidth + 1, `legacy timeline overflows at ${viewport.width}px: ${JSON.stringify(geometry.timeline)}`);
    assert.ok(geometry.layerColumns <= (viewport.width <= 760 ? 2 : 4), `legacy memory cards do not adapt at ${viewport.width}px: ${JSON.stringify(geometry)}`);
  }

  await legacyPage.setViewportSize({ width: 797, height: 1258 });
  await legacyPage.evaluate(() => window.FenixMascotSidebar?.MascotController?.setCopilotState('open'));
  const legacySplit = await legacyPage.evaluate(() => {
    const views = document.querySelector('.views-container')?.getBoundingClientRect();
    const chat = document.getElementById('fenix-right-sidebar')?.getBoundingClientRect();
    const workspace = document.getElementById('fenixMemoryViewLayout');
    return {
      open: document.body.classList.contains('has-right-sidebar-open'),
      contentRight: views?.right,
      chatLeft: chat?.left,
      workspaceWidth: workspace?.clientWidth,
      workspaceScrollWidth: workspace?.scrollWidth,
    };
  });
  assert.equal(legacySplit.open, true);
  assert.ok(legacySplit.contentRight <= legacySplit.chatLeft + 1, `legacy memory screen is covered by chat: ${JSON.stringify(legacySplit)}`);
  assert.ok(legacySplit.workspaceScrollWidth <= legacySplit.workspaceWidth + 1, `legacy memory layout does not reflow beside chat: ${JSON.stringify(legacySplit)}`);

  const splitPage = await browser.newPage({ viewport: { width: 797, height: 1258 } });
  await splitPage.addInitScript(() => localStorage.setItem('fenix_sidebar_state', 'open'));
  await splitPage.goto(`${base}/index.html#memory`, { waitUntil: 'load' });
  await splitPage.waitForTimeout(100);
  const splitGeometry = await splitPage.evaluate(() => {
    const content = document.querySelector('.views-container');
    const chat = document.getElementById('fenix-right-sidebar');
    return {
      open: document.body.classList.contains('has-right-sidebar-open'),
      contentRight: content?.getBoundingClientRect().right,
      chatLeft: chat?.getBoundingClientRect().left,
    };
  });
  assert.equal(splitGeometry.open, true);
  assert.ok(splitGeometry.contentRight <= splitGeometry.chatLeft + 1, `chat overlays the workspace at tablet width: ${JSON.stringify(splitGeometry)}`);

  await splitPage.waitForSelector('#view-memory .fml-workspace');
  const splitMemory = await splitPage.locator('#view-memory .fml-workspace').evaluate((workspace) => ({
    width: workspace.clientWidth,
    scrollWidth: workspace.scrollWidth,
    columns: getComputedStyle(workspace).gridTemplateColumns,
  }));
  assert.ok(splitMemory.scrollWidth <= splitMemory.width + 1, `memory does not reflow beside the docked chat: ${JSON.stringify(splitMemory)}`);
});
