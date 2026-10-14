'use strict';

const { chromium } = require('playwright');

async function runRenderAudit() {
  console.log('[Audit Pipeline] Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // 1. Login
  await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin');
  await page.click('#f button[type="submit"], #loginButton');

  try {
    await page.waitForURL('**/app*', { waitUntil: 'domcontentloaded', timeout: 8000 });
  } catch (_) {
    await page.waitForFunction(() => window.location.href.includes('/app'), { timeout: 10000 });
  }

  // Switch to city
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
  });

  await page.waitForFunction(() => {
    return window.fenixCity && window.fenixCity.world && window.fenixCity.world.agents && window.fenixCity.world.agents.size > 0;
  }, { timeout: 15000 });

  await page.waitForTimeout(1500);

  // 2. Perform deep in-page audit
  const auditResult = await page.evaluate(() => {
    // A. Canvases in DOM
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
      id: c.id,
      className: c.className,
      width: c.width,
      height: c.height,
      style: {
        display: window.getComputedStyle(c).display,
        visibility: window.getComputedStyle(c).visibility,
        zIndex: window.getComputedStyle(c).zIndex,
        position: window.getComputedStyle(c).position
      }
    }));

    // B. City Instances & Engines
    const cityInstances = {
      windowFenixCity: Boolean(window.fenixCity),
      windowCity: Boolean(window.city),
      windowIsoCity: typeof window.IsoCity,
      windowFenixPixelEngine: Boolean(window.FenixPixelEngine),
      pixelEngineReady: Boolean(window.FenixPixelEngine?.Cache?.ready)
    };

    // C. DOM Overlays over or inside City view
    const cityView = document.getElementById('view-city');
    const cityOverlays = cityView ? Array.from(cityView.querySelectorAll('.city-overlay, .spatial-chat, .fenix-world-agent-inspector, .city-hud, .dock-container, [class*="overlay"], [class*="modal"]')).map(el => ({
      id: el.id,
      className: el.className,
      tagName: el.tagName,
      display: window.getComputedStyle(el).display,
      zIndex: window.getComputedStyle(el).zIndex
    })) : [];

    // D. Global Modals / Overlays attached to document.body
    const bodyOverlays = Array.from(document.body.children)
      .filter(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'link') return false;
        if (el.id === 'appContainer' || el.id === 'unifiedApp' || el.classList.contains('main-layout')) return false;
        const style = window.getComputedStyle(el);
        return style.position === 'absolute' || style.position === 'fixed';
      })
      .map(el => ({
        id: el.id,
        className: el.className,
        tagName: el.tagName,
        zIndex: window.getComputedStyle(el).zIndex,
        display: window.getComputedStyle(el).display
      }));

    // E. World Entities & Agents Count
    const city = window.fenixCity;
    const worldMetrics = {
      agentsInMap: city?.world?.agents?.size || 0,
      vehiclesInMap: city?.world?.vehicles?.length || 0,
      constructionsInMap: city?.world?.constructions?.length || 0,
      camera: city?.state?.camera || null,
      renderMode: city?.state?.renderMode || null,
      syncInProgress: city?._syncInProgress,
      lastSyncTime: city?._lastSyncTime
    };

    // F. Top Bar & Company Sidebar text counts
    const topBarAgentsText = document.querySelector('.top-stat-agents, [data-metric="agents"], #topStatAgents')?.innerText || '';
    const companyCardAgentsText = document.querySelector('.company-stat-agents, [data-company-metric="agents"]')?.innerText || '';

    return {
      canvases,
      cityInstances,
      cityOverlays,
      bodyOverlays,
      worldMetrics,
      topBarAgentsText,
      companyCardAgentsText
    };
  });

  console.log('[Audit Pipeline Result]:');
  console.log(JSON.stringify(auditResult, null, 2));

  await browser.close();
}

runRenderAudit().catch(err => {
  console.error('[Audit Pipeline Error]:', err);
  process.exit(1);
});
