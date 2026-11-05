'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');

test('mobile Fenix sidebar stays a bottom sheet until explicitly expanded', async (t) => {
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

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
  const result = await page.evaluate(() => {
    document.body.classList.add('has-right-sidebar-open');
    const sidebar = document.createElement('aside');
    sidebar.id = 'fenix-right-sidebar';
    sidebar.className = 'open state-open';
    sidebar.innerHTML = '<header class="fsb-header"><button aria-label="Expandir conversa"></button></header><main>Conversa</main>';
    document.body.append(sidebar);
    const panel = () => {
      const rect = sidebar.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    };
    const sheet = panel();
    sidebar.classList.add('state-expanded');
    return { sheet, expanded: panel(), viewport: innerHeight, cityCanvas: getComputedStyle(document.querySelector('#fenixCityWorldArea')).display };
  });

  assert.ok(result.sheet.top > result.viewport * 0.28, `chat sheet should leave a visible city area: ${JSON.stringify(result)}`);
  assert.ok(result.sheet.height < result.viewport * 0.68, `chat sheet should not cover the map: ${JSON.stringify(result)}`);
  assert.ok(result.expanded.height > result.viewport * 0.82, `expanded chat should provide a full-screen reading mode: ${JSON.stringify(result)}`);
  assert.notEqual(result.cityCanvas, 'none', 'city canvas should remain mounted behind chat');
  const evidenceDir = path.resolve(__dirname, '..', 'docs', 'visual-evidence', '2026-10-20');
  require('node:fs').mkdirSync(evidenceDir, { recursive: true });
  await page.evaluate(() => document.querySelectorAll('#fenix-right-sidebar').item(document.querySelectorAll('#fenix-right-sidebar').length - 1)?.classList.remove('state-expanded'));
  await page.screenshot({ path: path.join(evidenceDir, 'sidebar-city-sheet-375-after.png'), fullPage: true });
});

test('city universe HUD remains inside the map when the right sidebar is open', async (t) => {
  const app = express();
  app.get('/hud-fixture.html', (_req, res) => res.type('html').send(`<!doctype html>
    <html><head><link rel="stylesheet" href="/city-reality.css"><link rel="stylesheet" href="/fenix-responsive.css"></head>
    <body class="has-right-sidebar-open" style="margin:0;--fsb-width:520px">
      <main id="view-city" style="position:relative;margin-left:72px;width:calc(100vw - 76px);height:900px">
        <section id="fenixCityWorldArea" style="position:relative;width:100%;height:100%">
          <div id="fenixUniverseExplorerHUD" class="fenix-universe-hud" style="height:52px"></div>
        </section>
      </main>
      <aside id="fenix-right-sidebar" style="position:fixed;right:8px;top:72px;bottom:40px;width:clamp(320px,42vw,440px)"></aside>
    </body></html>`));
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
  const page = await browser.newPage({ viewport: { width: 926, height: 1375 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/hud-fixture.html`, { waitUntil: 'load' });
  for (const width of [768, 926, 1180]) {
    await page.setViewportSize({ width, height: 1375 });
    const bounds = await page.evaluate(() => {
      const hud = document.getElementById('fenixUniverseExplorerHUD').getBoundingClientRect();
      const map = document.getElementById('fenixCityWorldArea').getBoundingClientRect();
      const sidebar = document.getElementById('fenix-right-sidebar').getBoundingClientRect();
      return { hud: { left: hud.left, right: hud.right, width: hud.width }, map: { left: map.left, right: map.right }, sidebar: { left: sidebar.left } };
    });

    assert.ok(bounds.hud.left >= bounds.map.left, `City HUD starts outside the map at ${width}px: ${JSON.stringify(bounds)}`);
    assert.ok(bounds.hud.right <= bounds.sidebar.left - 8, `City HUD overlaps the chat sidebar at ${width}px: ${JSON.stringify(bounds)}`);
  }
});

test('city minimap, view switcher and universe toolbar do not overlap at supported widths', async (t) => {
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
  const page = await browser.newPage();

  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const geometry = await page.evaluate(() => {
      const selectors = ['#fenixWorldMinimap', '#fenixCityNavPill', '#fenixUniverseExplorerHUD'];
      return Object.fromEntries(selectors.map((selector) => {
        const node = document.querySelector(selector);
        const rect = node.getBoundingClientRect();
        return [selector, { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, display: getComputedStyle(node).display }];
      }));
    });

    const visible = Object.entries(geometry).filter(([, rect]) => rect.display !== 'none');
    for (let left = 0; left < visible.length; left += 1) {
      for (let right = left + 1; right < visible.length; right += 1) {
        const [leftName, a] = visible[left];
        const [rightName, b] = visible[right];
        const overlaps = a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
        assert.equal(overlaps, false, `${leftName} overlaps ${rightName} at ${viewport.width}px: ${JSON.stringify(geometry)}`);
      }
    }
    if (viewport.width === 375) {
      const evidenceDir = path.resolve(__dirname, '..', 'docs', 'visual-evidence', '2026-10-21');
      fs.mkdirSync(evidenceDir, { recursive: true });
      await page.screenshot({ path: path.join(evidenceDir, 'city-minimap-nav-gap-375-after.png'), fullPage: true });
    }
  }
});

test('opening the Fenix sidebar suppresses the duplicate floating agent inspector', async (t) => {
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
  const page = await browser.newPage();

  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
    const result = await page.evaluate(() => {
      document.body.classList.add('has-right-sidebar-open');
      const inspector = document.getElementById('fenixWorldAgentInspector');
      inspector.style.display = 'block';
      return getComputedStyle(inspector).display;
    });
    assert.equal(result, 'none', `floating agent inspector remains visible with sidebar open at ${viewport.width}px`);
  }
});

test('city district selector labels fit its mobile control width', async (t) => {
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
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });

  const overflow = await page.evaluate(() => {
    const select = document.getElementById('fuhIslandSelector');
    const style = getComputedStyle(select);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = style.font;
    const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 20;
    return Array.from(select.options, (option) => ({ label: option.textContent.trim(), width: context.measureText(option.textContent.trim()).width, available }))
      .filter((option) => option.width > option.available);
  });

  assert.deepEqual(overflow, [], `district labels overflow on a 375px viewport: ${JSON.stringify(overflow)}`);
  const districtValues = await page.locator('#fuhIslandSelector option').evaluateAll((options) => options.map((option) => option.value));
  assert.deepEqual(districtValues, ['command-center', 'project-district', 'dev-district', 'ai-district', 'creative-district', 'observatory', 'industrial', 'porto', 'data-center']);
});

test('city agent inspector stays clear of runtime notice and floating city controls', async (t) => {
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
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('cityRuntimeLoadStatus')?.hidden === false, null, { timeout: 5000 });

  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const overlaps = await page.evaluate(() => {
      const host = document.querySelector('.fenix-world-3d');
      if (!host) throw new Error('City 3D host did not initialize');
      host.querySelector('.fw3-context')?.remove();
      const panel = document.createElement('aside');
      panel.className = 'fw3-context';
      panel.hidden = false;
      panel.style.height = '420px';
      panel.textContent = 'Inspector do agente com detalhes e ações';
      host.append(panel);
      const panelRect = panel.getBoundingClientRect();
      return ['#cityRuntimeLoadStatus', '#fenixWorldMinimap', '#fenixCityNavPill', '#fenixUniverseExplorerHUD', '#fnxProviderOrbit']
        .map((selector) => {
          const node = document.querySelector(selector);
          const controlRect = node.getBoundingClientRect();
          const visible = getComputedStyle(node).display !== 'none';
          const intersects = panelRect.left < controlRect.right && panelRect.right > controlRect.left
            && panelRect.top < controlRect.bottom && panelRect.bottom > controlRect.top;
          const bounds = (rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
          return { selector, visible, intersects, panel: bounds(panelRect), control: bounds(controlRect) };
        })
        .filter((item) => item.visible && item.intersects);
    });

    assert.deepEqual(overlaps, [], `agent inspector overlaps city controls at ${viewport.width}px: ${JSON.stringify(overlaps)}`);
  }
});

test('city media panel stays inside the viewport and clear of map controls', async (t) => {
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
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });

  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const result = await page.evaluate(() => {
      const panel = document.getElementById('fenixCityMediaPanel');
      panel.hidden = false;
      panel.style.display = 'flex';
      const rect = panel.getBoundingClientRect();
      const bounds = (item) => ({ left: item.left, top: item.top, right: item.right, bottom: item.bottom });
      const header = panel.querySelector('.fenix-city-media-header').getBoundingClientRect();
      const content = panel.querySelector('.fenix-city-media-content')?.getBoundingClientRect();
      const close = panel.querySelector('.fenix-city-media-close').getBoundingClientRect();
      const search = panel.querySelector('#fenixCityMediaQuery').getBoundingClientRect();
      const panelStyle = getComputedStyle(panel);
      const submitStyle = getComputedStyle(panel.querySelector('.fenix-city-media-submit'));
      const controls = ['#cityRuntimeLoadStatus', '#fenixWorldMinimap', '#fenixCityNavPill', '#fenixUniverseExplorerHUD', '#fnxProviderOrbit']
        .map((selector) => {
          const node = document.querySelector(selector);
          const control = node.getBoundingClientRect();
          const visible = getComputedStyle(node).display !== 'none';
          const intersects = rect.left < control.right && rect.right > control.left
            && rect.top < control.bottom && rect.bottom > control.top;
          return { selector, visible, intersects, panel: bounds(rect), control: bounds(control) };
        }).filter((item) => item.visible && item.intersects);
      return { panel: bounds(rect), header: bounds(header), close: bounds(close), content: content ? bounds(content) : null, search: bounds(search), appearance: { background: panelStyle.backgroundColor, backgroundImage: panelStyle.backgroundImage, shadow: panelStyle.boxShadow, radius: panelStyle.borderRadius, submitHeight: submitStyle.height, submitBackground: submitStyle.backgroundColor }, viewport: { width: innerWidth, height: innerHeight }, controls };
    });
    const outOfBounds = result.panel.left < 0 || result.panel.top < 0 || result.panel.right > viewport.width || result.panel.bottom > viewport.height;
    assert.equal(outOfBounds, false, `media panel escapes viewport at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.deepEqual(result.controls, [], `media panel blocks map controls at ${viewport.width}px: ${JSON.stringify(result.controls)}`);
    assert.ok(result.content, 'media panel content must have its own scroll region');
    assert.ok(result.search.right - result.search.left >= 80, `media search input is too narrow at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.ok(result.close.left >= result.header.left && result.close.right <= result.header.right && result.close.top >= result.header.top && result.close.bottom <= result.header.bottom, `close button escapes media header at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.ok(result.header.bottom <= result.content.top, `media header overlaps scrollable content at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.ok(result.content.bottom <= result.panel.bottom, `media content exceeds panel bounds at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.equal(result.appearance.background, 'rgba(29, 30, 35, 0.98)', `media panel should use the shared neutral surface at ${viewport.width}px`);
    assert.equal(result.appearance.backgroundImage, 'none', `media panel should not use a competing gradient at ${viewport.width}px`);
    assert.equal(result.appearance.shadow, 'rgba(0, 0, 0, 0.28) 0px 8px 28px 0px', `media panel shadow should remain restrained at ${viewport.width}px`);
    assert.equal(result.appearance.radius, '14px', `media panel should follow the shared radius at ${viewport.width}px`);
    assert.ok(Number.parseFloat(result.appearance.submitHeight) >= 40, `media submit action should meet the 40px target at ${viewport.width}px`);
  }
});

test('city cockpit, operations and media drawers never stay open together', async (t) => {
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
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.fenixToggleCityCockpit === 'function'
    && typeof window.fenixToggleCityOps === 'function'
    && document.getElementById('btnCityMediaLibrary'));

  await page.locator('#btnCityMediaLibrary').click();
  await page.waitForFunction(() => document.getElementById('fenixCityMediaPanel')?.hidden === false);
  const mediaDialog = await page.locator('#fenixCityMediaPanel').evaluate((panel) => ({
    role: panel.getAttribute('role'),
    modal: panel.getAttribute('aria-modal'),
    label: panel.getAttribute('aria-labelledby'),
    hidden: panel.getAttribute('aria-hidden'),
    focusedInside: panel.contains(document.activeElement),
  }));
  assert.deepEqual(mediaDialog, { role: 'dialog', modal: 'true', label: 'fenixCityMediaTitle', hidden: 'false', focusedInside: true });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#fenixCityMediaPanel').evaluate((panel) => panel.hidden), true, 'Escape must close the media dialog');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'btnCityMediaLibrary', 'closing media must restore focus to its opener');
  await page.locator('#btnCityMediaLibrary').click();
  await page.waitForFunction(() => document.getElementById('fenixCityMediaPanel')?.hidden === false);
  await page.evaluate(() => window.fenixToggleCityCockpit());
  let openPanels = await page.evaluate(() => ['fenixCityCockpitDrawer', 'fenixCityOpsDrawer', 'fenixCityMediaPanel']
    .filter((id) => { const panel = document.getElementById(id); return panel && !panel.hidden && getComputedStyle(panel).display !== 'none'; }));
  assert.deepEqual(openPanels, ['fenixCityCockpitDrawer'], 'opening the cockpit must close media and operations panels');
  const cockpitDialog = await page.locator('#fenixCityCockpitDrawer').evaluate((drawer) => ({
    role: drawer.getAttribute('role'),
    modal: drawer.getAttribute('aria-modal'),
    label: drawer.getAttribute('aria-labelledby'),
    hidden: drawer.getAttribute('aria-hidden'),
    focusedInside: drawer.contains(document.activeElement),
  }));
  assert.deepEqual(cockpitDialog, { role: 'dialog', modal: 'true', label: 'cityCockpitDrawerTitle', hidden: 'false', focusedInside: true });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#fenixCityCockpitDrawer').evaluate((panel) => getComputedStyle(panel).display), 'none', 'Escape must close the cockpit dialog');

  await page.evaluate(() => {
    document.getElementById('btnCityModeOps')?.focus();
    window.fenixToggleCityOps();
  });
  openPanels = await page.evaluate(() => ['fenixCityCockpitDrawer', 'fenixCityOpsDrawer', 'fenixCityMediaPanel']
    .filter((id) => { const panel = document.getElementById(id); return panel && !panel.hidden && getComputedStyle(panel).display !== 'none'; }));
  assert.deepEqual(openPanels, ['fenixCityOpsDrawer'], 'opening operations must close cockpit and media panels');
  const dialogState = await page.evaluate(() => {
    const trigger = document.getElementById('btnCityModeOps');
    const drawer = document.getElementById('fenixCityOpsDrawer');
    return {
      role: drawer.getAttribute('role'),
      modal: drawer.getAttribute('aria-modal'),
      label: drawer.getAttribute('aria-labelledby'),
      hidden: drawer.getAttribute('aria-hidden'),
      focusedInside: drawer.contains(document.activeElement),
      triggerExists: Boolean(trigger),
    };
  });
  assert.deepEqual(dialogState, { role: 'dialog', modal: 'true', label: 'cityOpsDrawerTitle', hidden: 'false', focusedInside: true, triggerExists: true }, 'operations panel must expose and focus its modal state');
  await page.locator('#fenixCityOpsDrawer button:visible').last().focus();
  await page.keyboard.press('Tab');
  const firstDialogControl = await page.locator('#fenixCityOpsDrawer button:visible').first().evaluate((button) => button === document.activeElement);
  assert.equal(firstDialogControl, true, 'Tab from the last action must remain within the dialog and wrap to its first action');
  await page.keyboard.press('Shift+Tab');
  const lastDialogControl = await page.locator('#fenixCityOpsDrawer button:visible').last().evaluate((button) => button === document.activeElement);
  assert.equal(lastDialogControl, true, 'Shift+Tab from the first action must wrap to the close control');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#fenixCityOpsDrawer').evaluate((panel) => getComputedStyle(panel).display), 'none', 'Escape must close the operations dialog');
  assert.equal(await page.evaluate(() => document.activeElement?.id), await page.evaluate(() => {
    const trigger = document.getElementById('btnCityModeOps');
    return trigger.getClientRects().length > 0 ? 'btnCityModeOps' : 'fenixCityWorldArea';
  }), 'closing the operations dialog must restore focus to its visible opener or map');
  await page.evaluate(() => window.fenixToggleCityOps());
  const operationsBounds = await page.evaluate(() => {
    const panel = document.getElementById('fenixCityOpsDrawer').getBoundingClientRect();
    const host = document.getElementById('fenixCityWorldArea').getBoundingClientRect();
    const notice = document.getElementById('cityRuntimeLoadStatus').getBoundingClientRect();
    const close = document.querySelector('#fenixCityOpsDrawer > div:first-child button:last-child').getBoundingClientRect();
    return { panel: [panel.left, panel.top, panel.right, panel.bottom], host: [host.left, host.top, host.right, host.bottom], notice: [notice.left, notice.top, notice.right, notice.bottom], close: [close.left, close.top, close.right, close.bottom] };
  });
  assert.ok(operationsBounds.panel[0] >= operationsBounds.host[0] && operationsBounds.panel[1] >= operationsBounds.host[1]
    && operationsBounds.panel[2] <= operationsBounds.host[2] && operationsBounds.panel[3] <= operationsBounds.host[3],
  `operations drawer escapes city area: ${JSON.stringify(operationsBounds)}`);
  const operationsHeight = operationsBounds.panel[3] - operationsBounds.panel[1];
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  assert.ok(operationsHeight <= viewportHeight * 0.5, `mobile operations drawer leaves too little of the city visible: ${JSON.stringify({ operationsHeight, viewportHeight })}`);
  const expandedDrawer = await page.evaluate(() => {
    const panel = document.getElementById('fenixCityOpsDrawer');
    const content = document.getElementById('cityOpsDrawerContent');
    const filler = document.createElement('div');
    filler.style.height = '900px';
    content.appendChild(filler);
    const result = { panelHeight: panel.getBoundingClientRect().height, viewportHeight: window.innerHeight, contentHeight: content.scrollHeight, contentViewport: content.clientHeight };
    filler.remove();
    return result;
  });
  assert.ok(expandedDrawer.panelHeight <= expandedDrawer.viewportHeight * 0.5, `expanded operations drawer exceeds half the viewport: ${JSON.stringify(expandedDrawer)}`);
  assert.ok(expandedDrawer.contentHeight > expandedDrawer.contentViewport, `expanded operations content should scroll within the drawer: ${JSON.stringify(expandedDrawer)}`);
  assert.ok(operationsBounds.close[0] >= operationsBounds.panel[0] && operationsBounds.close[2] <= operationsBounds.panel[2]
    && operationsBounds.close[1] >= operationsBounds.panel[1] && operationsBounds.close[3] <= operationsBounds.panel[3],
  `operations close control escapes drawer: ${JSON.stringify(operationsBounds)}`);
  assert.ok(operationsBounds.panel[1] >= operationsBounds.notice[3], `operations header overlaps runtime notice: ${JSON.stringify(operationsBounds)}`);
  if (process.env.FENIX_CITY_OPS_SCREENSHOT) await page.screenshot({ path: process.env.FENIX_CITY_OPS_SCREENSHOT, fullPage: true });
  await page.locator('#fenixCityOpsDrawer > div:first-child button:last-child').click();
  assert.equal(await page.locator('#fenixCityOpsDrawer').evaluate((panel) => getComputedStyle(panel).display), 'none', 'operations close control must restore the map');

  await page.evaluate(() => document.getElementById('btnCityMediaLibrary').click());
  await page.waitForFunction(() => document.getElementById('fenixCityMediaPanel')?.hidden === false);
  openPanels = await page.evaluate(() => ['fenixCityCockpitDrawer', 'fenixCityOpsDrawer', 'fenixCityMediaPanel']
    .filter((id) => { const panel = document.getElementById(id); return panel && !panel.hidden && getComputedStyle(panel).display !== 'none'; }));
  assert.deepEqual(openPanels, ['fenixCityMediaPanel'], 'opening media must close cockpit and operations panels');
  assert.equal(await page.locator('#btnCityMediaLibrary').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#fenixCityMediaPanel').evaluate((panel) => panel.hidden), true, 'media modal remains closable after replacing another drawer');
  await page.locator('#btnCityMediaLibrary').click();
  await page.waitForFunction(() => document.getElementById('fenixCityMediaPanel')?.hidden === false);

  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.FenixSidebar?.open());
    await page.waitForFunction(() => document.body.classList.contains('has-right-sidebar-open'));
    await page.evaluate(() => window.fenixToggleCityOps());
    const bounds = await page.evaluate(() => {
      const panel = document.getElementById('fenixCityOpsDrawer').getBoundingClientRect();
      const host = document.getElementById('fenixCityWorldArea').getBoundingClientRect();
      const notice = document.getElementById('cityRuntimeLoadStatus').getBoundingClientRect();
      const sidebar = document.getElementById('fenix-right-sidebar').getBoundingClientRect();
      const sidebarOpen = document.body.classList.contains('has-right-sidebar-open');
      const overlapsSidebar = sidebarOpen && panel.left < sidebar.right && panel.right > sidebar.left
        && panel.top < sidebar.bottom && panel.bottom > sidebar.top;
      return { panel: [panel.left, panel.top, panel.right, panel.bottom], host: [host.left, host.top, host.right, host.bottom], notice: [notice.left, notice.top, notice.right, notice.bottom], sidebarOpen, overlapsSidebar };
    });
    assert.ok(bounds.panel[0] >= bounds.host[0] && bounds.panel[1] >= bounds.host[1]
      && bounds.panel[2] <= bounds.host[2] && bounds.panel[3] <= bounds.host[3],
    `operations drawer escapes city area at ${viewport.width}px: ${JSON.stringify(bounds)}`);
    assert.ok(bounds.panel[1] >= bounds.notice[3], `operations drawer overlaps runtime notice at ${viewport.width}px: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.overlapsSidebar, false, `operations drawer overlaps the open Fênix sidebar at ${viewport.width}px: ${JSON.stringify(bounds)}`);
    if (viewport.width <= 760) assert.equal(bounds.sidebarOpen, false, 'small-screen operations should reclaim the map by collapsing the chat');
    await page.locator('#fenixCityOpsDrawer > div:first-child button:last-child').click();
    await page.evaluate(() => window.FenixSidebar?.collapse());
  }
});

test('city minimap and view switcher scale down in the remaining map beside chat', async (t) => {
  const app = express();
  app.get('/city-sidebar-fixture.html', (_req, res) => res.type('html').send(`<!doctype html><html><head><link rel="stylesheet" href="/city-reality.css"><link rel="stylesheet" href="/fenix-responsive.css"></head><body class="has-right-sidebar-open"><main id="view-city" style="position:relative;margin-left:234px;width:594px;height:652px"><div id="fenixCityNavPill" class="fenix-city-floating-pill docked-above-minimap"></div><section id="fenixWorldMinimap" class="fenix-city-minimap"><header class="fenix-city-minimap-header">Mapa</header><div class="fenix-city-minimap-stage"><canvas id="fenixMinimap" width="180" height="120"></canvas><div class="fenix-city-minimap-controls"><button>3D</button></div></div></section></main><aside id="fenix-right-sidebar"></aside></body></html>`));
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections?.(); await new Promise((resolve) => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/city-sidebar-fixture.html`, { waitUntil: 'load' });
  const geometry = await page.evaluate(() => {
    const minimap = document.querySelector('#fenixWorldMinimap').getBoundingClientRect();
    const nav = document.querySelector('#fenixCityNavPill').getBoundingClientRect();
    return { width: minimap.width, gap: minimap.top - nav.bottom, minimapRight: minimap.right, mapRight: document.querySelector('#view-city').getBoundingClientRect().right };
  });
  assert.ok(geometry.width <= 200, `minimap should be compact beside chat: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.gap >= 12 && geometry.gap <= 36, `map controls should retain a clear gap: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.minimapRight < geometry.mapRight, `minimap should remain inside exposed map: ${JSON.stringify(geometry)}`);
});
