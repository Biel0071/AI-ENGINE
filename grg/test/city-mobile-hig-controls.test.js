'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('mobile City controls meet Apple touch target size and stay reachable by horizontal scroll', async (t) => {
  const app = express();
  app.get('/city-hig-fixture', (_req, res) => res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/city-reality.css"><link rel="stylesheet" href="/fenix-responsive.css"><link rel="stylesheet" href="/city-sidebar-overlay-fix.css"><link rel="stylesheet" href="/fenix-hig-system.css"><link rel="stylesheet" href="/city-runtime-composition.css"><main id="view-city"><div id="fenixCityWorldArea" class="fenix-city-canvas-area"><div id="fenixCityNavPill" class="fenix-city-floating-pill">${Array.from({ length: 5 }, (_, i) => `<button type="button" class="fenix-city-pill-btn" aria-label="Modo ${i + 1}">${i + 1}</button>`).join('')}</div><section id="fenixWorldMinimap" class="fenix-city-minimap"><header class="fenix-city-minimap-header"><span>MAPA OPERACIONAL</span><small>AO VIVO</small></header><div class="fenix-city-minimap-stage"><canvas id="fenixMinimap" width="220" height="144"></canvas><div class="fenix-city-minimap-controls"><button type="button" class="fnx-btn-2d3d">3D</button><button type="button">+</button><button type="button">−</button></div></div></section><div id="fenixUniverseExplorerHUD" class="fenix-universe-hud"><button type="button" class="fuh-level-btn"><span>Universo</span></button><button type="button" class="fuh-level-btn"><span>Ilha</span></button><button type="button" class="fuh-icon-btn" aria-label="Aproximar">+</button><button type="button" class="fuh-icon-btn" aria-label="Afastar">−</button></div></div></main>`));
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections?.(); await new Promise((resolve) => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });

  for (const viewport of [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 1072, height: 1084 }, { width: 1920, height: 1080 }]) {
    const { width } = viewport;
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${server.address().port}/city-hig-fixture`);
    const metrics = await page.evaluate(() => {
      const size = (selector) => [...document.querySelectorAll(selector)].map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });
      const nav = document.querySelector('#fenixCityNavPill');
      const mapStage = document.querySelector('.fenix-city-minimap-stage').getBoundingClientRect();
      const mapControls = document.querySelector('.fenix-city-minimap-controls').getBoundingClientRect();
      return {
        nav: { clientWidth: nav.clientWidth, scrollWidth: nav.scrollWidth, overflowX: getComputedStyle(nav).overflowX },
        navButtons: size('.fenix-city-pill-btn'),
        mapButtons: size('.fenix-city-minimap-controls button'),
        mapControlsCenterOffset: Math.abs((mapControls.left + mapControls.right) / 2 - (mapStage.left + mapStage.right) / 2),
        hudButtons: size('.fuh-level-btn, .fuh-icon-btn'),
        mapHeading: getComputedStyle(document.querySelector('.fenix-city-minimap-header')).fontSize
      };
    });
    const minimumTarget = width <= 760 ? 44 : 20;
    for (const [group, buttons] of Object.entries({ nav: metrics.navButtons, minimap: metrics.mapButtons, hud: metrics.hudButtons })) {
      for (const [index, button] of buttons.entries()) {
        assert.ok(button.width >= minimumTarget && button.height >= minimumTarget, `${group}[${index}] target at ${width}px is ${button.width}×${button.height}`);
      }
    }
    if (width <= 760) {
      assert.equal(metrics.nav.overflowX, 'auto', `navigation must remain scrollable at ${width}px`);
      assert.ok(metrics.nav.scrollWidth > metrics.nav.clientWidth, `partially visible navigation item should indicate more controls at ${width}px`);
    }
    assert.ok(metrics.mapControlsCenterOffset <= 1, `minimap zoom controls should be centered at ${width}px: ${metrics.mapControlsCenterOffset}px`);
    if (width <= 760) assert.ok(parseFloat(metrics.mapHeading) >= 10, `minimap heading is too small at ${width}px: ${metrics.mapHeading}`);
    await page.close();
  }
});
