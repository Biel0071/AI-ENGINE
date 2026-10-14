'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const artifactDir = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/living_world_screenshots');
fs.mkdirSync(artifactDir, { recursive: true });

async function runAudit() {
  console.log('[FASE 15 VISUAL AUDIT] Starting Living 2.5D World & Embodied Agent City visual audit...');

  // 1. Authenticate
  const loginRes = await fetch(`${baseURL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin', rememberMe: true })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('[FASE 15 VISUAL AUDIT] Auth token acquired.');

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1080p', width: 1920, height: 1080 },
    { name: '900p', width: 1440, height: 900 },
    { name: '800p', width: 1280, height: 800 }
  ];

  const results = {
    timestamp: new Date().toISOString(),
    viewports: {}
  };

  for (const vp of viewports) {
    console.log(`\n[FASE 15 VISUAL AUDIT] Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addCookies([
      { name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }
    ]);
    await context.addInitScript((t) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, token);

    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate to city
    await page.goto(`${baseURL}/app#city`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    // Ensure IsoCity is booted and real data is fully synced
    await page.evaluate(async () => {
      if (typeof window.showView === 'function') window.showView('city');
      if (typeof window.bootIsoCity === 'function') window.bootIsoCity();
      if (window.fenixCity && typeof window.fenixCity.syncRealData === 'function') {
        await window.fenixCity.syncRealData();
      }
      if (window.fenixCity && typeof window.fenixCity.resize === 'function') window.fenixCity.resize();
    });
    await page.waitForFunction(() => window.fenixCity && window.fenixCity.world?.agents?.size > 0, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);

    // 1. World Overview screenshot
    const canvasInfo = await page.evaluate(() => {
      const c = document.getElementById('cityCanvas');
      const w = document.getElementById('fenixCityWorldArea');
      const hud = document.getElementById('fenixOfficeFloatingHUD');
      return {
        canvasExists: Boolean(c),
        canvasVisible: c ? (c.offsetParent !== null && window.getComputedStyle(c).display !== 'none') : false,
        canvasW: c ? c.width : 0,
        canvasH: c ? c.height : 0,
        worldAreaVisible: w ? (w.offsetParent !== null && window.getComputedStyle(w).display !== 'none') : false,
        floatingHudVisible: hud ? (hud.offsetParent !== null && window.getComputedStyle(hud).display !== 'none') : false,
        agentsCount: window.fenixCity?.world?.agents?.size || 0
      };
    });
    console.log(`[FASE 15 VISUAL AUDIT] Canvas info (${vp.name}):`, canvasInfo);

    const pathWorld = path.join(artifactDir, `living-world-overview-${vp.name}.png`);
    await page.screenshot({ path: pathWorld });
    console.log(`[FASE 15 VISUAL AUDIT] Saved: ${pathWorld}`);

    // 2. Living Office Mode screenshot
    console.log(`[FASE 15 VISUAL AUDIT] Switching to Living Office mode (${vp.name})...`);
    await page.evaluate(() => {
      if (typeof window.fenixSetCityMode === 'function') {
        window.fenixSetCityMode('office');
      }
    });
    await page.waitForTimeout(1400);

    const pathOffice = path.join(artifactDir, `living-office-zoomed-${vp.name}.png`);
    await page.screenshot({ path: pathOffice });
    console.log(`[FASE 15 VISUAL AUDIT] Saved: ${pathOffice}`);

    // 3. Agent Click -> On-World Inspector screenshot
    console.log(`[FASE 15 VISUAL AUDIT] Selecting agent for on-world inspector (${vp.name})...`);
    const inspectorInfo = await page.evaluate(() => {
      if (window.fenixCity && window.fenixCity.world?.agents?.size > 0) {
        // Pick first agent
        const firstAgent = Array.from(window.fenixCity.world.agents.values())[0];
        window.fenixCity.state.selectedAgent = firstAgent;
        if (typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector(firstAgent);
        }
        return {
          agentId: firstAgent.id,
          agentName: firstAgent.displayName || firstAgent.name,
          agentRole: firstAgent.role
        };
      }
      return null;
    });
    console.log(`[FASE 15 VISUAL AUDIT] Inspected agent:`, inspectorInfo);
    await page.waitForTimeout(800);

    const pathInspector = path.join(artifactDir, `living-agent-inspector-${vp.name}.png`);
    await page.screenshot({ path: pathInspector });
    console.log(`[FASE 15 VISUAL AUDIT] Saved: ${pathInspector}`);

    // 4. Feed Drawer Mode screenshot
    console.log(`[FASE 15 VISUAL AUDIT] Switching to Feed mode (${vp.name})...`);
    await page.evaluate(() => {
      if (typeof window.fenixSetCityMode === 'function') {
        window.fenixSetCityMode('feed');
      }
    });
    await page.waitForTimeout(1000);

    const pathFeed = path.join(artifactDir, `living-world-feed-drawer-${vp.name}.png`);
    await page.screenshot({ path: pathFeed });
    console.log(`[FASE 15 VISUAL AUDIT] Saved: ${pathFeed}`);

    // 5. Building Inspector screenshot
    console.log(`[FASE 15 VISUAL AUDIT] Opening Building Inspector (${vp.name})...`);
    await page.evaluate(() => {
      if (typeof window.fenixCloseFeedDrawer === 'function') window.fenixCloseFeedDrawer();
      const distHit = {
        key: 'command-center',
        district: {
          id: 'command-center',
          name: 'Command Center',
          label: 'COMMAND CENTER',
          emoji: '🏛️',
          color: '#ef4444',
          department: 'Orquestração Central e Governança do Kernel',
          capabilities: ['Kernel Supervisor', 'State Store', 'Event Bus', 'Mission Dispatch']
        }
      };
      if (typeof window.fenixShowWorldBuildingInspector === 'function') {
        window.fenixShowWorldBuildingInspector(distHit);
      }
    });
    await page.waitForTimeout(800);

    const pathBuilding = path.join(artifactDir, `living-building-inspector-${vp.name}.png`);
    await page.screenshot({ path: pathBuilding });
    console.log(`[FASE 15 VISUAL AUDIT] Saved: ${pathBuilding}`);

    results.viewports[vp.name] = {
      canvasInfo,
      inspectorInfo,
      consoleErrors
    };

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(artifactDir, 'fase15_visual_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n[FASE 15 VISUAL AUDIT] Audit complete! Report saved to: ${reportPath}`);
}

runAudit().catch(err => {
  console.error('[FASE 15 VISUAL AUDIT ERROR]', err);
  process.exit(1);
});
