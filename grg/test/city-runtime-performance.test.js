'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');

test('city composition keeps the canvas within the available viewport height', async (t) => {
  const app = express();
  app.get('/fixture', (_req, res) => res.type('html').send(`<!doctype html><html><head>
    <link rel="stylesheet" href="/city-runtime-composition.css"></head>
    <body style="margin:0;height:100dvh"><header style="height:56px"></header>
      <main id="view-city" class="active" style="display:flex;flex-direction:column;height:calc(100dvh - 56px)">
        <div style="height:48px;flex:none"></div>
        <section class="fenix-city-canvas-area" style="position:relative;flex:1;width:100%;height:100%;min-height:480px;overflow:hidden">
          <div class="fw3-context" style="position:absolute;right:8px;top:8px;width:294px;height:500px"></div>
        </section>
      </main></body></html>`));
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

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage();
  for (const viewport of [{ width: 375, height: 667 }, { width: 768, height: 900 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`, { waitUntil: 'load' });
    const layout = await page.evaluate(() => {
      const root = document.querySelector('#view-city').getBoundingClientRect();
      const canvas = document.querySelector('.fenix-city-canvas-area').getBoundingClientRect();
      const context = document.querySelector('.fw3-context').getBoundingClientRect();
      return { rootBottom: root.bottom, canvasTop: canvas.top, canvasBottom: canvas.bottom, canvasMinHeight: getComputedStyle(document.querySelector('.fenix-city-canvas-area')).minHeight, contextWidth: context.width, viewportWidth: innerWidth };
    });
    assert.ok(layout.canvasBottom <= layout.rootBottom + 1, `canvas exceeds City at ${viewport.width}px: ${JSON.stringify(layout)}`);
    assert.equal(layout.canvasMinHeight, '0px', `canvas retained a fixed minimum height at ${viewport.width}px`);
    const contextMax = Math.min(360, viewport.width - (viewport.width <= 760 ? 16 : 24));
    assert.ok(layout.contextWidth <= contextMax + 1, `floating panel exceeds available width: ${JSON.stringify(layout)}`);
  }
});

test('city quality controls use shared state and lower-cost rendering', () => {
  const cityReality = fs.readFileSync(path.join(publicDir, 'city-reality-engine.js'), 'utf8');
  const city3d = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
  const city2d = fs.readFileSync(path.join(publicDir, 'iso-city.js'), 'utf8');
  assert.match(cityReality, /window\.FENIX\?\.cityWorld\?\.snapshot/);
  assert.doesNotMatch(cityReality, /fetchFn\('\/api\/v2\/living-city\/state'/);
  assert.doesNotMatch(city2d, /setInterval\(\(\) => \{\s*const active = document\.querySelector\('\.view\.active'\)/);
  assert.match(city3d, /preserveDrawingBuffer:\s*false/);
  assert.match(city3d, /setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, 1\.5\)\)/);
  assert.doesNotMatch(city3d, /setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, 2\)\)/);
});

test('entering the city never retries failed world syncs from the animation-frame loop', () => {
  const city3d = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
  const resume = city3d.match(/_resumeAnimationLoop\(\)\s*\{([\s\S]*?)\n    \}/);
  assert.ok(resume, 'city animation loop should have a single resume method');
  assert.doesNotMatch(resume[1], /syncRealData\(\)/,
    'a failed API read must not trigger another network sync on every animation frame');
  assert.match(city3d, /addEventListener\(['"]fenix:city-world['"],\s*this\.syncRealData\)/,
    'the renderer should continue to apply event-backed world snapshots');
  const publisher = fs.readFileSync(path.join(publicDir, 'premium-world-live.js'), 'utf8');
  assert.match(publisher, /setInterval\(\(\) => \{ if \(view\.classList\.contains\('active'\)\) refresh\(\); \}, 15000\)/,
    'the shared publisher keeps a bounded 15-second refresh cadence');
});

test('City retains one bounded world refresh when the 3D engine initializes before the publisher', () => {
  const city3d = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
  assert.match(city3d, /if \(typeof worldState\.refresh !== 'function' \|\| worldState\.refreshOwner === 'world3d'\)[\s\S]{0,700}this\._worldRefreshTimer = setInterval/,
    'the renderer must own a bounded fallback cadence when the publisher has not installed one');
  assert.match(city3d, /if \(!document\.hidden && view\?\.classList\.contains\('active'\)\) worldState\.refresh\(\);/,
    'the fallback cadence must use the shared refresh and remain inactive outside the visible City');
  assert.match(city3d, /clearInterval\(this\._worldRefreshTimer\)/,
    'disposing the renderer must clear its polling timer');
  assert.match(city3d, /fenix:city-world['"],\s*this\.syncRealData/,
    'the 3D renderer should apply measured shared snapshots');
  assert.match(city3d, /const hasSharedAgentProjection = Array\.isArray\(sharedSnapshot\?\.agents\);/,
    'an authoritative empty agent list should also avoid a second API lookup');
  assert.doesNotMatch(city3d, /world\?\.syncRealData\?\.\(\);/,
    'changing routes must not trigger a parallel direct API read');
});

test('City route loading coalesces duplicate mounts and does not start a parallel renderer read', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const loader = html.match(/window\.loadCityView = async function\(options = \{\}\) \{([\s\S]*?)\n  \};/);
  assert.ok(loader, 'City loader should support explicit refresh options');
  assert.match(loader[1], /window\.__fenixCityLoading/,
    'duplicate route restoration must share one in-flight City load');
  assert.match(loader[1], /__fenixCityLastLoadAt/,
    'route restoration should reuse a recent successful snapshot');
  assert.match(loader[1], /window\.FENIX\?\.cityWorld\?\.refresh/,
    'the route loader should reuse the shared world publisher');
  assert.doesNotMatch(loader[1], /world3D\.syncRealData\?\.\(\);/,
    'the 3D renderer already owns a measured refresh and must not race the route loader');
  assert.doesNotMatch(html, /window\.fenixCity\.syncRealData\?\.\(\);/,
    'the canonical router must not start a second refresh after invoking the City loader');
  assert.match(html, /loadCityView\?\.\(\{\s*force:\s*true\s*\}\)/,
    'the explicit refresh control should bypass the route snapshot cache');
});

test('City SSE events use the debounced shared publisher instead of starting a second renderer fetch', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const handler = html.match(/const handleCityRuntimeEvent = \(e\) => \{([\s\S]*?)\n          \};/);
  assert.ok(handler, 'the City SSE handler should be available');
  assert.doesNotMatch(handler[1], /fenixCity\.syncRealData\(\)/,
    'event history updates must not trigger an independent renderer API read');
  assert.match(handler[1], /fenixCityEventRefreshTimer/,
    'runtime events should schedule one debounced refresh even when the 3D renderer owns the world');
  assert.match(fs.readFileSync(path.join(publicDir, 'premium-world-live.js'), 'utf8'),
    /document\.addEventListener\('fenix-live',[\s\S]*?scheduleRefresh\(\)/,
    'the shared publisher should coalesce runtime events into one world refresh');
  assert.match(fs.readFileSync(path.join(publicDir, 'premium-world-live.js'), 'utf8'),
    /if \(world\.refreshPromise\) return world\.refreshPromise/,
    'concurrent route and event refreshes should share one in-flight request');
  assert.match(fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8'),
    /worldState\.refreshPromise/,
    'the renderer-owned world refresh should also share in-flight requests');
});

test('initial route restoration is scheduled once when both DOMContentLoaded and load fire', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const boot = html.match(/\/\/ Restore an explicit URL route, otherwise start in the primary City workspace\.([\s\S]*?)\n\s*\/\/ FÊNIX OS V12/);
  assert.ok(boot, 'route restoration bootstrap should be available');
  assert.match(boot[1], /__fenixRouteRestored/,
    'route bootstrap should guard against browser lifecycle events firing twice');
  assert.match(boot[1], /window\.addEventListener\('load',[\s\S]*?restoreRouteOnLoad/,
    'late script execution should retain a guarded load fallback');
});

test('City contextual polling pauses in background and never overlaps a slow refresh', () => {
  const cityReality = fs.readFileSync(path.join(publicDir, 'city-reality-engine.js'), 'utf8');
  const poll = cityReality.match(/this\.pollTimer\s*=\s*setInterval\(\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},\s*15000\)/);
  assert.ok(poll, 'City should retain its bounded contextual refresh cadence');
  assert.match(poll[1], /document\.hidden/, 'background tabs must not keep polling City panels');
  assert.match(poll[1], /this\._polling/, 'a slow refresh must not overlap the next polling cycle');
  assert.match(poll[1], /Promise\.allSettled/, 'panel refreshes should release the polling guard even when one fails');
});
