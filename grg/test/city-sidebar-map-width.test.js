'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');

test('tablet chat overlays the City without shrinking its map viewport', async (t) => {
  const app = express();
  app.get('/fixture', (_req, res) => res.type('html').send(`<!doctype html>
    <link rel="stylesheet" href="/fenix-responsive.css">
    <style>
      html,body{margin:0;width:100%;height:100%;overflow:hidden}
      .main-body{display:flex;width:100vw;height:100vh}
      #mainSidebarNav{flex:0 0 68px;width:68px}
      .views-container{position:relative;flex:1 1 0;min-width:0}
      #view-city{position:absolute;inset:0}
      #fenixCityWorldArea{width:100%;height:100%}
    </style>
    <body class="has-right-sidebar-open fsb-docked">
      <main class="main-body"><nav id="mainSidebarNav"></nav>
        <div class="views-container"><section id="view-city" class="active"><div id="fenixCityWorldArea"></div></section></div>
        <aside id="fenix-right-sidebar" class="open">Chat</aside>
      </main>
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
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/fixture`, { waitUntil: 'load' });
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      map: document.querySelector('.views-container').getBoundingClientRect().width,
      chat: document.querySelector('#fenix-right-sidebar').getBoundingClientRect().width,
      chatLeft: document.querySelector('#fenix-right-sidebar').getBoundingClientRect().left,
    }));
    const minMapWidth = width === 375 ? 220 : width * 0.78;
    assert.ok(layout.map > minMapWidth, `map should retain usable width behind the chat at ${width}px: ${JSON.stringify(layout)}`);
    assert.ok(layout.chatLeft > 0 && layout.chatLeft < layout.viewport, `chat should remain an accessible overlay at ${width}px: ${JSON.stringify(layout)}`);
  }
});
