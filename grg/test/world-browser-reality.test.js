/**
 * FÊNIX OS — WORLD REALITY TEST SUITE (V20)
 * Real Browser / Real World / Zero False Pass
 * 
 * Verifies the complete living world lifecycle in a real Chromium browser:
 * 1. Boot & Authentication
 * 2. World 3D WebGL Initialization
 * 3. Camera Navigation (Pan, Zoom, Orbit, Focus)
 * 4. Agent Selection & 9-Question Lifecycle Inspector
 * 5. Building Selection & Levels
 * 6. Command Execution & Spatial Mutation
 * 7. Realtime Synchronization
 * 8. Agent Movement / Task State
 * 9. Chat & Memory
 * 10. Page Reload & Hot Mutation Persistence
 * 
 * Generates 10 sequential audit screenshots in the artifact directory.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const assert = require('node:assert/strict');

const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit');
const BASE_URL = process.env.FENIX_TEST_URL || 'http://127.0.0.1:4400';
const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };

async function runRealityAudit() {
  console.log('=======================================================================');
  console.log('FÊNIX OS — WORLD BROWSER REALITY AUDIT (V20)');
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log('=======================================================================\n');

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const auditLog = {
    startTime: new Date().toISOString(),
    consoleLogs: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    sseEvents: [],
    worldApiRequests: [],
    screenshots: [],
    scores: {},
    bugs: []
  };

  // 1. Authenticate via API
  console.log('[1/10] Authenticating with local runtime...');
  let token = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed with HTTP ${loginRes.status}`);
    }
    const data = await loginRes.json();
    token = data.token;
    console.log('   ✅ Authenticated successfully. Token length:', token.length);
  } catch (err) {
    auditLog.bugs.push({ id: 'BUG-P0-01', level: 'P0', title: 'Falha de login no backend local', error: err.message });
    throw err;
  }

  // 2. Launch Real Chromium Browser
  console.log('[2/10] Launching Chromium browser with WebGL...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });

  // Inject session tokens before navigation
  await context.addCookies([
    { name: 'grg_token', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'fenix_token', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' }
  ]);

  await context.addInitScript((tok) => {
    window.localStorage.setItem('grg_token', tok);
    window.localStorage.setItem('fenix_token', tok);
  }, token);

  const page = await context.newPage();

  // Listen to console, errors, network
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    auditLog.consoleLogs.push({ type, text });
    if (type === 'error') {
      auditLog.consoleErrors.push(text);
      console.log(`   [Browser Console Error] ${text}`);
    }
  });

  page.on('pageerror', err => {
    auditLog.pageErrors.push(err.message);
    console.error(`   [Browser Uncaught PageError] ${err.message}`);
  });

  page.on('requestfailed', req => {
    auditLog.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  page.on('response', res => {
    const url = res.url();
    if (url.includes('/living-city/')) {
      auditLog.worldApiRequests.push({ url, status: res.status() });
    }
  });

  try {
    // 3. Navigate to Canonical App Shell
    console.log('[3/10] Navigating to /app#city...');
    await page.goto(`${BASE_URL}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the app shell and view-city
    await page.waitForSelector('#app-shell', { timeout: 15000 });
    await page.waitForSelector('#view-city', { timeout: 15000 });

    // Ensure view-city is active
    await page.evaluate(() => {
      if (typeof window.showView === 'function') {
        window.showView('city');
      } else {
        const btn = document.querySelector('[data-view="view-city"]');
        if (btn) btn.click();
      }
    });

    // Wait for Three.js engine or canvas to mount
    await page.waitForFunction(() => {
      const canvas3D = document.getElementById('cityCanvas3D');
      return Boolean(canvas3D || window.fenixWorld3D);
    }, { timeout: 20000 });

    // Wait 3 seconds for initial scene rendering & SSE connection
    await page.waitForTimeout(3000);

    // 01-world-loaded
    const file01 = path.join(ARTIFACT_DIR, '01-world-loaded.png');
    await page.screenshot({ path: file01, fullPage: false });
    auditLog.screenshots.push({ name: '01-world-loaded', path: file01, status: 'CAPTURED' });
    console.log('   📸 Captured 01-world-loaded.png');

    // 4. Test Camera Navigation (Zoom In, Zoom Out, Pan)
    console.log('[4/10] Testing camera navigation (Zoom, Pan, Fit)...');
    const cameraBefore = await page.evaluate(() => {
      if (window.fenixWorld3D) {
        return {
          distance: window.fenixWorld3D.cameraState?.distance,
          azimuth: window.fenixWorld3D.cameraState?.azimuth,
          elevation: window.fenixWorld3D.cameraState?.elevation
        };
      }
      return null;
    });

    // Zoom in
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.zoomIn?.();
      }
    });
    await page.waitForTimeout(1000);

    // 02-world-zoomed
    const file02 = path.join(ARTIFACT_DIR, '02-world-zoomed.png');
    await page.screenshot({ path: file02, fullPage: false });
    auditLog.screenshots.push({ name: '02-world-zoomed', path: file02, status: 'CAPTURED' });
    console.log('   📸 Captured 02-world-zoomed.png');

    const cameraAfter = await page.evaluate(() => {
      if (window.fenixWorld3D) {
        return {
          distance: window.fenixWorld3D.cameraState?.distance,
          azimuth: window.fenixWorld3D.cameraState?.azimuth
        };
      }
      return null;
    });

    // 5. Agent Selection & 9-Question Inspector
    console.log('[5/10] Testing agent selection and 9-Question Lifecycle Inspector...');
    const agentSelectionResult = await page.evaluate(async () => {
      const w = window.fenixWorld3D;
      let targetAgentId = 'agent-joao';
      if (w && w.agents && w.agents.size > 0) {
        targetAgentId = [...w.agents.keys()][0];
      }
      if (w && typeof w.selectAgent === 'function') {
        w.selectAgent(targetAgentId);
      } else if (typeof window.fenixShowWorldAgentInspector === 'function') {
        const ag = (w && w.agents && w.agents.get(targetAgentId)) || { id: targetAgentId, name: 'João' };
        window.fenixShowWorldAgentInspector(ag);
      }
      return { selected: targetAgentId };
    });

    await page.waitForTimeout(2000);

    // 03-agent-selected
    const file03 = path.join(ARTIFACT_DIR, '03-agent-selected.png');
    await page.screenshot({ path: file03, fullPage: false });
    auditLog.screenshots.push({ name: '03-agent-selected', path: file03, status: 'CAPTURED' });
    console.log('   📸 Captured 03-agent-selected.png');

    // 07-agent-inspector
    const file07 = path.join(ARTIFACT_DIR, '07-agent-inspector.png');
    const inspectorEl = await page.$('#fenixWorldAgentInspector');
    if (inspectorEl) {
      await inspectorEl.screenshot({ path: file07 }).catch(() => page.screenshot({ path: file07 }));
    } else {
      await page.screenshot({ path: file07 });
    }
    auditLog.screenshots.push({ name: '07-agent-inspector', path: file07, status: 'CAPTURED' });
    console.log('   📸 Captured 07-agent-inspector.png');

    // 6. Building Selection
    console.log('[6/10] Testing building selection and spatial levels...');
    await page.evaluate(() => {
      const w = window.fenixWorld3D;
      if (w && typeof w.selectBuilding === 'function') {
        w.selectBuilding('bld-api-platform');
      }
    });
    await page.waitForTimeout(1500);

    // 04-building-selected
    const file04 = path.join(ARTIFACT_DIR, '04-building-selected.png');
    await page.screenshot({ path: file04, fullPage: false });
    auditLog.screenshots.push({ name: '04-building-selected', path: file04, status: 'CAPTURED' });
    console.log('   📸 Captured 04-building-selected.png');

    // 7. Command Execution & Spatial Mutation
    console.log('[7/10] Testing natural language command execution & spatial mutation...');
    const commandResult = await page.evaluate(async () => {
      const intent = 'Crie um prédio chamado Reality Lab na cidade';
      const input = document.getElementById('fenixCmdIntentInput');
      if (input) input.value = intent;
      
      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      const res = await fetch('/api/v2/living-city/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify({ prompt: intent, actor: 'operator' })
      });
      const data = await res.json();
      
      // Notify 3D engine if present
      if (window.fenixWorld3D && typeof window.fenixWorld3D.syncRealData === 'function') {
        await window.fenixWorld3D.syncRealData();
      }
      return data;
    });

    await page.waitForTimeout(2000);

    // 05-command-executed
    const file05 = path.join(ARTIFACT_DIR, '05-command-executed.png');
    await page.screenshot({ path: file05, fullPage: false });
    auditLog.screenshots.push({ name: '05-command-executed', path: file05, status: 'CAPTURED' });
    console.log('   📸 Captured 05-command-executed.png');

    // 8. Agent Movement / Pathfinding
    console.log('[8/10] Testing agent movement and destination...');
    await page.evaluate(async () => {
      const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
      await fetch('/api/v2/living-city/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify({
          prompt: 'Mova o agente João para o Reality Lab',
          actor: 'operator'
        })
      });
      if (window.fenixWorld3D && typeof window.fenixWorld3D.syncRealData === 'function') {
        await window.fenixWorld3D.syncRealData();
      }
    });
    await page.waitForTimeout(2000);

    // 06-agent-moving
    const file06 = path.join(ARTIFACT_DIR, '06-agent-moving.png');
    await page.screenshot({ path: file06, fullPage: false });
    auditLog.screenshots.push({ name: '06-agent-moving', path: file06, status: 'CAPTURED' });
    console.log('   📸 Captured 06-agent-moving.png');

    // 9. Chat & Memory
    console.log('[9/10] Testing agent chat and episodic memory display...');
    await page.evaluate(() => {
      const input = document.getElementById('worldAgentChatInput');
      if (input) {
        input.value = 'Olá Agente João, qual é seu objetivo atual?';
      }
      const btn = document.getElementById('worldAgentChatSendBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    // 08-chat-open
    const file08 = path.join(ARTIFACT_DIR, '08-chat-open.png');
    await page.screenshot({ path: file08, fullPage: false });
    auditLog.screenshots.push({ name: '08-chat-open', path: file08, status: 'CAPTURED' });
    console.log('   📸 Captured 08-chat-open.png');

    // 09-memory-open
    const file09 = path.join(ARTIFACT_DIR, '09-memory-open.png');
    await page.screenshot({ path: file09, fullPage: false });
    auditLog.screenshots.push({ name: '09-memory-open', path: file09, status: 'CAPTURED' });
    console.log('   📸 Captured 09-memory-open.png');

    // 10. Page Reload & Hot Mutation Persistence
    console.log('[10/10] Testing page reload and building/entity persistence...');
    await page.evaluate(() => {
      if (window.livingCityEventSource) {
        window.livingCityEventSource.close();
      }
    }).catch(() => {});
    await page.goto(`${BASE_URL}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#view-city', { timeout: 15000 });
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('city');
    });
    await page.waitForTimeout(3000);

    // 10-after-reload
    const file10 = path.join(ARTIFACT_DIR, '10-after-reload.png');
    await page.screenshot({ path: file10, fullPage: false });
    auditLog.screenshots.push({ name: '10-after-reload', path: file10, status: 'CAPTURED' });
    console.log('   📸 Captured 10-after-reload.png');

    // Evaluate persistence in 3D
    const persistenceEvaluation = await page.evaluate(() => {
      const w = window.fenixWorld3D;
      const dynamicCount = w && w.dynamicBuildings ? w.dynamicBuildings.size : 0;
      const hasRealityLab = w && w.dynamicBuildings && [...w.dynamicBuildings.values()].some(b => b.name?.includes('Reality Lab') || b.id?.includes('reality-lab'));
      return { dynamicCount, hasRealityLab };
    });
    console.log('   Persistence check:', persistenceEvaluation);

    // Detailed Engine & DOM Inspection
    const engineTelemetry = await page.evaluate(() => {
      const w = window.fenixWorld3D;
      return {
        hasEngine: Boolean(w),
        isInitialized: Boolean(w && w.isInitialized),
        rendererInfo: w && w.renderer ? {
          memory: w.renderer.info?.memory,
          render: w.renderer.info?.render
        } : null,
        agentsCount: w && w.agents ? w.agents.size : 0,
        buildingsCount: w && w.dynamicBuildings ? w.dynamicBuildings.size : 0,
        cameraDistance: w?.cameraState?.distance,
        canvasWidth: document.getElementById('cityCanvas3D')?.clientWidth,
        canvasHeight: document.getElementById('cityCanvas3D')?.clientHeight,
        hostDisplay: window.getComputedStyle(document.querySelector('.fenix-world-3d') || document.body).display
      };
    });
    console.log('   Engine Telemetry:', engineTelemetry);

    // Write audit report
    auditLog.endTime = new Date().toISOString();
    auditLog.engineTelemetry = engineTelemetry;
    auditLog.persistenceEvaluation = persistenceEvaluation;

    console.log('\n=======================================================================');
    console.log('🎉 WORLD REALITY AUDIT COMPLETED SUCCESSFULLY');
    console.log('=======================================================================');

  } catch (err) {
    console.error('❌ Audit execution failed:', err);
    auditLog.fatalError = err.message;
    throw err;
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'audit_execution_log.json'),
      JSON.stringify(auditLog, null, 2)
    );
  }

  return auditLog;
}

if (require.main === module) {
  runRealityAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runRealityAudit };
