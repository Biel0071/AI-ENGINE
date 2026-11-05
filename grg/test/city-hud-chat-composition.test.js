'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');

test('City HUD stays inside the map and avoids duplicate metric overlays with chat open', async (t) => {
  const app = express();
  app.get('/fixture', (_req, res) => res.type('html').send(`<!doctype html>
    <link rel="stylesheet" href="/fenix-world-3d.css">
    <link rel="stylesheet" href="/fenix-responsive.css">
    <link rel="stylesheet" href="/city-runtime-composition.css">
    <style>
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
      :root{--test-map-left:72px;--test-map-right:352px;--test-chat-width:332px}
      body:not(.has-right-sidebar-open){--test-map-right:20px}
      @media(min-width:761px) and (max-width:1180px){:root{--test-map-right:calc(42vw + 20px);--test-chat-width:clamp(320px,42vw,440px)}}
      @media(min-width:1181px) and (max-width:1500px){:root{--test-map-right:460px;--test-chat-width:440px}}
      @media(min-width:1501px){:root{--test-map-right:548px;--test-chat-width:520px}}
      @media(max-width:760px){:root{--test-map-left:72px;--test-map-right:80px;--test-chat-width:calc(100vw - 16px)}}
      #view-city{position:fixed!important;top:64px!important;left:var(--test-map-left)!important;width:calc(100vw - var(--test-map-left) - var(--test-map-right))!important;height:calc(100dvh - 148px)!important;overflow:hidden!important}
      #fenixCityWorldArea{position:relative!important;width:100%!important;height:100%!important}
      #fenixWorldMinimap{position:absolute;right:0;bottom:100px;width:236px;height:192px}
      #fenixCityNavPill{position:absolute;left:8px;bottom:287px;width:236px;height:43px}
      #fenix-right-sidebar{position:fixed;top:72px;right:8px;width:var(--test-chat-width);height:calc(100% - 80px)}
      .fenix-universe-hud{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);width:max-content;z-index:35}
      body.has-right-sidebar-open .fenix-universe-hud{left:calc((100% - var(--fsb-width,520px))/2)!important}
      .fuh-level-btn,.fuh-icon-btn{width:44px;height:44px;flex:0 0 44px}
      .fuh-divider{width:1px;height:24px}
    </style>
    <body class="has-right-sidebar-open fsb-docked">
      <section id="view-city" class="active"><div id="fenixCityWorldArea" class="fenix-city-canvas-area">
        <div id="fenixUniverseExplorerHUD" class="fenix-universe-hud">
          <button class="fuh-level-btn">Universo</button><button class="fuh-level-btn">Ilha</button>
          <button class="fuh-level-btn">De perto</button><select id="fuhIslandSelector"><option>Central</option></select>
          <button class="fuh-icon-btn">−</button><span id="fenixCityZoomLevel">1.35x</span>
          <button class="fuh-icon-btn">+</button><button class="fuh-icon-btn">↻</button>
        </div>
        <nav id="fenixCityNavPill"></nav><section id="fenixWorldMinimap"></section>
        <div class="fw3-ui"><div class="fw3-pulse"><div class="fw3-pulse-item"><small>AGENTES</small><strong>39</strong></div></div></div>
      </div></section><aside id="fenix-right-sidebar" class="open">Chat</aside>
    </body>`));
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 791, height: 1117 } });
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`, { waitUntil: 'load' });
    for (const chatOpen of [true, false]) {
      await page.evaluate((open) => {
        document.body.classList.toggle('has-right-sidebar-open', open);
      }, chatOpen);
      await page.evaluate(() => {
        const root = document.querySelector('#view-city');
        root.style.setProperty('position', 'fixed', 'important');
        root.style.setProperty('left', 'var(--test-map-left)', 'important');
        root.style.setProperty('top', '64px', 'important');
        root.style.setProperty('width', 'calc(100vw - var(--test-map-left) - var(--test-map-right))', 'important');
        root.style.setProperty('height', 'calc(100dvh - 148px)', 'important');
        root.style.setProperty('overflow', 'hidden', 'important');
        const area = document.querySelector('#fenixCityWorldArea');
        area.style.setProperty('position', 'relative', 'important');
        area.style.setProperty('width', '100%', 'important');
        area.style.setProperty('height', '100%', 'important');
      });
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, display: getComputedStyle(element).display };
      };
      return {
        map: rect('#fenixCityWorldArea'),
        hud: rect('#fenixUniverseExplorerHUD'),
        nav: rect('#fenixCityNavPill'),
        minimap: rect('#fenixWorldMinimap'),
        pulse: rect('.fw3-pulse'),
      };
    });
      const minHudWidth = width <= 760 ? 180 : 280;
      assert.ok(layout.hud.left >= layout.map.left + 7, `HUD clipped at ${width}px chat=${chatOpen}: ${JSON.stringify(layout)}`);
      assert.ok(layout.hud.right <= layout.map.right - 7, `HUD outside map at ${width}px chat=${chatOpen}: ${JSON.stringify(layout)}`);
      assert.ok(layout.hud.width >= minHudWidth, `camera controls too narrow at ${width}px chat=${chatOpen}: ${JSON.stringify(layout)}`);
      if (layout.nav.display !== 'none' && layout.nav.width > 0 && layout.minimap.display !== 'none') {
        assert.ok(layout.nav.bottom <= layout.minimap.top - 8, `navigation covers minimap at ${width}px chat=${chatOpen}: ${JSON.stringify(layout)}`);
      }
      assert.equal(layout.pulse.display, 'none', `duplicate metrics pulse visible at ${width}px chat=${chatOpen}: ${JSON.stringify(layout)}`);
    }
  }
});
