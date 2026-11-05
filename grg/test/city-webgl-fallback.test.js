'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');

test('City falls back to the measured 2D renderer when WebGL cannot initialize', async (t) => {
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(String(type).toLowerCase())) return null;
      return getContext.call(this, type, ...args);
    };
  });

  const world = {
    agents: [{ id: 'qa-agent-1', name: 'Agente de QA', status: 'AVAILABLE', coordinates: { x: 8, y: 0.8, z: -4 } }],
    projects: [],
    buildings: [],
    activeMissions: 0,
  };
  await page.route('**/api/v2/living-city/state', (route) => route.fulfill({ json: world }));
  await page.route('**/api/v2/living-city/agents', (route) => route.fulfill({ json: { agents: world.agents } }));

  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.fenixCity instanceof window.IsoCityEngine && window.fenixCity.world?.agents?.size === 1, null, { timeout: 8000 });
  } catch {
    const diagnostic = await page.evaluate(() => ({
      mode2d: document.body.classList.contains('fenix-mode-2d'),
      rendererAvailable: window.FENIX_WORLD_3D,
      cityType: window.fenixCity?.constructor?.name,
      isometricLoaded: typeof window.IsoCityEngine,
      status: document.getElementById('cityRuntimeLoadMessage')?.textContent,
      fallback: document.getElementById('cityRendererFallbackMessage')?.textContent,
    }));
    assert.fail(JSON.stringify({ diagnostic, pageErrors }));
  }

  const state = await page.evaluate(() => ({
    mode2d: document.body.classList.contains('fenix-mode-2d'),
    rendererAvailable: window.FENIX_WORLD_3D,
    agentCount: window.fenixCity.world.agents.size,
    fallbackNotice: document.getElementById('cityRendererFallbackMessage')?.textContent,
  }));

  assert.equal(state.mode2d, true);
  assert.equal(state.rendererAvailable, false);
  assert.equal(state.agentCount, 1);
  assert.match(state.fallbackNotice || '', /WebGL indisponível/);
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const notice = await page.locator('#cityRendererFallbackStatus').boundingBox();
    assert.ok(notice, `fallback notice is visible at ${width}px`);
    assert.ok(notice.x >= 0 && notice.x + notice.width <= width, `fallback notice stays in viewport at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(require('node:os').tmpdir(), 'grg-city-webgl-fallback-1280.png') });
});
