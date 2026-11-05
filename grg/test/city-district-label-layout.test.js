'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.join(__dirname, '..', 'public');

test('City labels and 3D navigation stay readable, reachable, and collision-free across viewports', async (t) => {
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

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined,
  });

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1920, height: 1080 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.fw3-district-label').length >= 6);
    await page.evaluate(() => document.fonts?.ready);
    await page.evaluate(() => {
      const notice = document.getElementById('cityRuntimeLoadStatus');
      notice.querySelector('#cityRuntimeLoadMessage').textContent = 'Sessão expirada ou sem acesso. Entre novamente e tente carregar a Cidade.';
      notice.hidden = false;
    });
    const buildingInspectorClose = page.locator('#btnCutawayClose');
    if (await buildingInspectorClose.isVisible()) await buildingInspectorClose.click({ force: true });
    await page.waitForTimeout(350);
    await page.waitForTimeout(150);

    const layout = await page.evaluate(() => {
      const host = document.querySelector('#view-city .fenix-city-canvas-area').getBoundingClientRect();
      const labels = [...document.querySelectorAll('.fw3-district-label:not([hidden])')].map((element) => {
        const rect = element.getBoundingClientRect();
        const copy = element.querySelector('.fw3-label-copy').getBoundingClientRect();
        return {
          title: element.querySelector('strong')?.textContent,
          left: rect.left - host.left,
          right: rect.right - host.left,
          top: rect.top - host.top,
          bottom: rect.bottom - host.top,
          width: rect.width,
          height: rect.height,
          textWidth: copy.width,
          titleFontSize: Number.parseFloat(getComputedStyle(element.querySelector('strong')).fontSize),
          detailFontSize: Number.parseFloat(getComputedStyle(element.querySelector('small')).fontSize),
        };
      });
      const navControls = [...document.querySelectorAll('.fw3-nav button, .fw3-route')]
        .filter((element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; })
        .map((element) => { const rect = element.getBoundingClientRect(); return { name: element.textContent.trim(), height: rect.height, left: rect.left - host.left, right: rect.right - host.left, top: rect.top - host.top, bottom: rect.bottom - host.top }; });
      const orbitElement = document.querySelector('#fnxProviderOrbit');
      const orbitRect = orbitElement?.getBoundingClientRect();
      const orbitCollision = orbitRect ? labels.filter((label) => {
        const left = orbitRect.left - host.left, right = orbitRect.right - host.left;
        const top = orbitRect.top - host.top, bottom = orbitRect.bottom - host.top;
        return label.left < right && label.right > left && label.top < bottom && label.bottom > top;
      }).map((label) => label.title) : [];
      const overlaps = [];
      for (let i = 0; i < labels.length; i += 1) {
        for (let j = i + 1; j < labels.length; j += 1) {
          const a = labels[i], b = labels[j];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([a.title, b.title]);
        }
      }
      const navCollisions = labels.filter((label) => navControls.some((control) => label.left < control.right && label.right > control.left && label.top < control.bottom && label.bottom > control.top)).map((label) => label.title);
      const noticeElement = document.querySelector('#cityRuntimeLoadStatus');
      const noticeRect = noticeElement.getBoundingClientRect();
      const noticeCollision = labels.filter((label) => {
        const left = noticeRect.left - host.left, right = noticeRect.right - host.left;
        const top = noticeRect.top - host.top, bottom = noticeRect.bottom - host.top;
        return label.left < right && label.right > left && label.top < bottom && label.bottom > top;
      }).map((label) => label.title);
      return { hostWidth: host.width, labels, navControls, navCollisions, overlaps, orbitCollision, noticeCollision };
    });
    if (viewport.width === 1280) {
      await page.screenshot({ path: path.join(os.tmpdir(), 'grg-city-runtime-notice-1280-after.png') });
    }

    const overlayLayout = await page.evaluate(() => {
      const hostRect = document.querySelector('#view-city .fenix-city-canvas-area').getBoundingClientRect();
      const labels = [...document.querySelectorAll('.fw3-district-label:not([hidden]), .fw3-project-label:not([hidden])')].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          title: element.querySelector('strong')?.textContent || element.getAttribute('aria-label'),
          left: rect.left - hostRect.left,
          right: rect.right - hostRect.left,
          top: rect.top - hostRect.top,
          bottom: rect.bottom - hostRect.top,
        };
      });
      const overlaps = [];
      for (let i = 0; i < labels.length; i += 1) {
        for (let j = i + 1; j < labels.length; j += 1) {
          const a = labels[i], b = labels[j];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([a.title, b.title]);
        }
      }
      const obstacles = [
        ['building inspector', document.querySelector('#spatialBuildingInspectorPanel')],
        ['district inspector', document.querySelector('#fenixWorldBuildingInspector')],
        ['bottom dock', document.querySelector('#fenixModularBottomDock')],
        ['level navigation', document.querySelector('#fw3NavLevelsBar')],
        ['camera controls', document.querySelector('#fenixMiroSpatialHud')],
      ].map(([name, element]) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { name, left: rect.left - hostRect.left, right: rect.right - hostRect.left, top: rect.top - hostRect.top, bottom: rect.bottom - hostRect.top };
      }).filter(Boolean);
      const obstacleCollisions = labels.flatMap((label) => obstacles.filter((obstacle) =>
        label.left < obstacle.right && label.right > obstacle.left && label.top < obstacle.bottom && label.bottom > obstacle.top
      ).map((obstacle) => [label.title, obstacle.name]));
      return { overlaps, obstacleCollisions, visibleCount: labels.length };
    });
    assert.deepEqual(overlayLayout.overlaps, [], `City district and project labels overlap at ${viewport.width}px: ${JSON.stringify(overlayLayout.overlaps)}`);
    assert.deepEqual(overlayLayout.obstacleCollisions, [], `City labels cover the dock or camera controls at ${viewport.width}px: ${JSON.stringify(overlayLayout.obstacleCollisions)}`);

    assert.ok(layout.labels.length > 0 || overlayLayout.visibleCount > 0, `no City labels are visible at ${viewport.width}px`);
    if (!layout.labels.length) {
      await page.close();
      continue;
    }
    assert.ok(layout.labels.every((label) => label.width >= 48 && label.textWidth >= 20), `a label collapsed at ${viewport.width}px: ${JSON.stringify(layout.labels)}`);
    const minimumFontSize = viewport.width <= 760 ? { title: 11, detail: 9 } : { title: 12, detail: 10 };
    assert.ok(layout.labels.every((label) => label.titleFontSize >= minimumFontSize.title && label.detailFontSize >= minimumFontSize.detail), `district text is too small at ${viewport.width}px: ${JSON.stringify(layout.labels)}`);
    assert.ok(layout.labels.every((label) => label.height >= 40), `district labels have undersized interaction targets at ${viewport.width}px: ${JSON.stringify(layout.labels)}`);
    assert.ok(layout.navControls.length > 0 && layout.navControls.every((control) => control.height >= 44), `3D navigation controls are below a 44px target at ${viewport.width}px: ${JSON.stringify(layout.navControls)}`);
    assert.deepEqual(layout.navCollisions, [], `district labels cover 3D navigation at ${viewport.width}px: ${JSON.stringify(layout.navCollisions)}`);
    assert.ok(layout.labels.every((label) => label.left >= -1 && label.right <= layout.hostWidth + 1), `a label clips outside the City canvas at ${viewport.width}px: ${JSON.stringify(layout.labels)}`);
    assert.deepEqual(layout.overlaps, [], `district labels overlap at ${viewport.width}px: ${JSON.stringify(layout.overlaps)}`);
    assert.deepEqual(layout.orbitCollision, [], `a district label covers the provider orbit at ${viewport.width}px: ${JSON.stringify(layout.orbitCollision)}`);
    assert.deepEqual(layout.noticeCollision, [], `a district label is obscured by the runtime notice at ${viewport.width}px: ${JSON.stringify(layout.noticeCollision)}`);
    await page.locator('.fw3-district-label:not([hidden])').first().click();
    const closeTarget = await page.locator('.fw3-context-close').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const heading = element.parentElement.querySelector('h2')?.getBoundingClientRect();
      return { width: rect.width, height: rect.height, overlapsHeading: Boolean(heading && rect.left < heading.right && rect.right > heading.left && rect.top < heading.bottom && rect.bottom > heading.top) };
    });
    assert.ok(closeTarget.width >= 44 && closeTarget.height >= 44, `City inspector close target is too small at ${viewport.width}px: ${JSON.stringify(closeTarget)}`);
    assert.equal(closeTarget.overlapsHeading, false, `City inspector close target overlaps its title at ${viewport.width}px: ${JSON.stringify(closeTarget)}`);
    const inspectorActions = await page.locator('.fw3-action').evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: element.textContent.trim(), height: rect.height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) };
    }));
    assert.ok(inspectorActions.length > 0 && inspectorActions.every((action) => action.height >= 44 && action.fontSize >= 13), `City inspector actions are too small at ${viewport.width}px: ${JSON.stringify(inspectorActions)}`);
    const inspectorCopy = await page.locator('.fw3-context').evaluate((panel) => ({
      descriptionFontSize: Number.parseFloat(getComputedStyle(panel.querySelector('p')).fontSize),
      detailFontSizes: [...panel.querySelectorAll('.fw3-detail-row')].map((row) => Number.parseFloat(getComputedStyle(row).fontSize)),
    }));
    assert.ok(inspectorCopy.descriptionFontSize >= 12 && inspectorCopy.detailFontSizes.length > 0 && inspectorCopy.detailFontSizes.every((size) => size >= 12), `City inspector details are too small at ${viewport.width}px: ${JSON.stringify(inspectorCopy)}`);
    if (viewport.width === 1280 && process.env.FENIX_CITY_INSPECTOR_ACTIONS_SCREENSHOT) {
      await page.screenshot({ path: process.env.FENIX_CITY_INSPECTOR_ACTIONS_SCREENSHOT });
    }
    await page.locator('.fw3-context-close').click();
    await page.close();
  }
});
