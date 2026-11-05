'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');

test('idle agent presence uses subtle upper-body animation without creating movement', () => {
  const source = require('node:fs').readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
  const start = source.indexOf('      // 3d. Habbo/Tibia 3D Autonomous Agent Life Animations');
  const end = source.indexOf('      // 4. Update 3D Floating Status Badge Position', start);
  const animation = source.slice(start, end);
  assert.match(animation, /const allowSubtleAnim = inFrustum && camDist < 60/);
  assert.match(animation, /const idleHeadTurn = agentIsWorking \? 0\.18 : 0\.07/);
  assert.match(animation, /if \(!ud\.isSeated && ud\.head && allowSubtleAnim\)/);
  assert.match(animation, /Math\.sin\(aTime \* 0\.6\) \* idleHeadTurn/);
  assert.match(animation, /if \(agentRecord\.path && agentRecord\.path\.length > 0\)/);
  assert.match(animation, /else if \(agentRecord\.telemetryTarget && this\._advanceAgentToTelemetry/);
  assert.doesNotMatch(animation, /else\s*\{[^}]*agentRecord\.mesh\.position\.(?:x|z)\s*[+\-]?=/);
});

test('clicking a City agent uses the readable agent focus distance', () => {
  const source = require('node:fs').readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
  const clickStart = source.indexOf('    _handleCanvasClick(e) {');
  const clickHandler = source.slice(clickStart, source.indexOf('    _updateCameraPosition(', clickStart));
  assert.match(clickHandler, /this\.focusEntity\(targetPos,\s*44\)/);
  assert.doesNotMatch(clickHandler, /this\.focusEntity\(targetPos,\s*8\)/);
  const focusAgentStart = source.indexOf('    focusAgent(agentId) {');
  const focusAgent = source.slice(focusAgentStart, source.indexOf('    toggleDayNight()', focusAgentStart));
  assert.match(focusAgent, /this\.focusEntity\(new T\.Vector3\(wPos\.x,[\s\S]*?,\s*44,\s*Math\.PI \/ 4,\s*0\.54\)/);
});

test('agent Inspector fits the viewport and keeps a bounded scroll area', async (t) => {
  const app = express();
  app.get('/inspector-fixture.html', (_req, res) => res.type('html').send(`<!doctype html>
    <html><head>
      <link rel="stylesheet" href="/fenix-hig-system.css">
      <link rel="stylesheet" href="/fenix-v11-evolution.css">
      <link rel="stylesheet" href="/fenix-window-overrides.css">
      <link rel="stylesheet" href="/city-runtime-composition.css">
      <link rel="stylesheet" href="/city-inspector-layer.css">
      <link rel="stylesheet" href="/city-sidebar-overlay-fix.css">
    </head><body style="margin:0;--topbar-height:64px;--bottom-dock-height:36px">
      <main id="view-city" class="view active" style="position:relative;width:100vw;height:100dvh">
        <aside class="fw3-context" aria-label="Detalhes da seleção"><h2>CEO Agent</h2></aside>
        <aside id="fenixWorldAgentInspector" style="display:flex;position:absolute;top:12px;right:16px;width:340px;overflow:hidden">
          <header>CEO Agent <button>Fechar</button></header>
          <div style="padding:12px;max-height:520px;overflow-y:auto">${'<p>Detalhes reais do agente.</p>'.repeat(40)}</div>
        </aside>
      </main>
      <aside id="fenixInspectorDrawer" class="fenix-inspector-drawer open" aria-label="Agent Inspector">
        <header class="fenix-drawer-header"><h3>CEO Agent</h3><button class="fenix-drawer-close">Close</button></header>
        <nav class="fenix-drawer-nav-tabs"><button class="fenix-dr-tab">Visão Geral</button><button class="fenix-dr-tab">Telemetria</button></nav>
        <div class="fenix-drawer-body"><section class="fenix-insp-section"><div class="fenix-insp-grid">
          <div><small>ID canônico</small><p>agent.ceo</p></div><div><small>Status operacional</small><p>AVAILABLE</p></div>
        </div></section><section class="fenix-insp-section">${'Informação real do agente. '.repeat(40)}</section></div>
        <footer class="fenix-drawer-footer"><button>Ver eventos</button></footer>
      </aside>
    </body></html>`));
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
  const page = await browser.newPage();
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`http://127.0.0.1:${server.address().port}/inspector-fixture.html`, { waitUntil: 'load' });
    await page.addStyleTag({ content: '#fenixInspectorDrawer { animation: none !important; transition: none !important; transform: none !important; }' });
    const box = await page.locator('#fenixInspectorDrawer').evaluate((node) => {
      const r = node.getBoundingClientRect();
      const tab = node.querySelector('.fenix-dr-tab').getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, tabHeight: tab.height, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(box.left >= 0 && box.right <= viewport.width, `Inspector exceeds horizontal viewport at ${viewport.width}px: ${JSON.stringify(box)}`);
    assert.ok(box.top >= 0 && box.bottom <= viewport.height, `Inspector exceeds vertical viewport at ${viewport.width}px: ${JSON.stringify(box)}`);
    assert.ok(box.width <= (viewport.width < 761 ? viewport.width - 16 : 440), `Inspector width is not bounded at ${viewport.width}px: ${JSON.stringify(box)}`);
    assert.ok(box.tabHeight >= 40, `Inspector tab target is too small at ${viewport.width}px: ${JSON.stringify(box)}`);
    assert.ok(box.documentWidth <= viewport.width, `Inspector causes page overflow at ${viewport.width}px: ${JSON.stringify(box)}`);
    const cityBox = await page.locator('#fenixWorldAgentInspector').evaluate((node) => {
      const r = node.getBoundingClientRect();
      const content = node.children[1];
      return {
        left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        width: r.width,
        overflowY: getComputedStyle(content).overflowY,
        contentHeight: content.clientHeight,
        contentScrollHeight: content.scrollHeight,
      };
    });
    assert.ok(cityBox.left >= 0 && cityBox.right <= viewport.width, `City Inspector exceeds horizontal viewport at ${viewport.width}px: ${JSON.stringify(cityBox)}`);
    assert.ok(cityBox.top >= 0 && cityBox.bottom <= viewport.height, `City Inspector exceeds vertical viewport at ${viewport.width}px: ${JSON.stringify(cityBox)}`);
    assert.ok(cityBox.width <= viewport.width - 16, `City Inspector is not responsive at ${viewport.width}px: ${JSON.stringify(cityBox)}`);
    assert.equal(cityBox.overflowY, 'auto', 'City Inspector content must scroll independently');
    assert.ok(cityBox.contentScrollHeight > cityBox.contentHeight, 'long City Inspector content must remain accessible through its own scroll area');
    assert.equal(await page.locator('.fw3-context').evaluate((node) => getComputedStyle(node).display), 'none', 'the compact City context must not duplicate the open agent Inspector');
    await page.locator('#fenixInspectorDrawer').evaluate((node) => node.classList.remove('open'));
    assert.notEqual(await page.locator('.fw3-context').evaluate((node) => getComputedStyle(node).display), 'none', 'closing the Inspector must restore the selected entity context');
    await page.locator('#fenixInspectorDrawer').evaluate((node) => node.classList.add('open'));
  }
});
