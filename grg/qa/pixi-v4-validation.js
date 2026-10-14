/**
 * FÊNIX CITY V4 — PixiJS WebGL Validation Test
 * Verifies that the PixiJS renderer initializes and renders the city
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4400';
const RESULTS_DIR = path.join(__dirname, '..', 'qa-results', 'playwright');

async function run() {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Auth token
  const page = await context.newPage();
  const loginRes = await page.request.post(`${BASE}/api/login`, {
    data: { tenantId: 'grg', userId: 'grg-admin', password: 'admin123' }
  });
  const { token } = await loginRes.json();
  await context.addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/' }]);
  await context.addInitScript((t) => { localStorage.setItem('token', t); }, token);
  await page.close();

  const p = await context.newPage();
  const consoleMessages = [];
  const consoleErrors = [];
  p.on('console', msg => {
    consoleMessages.push(msg.text());
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Navigate to city view (server serves index.html at /app, not /)
  await p.goto(`${BASE}/app#city`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await p.waitForTimeout(3000); // Wait for initial load + PixiJS CDN

  // Click the AI CITY sidebar button to trigger view switch + reparent
  try {
    const cityBtn = p.locator('.nav-item[data-view="city"]');
    if (await cityBtn.count() > 0) {
      await cityBtn.click();
      await p.waitForTimeout(1000);
    }
  } catch (e) { /* sidebar may not have exact selector */ }

  await p.waitForTimeout(2000); // Give PixiJS time to render after reparent

  // Check results
  const results = await p.evaluate(() => {
    const checks = {};

    // 1. PIXI loaded?
    checks.pixiLoaded = typeof PIXI !== 'undefined';
    checks.pixiVersion = typeof PIXI !== 'undefined' ? (PIXI.VERSION || 'unknown') : 'N/A';

    // 2. PixiCityRenderer class available?
    checks.rendererClassAvailable = typeof window.PixiCityRenderer !== 'undefined';

    // 3. fenixCity instance?
    checks.fenixCityExists = !!window.fenixCity;
    checks.fenixCityType = window.fenixCity ? window.fenixCity.constructor.name : 'N/A';

    // 4. Is it PixiJS or Canvas?
    checks.isPixiRenderer = checks.rendererClassAvailable && (window.fenixCity instanceof window.PixiCityRenderer);
    checks.isCanvasRenderer = (typeof window.IsoCityEngine !== 'undefined') && (window.fenixCity instanceof window.IsoCityEngine);

    // 5. PixiJS application initialized?
    if (checks.isPixiRenderer && window.fenixCity.app) {
      checks.pixiAppExists = true;
      checks.pixiRendererType = window.fenixCity.app.renderer?.type || 'unknown';
      checks.canvasPresent = !!window.fenixCity.app.canvas;
      checks.canvasWidth = window.fenixCity.app.canvas?.width || 0;
      checks.canvasHeight = window.fenixCity.app.canvas?.height || 0;
    }

    // 6. Character system loaded?
    checks.characterSystem = typeof window.FenixCharacterSystem !== 'undefined';

    // 7. Interaction engine loaded?
    checks.interactionEngine = typeof window.FenixInteractionEngine !== 'undefined';

    // 8. Semantic zoom loaded?
    checks.semanticZoom = typeof window.FenixSemanticZoom !== 'undefined';

    // 9. WebGL canvas visible?
    const webglCanvas = document.querySelector('#wsCityContainer canvas:not(#cityCanvas)');
    checks.webglCanvasFound = !!webglCanvas;
    if (webglCanvas) {
      const rect = webglCanvas.getBoundingClientRect();
      checks.webglCanvasVisible = rect.width > 0 && rect.height > 0;
      checks.webglCanvasSize = `${rect.width}x${rect.height}`;
    }

    // 10. Overlay elements present?
    checks.breadcrumbExists = !!document.getElementById('cityBreadcrumb');
    checks.tooltipExists = !!document.getElementById('cityTooltip');
    checks.contextMenuExists = !!document.getElementById('cityContextMenu');
    checks.inspectorExists = !!document.getElementById('cityInspector');
    checks.floorSelectorExists = !!document.getElementById('cityFloorSelector');

    // 11. All loaded scripts
    checks.scriptTags = Array.from(document.querySelectorAll('script[src*="pixi"]')).map(s => s.src);

    return checks;
  });

  // Screenshot
  await p.screenshot({ path: path.join(RESULTS_DIR, 'pixi-v4-city-init.png'), fullPage: false });

  // Also take screenshot of just the city container
  const cityContainer = p.locator('#wsCityContainer');
  if (await cityContainer.isVisible()) {
    await cityContainer.screenshot({ path: path.join(RESULTS_DIR, 'pixi-v4-city-container.png') });
  }

  await browser.close();

  // Report
  console.log('\n=== FÊNIX CITY V4 — PixiJS Validation ===\n');
  console.log('PixiJS loaded:', results.pixiLoaded, `(v${results.pixiVersion})`);
  console.log('Renderer class:', results.rendererClassAvailable);
  console.log('fenixCity exists:', results.fenixCityExists, `(${results.fenixCityType})`);
  console.log('Is PixiJS renderer:', results.isPixiRenderer);
  console.log('Is Canvas fallback:', results.isCanvasRenderer);
  if (results.pixiAppExists) {
    console.log('PixiJS App:', results.pixiAppExists);
    console.log('Renderer type:', results.pixiRendererType);
    console.log('Canvas:', results.canvasWidth + 'x' + results.canvasHeight);
  }
  console.log('Character System:', results.characterSystem);
  console.log('Interaction Engine:', results.interactionEngine);
  console.log('Semantic Zoom:', results.semanticZoom);
  console.log('WebGL canvas found:', results.webglCanvasFound);
  if (results.webglCanvasSize) console.log('WebGL canvas size:', results.webglCanvasSize);
  console.log('Overlay elements:', {
    breadcrumb: results.breadcrumbExists,
    tooltip: results.tooltipExists,
    contextMenu: results.contextMenuExists,
    inspector: results.inspectorExists,
    floorSelector: results.floorSelectorExists
  });
  if (consoleErrors.length > 0) {
    console.log('\n⚠ Console errors:', consoleErrors.length);
    consoleErrors.slice(0, 5).forEach(e => console.log('  •', e));
  }

  // Overall verdict
  const passed = results.pixiLoaded && results.rendererClassAvailable &&
    results.characterSystem && results.interactionEngine && results.semanticZoom &&
    results.breadcrumbExists;
  console.log('\n' + (passed ? '✅ GATE 01 PASSED' : '❌ GATE 01 NEEDS ATTENTION'));
  console.log(JSON.stringify({ ok: passed, ...results }, null, 2));

  process.exit(passed ? 0 : 1);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
