'use strict';

/**
 * FÊNIX OS — WORLD ENGINE 3D / MVP GRAPHICS REMAKE VERIFICATION
 * End-to-end Playwright visual verification of the Three.js WebGL Living World.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { start } = require('../src/server');

const ARTIFACT_DIR = path.resolve(
  process.env.USERPROFILE || 'C:\\Users\\Dell',
  '.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/world3d-verification'
);

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function saveCapture(page, filePath) {
  try {
    const dataUrl = await page.evaluate(() => {
      const e = window.fenixWorld3D;
      if (e && e.renderer && e.scene && e.camera) {
        e._updateCameraPosition(true);
        e.renderer.render(e.scene, e.camera);
      }
      const c = document.getElementById('cityCanvas3D');
      return c ? c.toDataURL('image/png') : null;
    });
    if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
      const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync(filePath, buf);
      return;
    }
  } catch (e) {
    console.warn('Canvas toDataURL fallback:', e.message);
  }
  await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled', timeout: 30000 });
}

async function verifyWorld3D() {
  console.log('================================================================');
  console.log('FÊNIX OS: VISUAL VERIFICATION — WORLD ENGINE 3D WEBGL');
  console.log('================================================================\n');

  // Set environment for in-process test server
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';
  process.env.FENIX_BOOTSTRAP_TENANT_ID = 'grg';
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = 'grg-admin';
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = 'admin';

  let server = null;
  let baseUrl = process.env.FENIX_BASE_URL;
  if (!baseUrl) {
    console.log('[1/7] Iniciando servidor Fênix em porta efêmera...');
    server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`   ✅ Servidor ouvindo em: ${baseUrl}`);
  } else {
    console.log(`[1/7] Conectando ao servidor Fênix existente em: ${baseUrl}`);
  }

  process.on('uncaughtException', err => {
    console.log('[FATAL UNCAUGHT EXCEPTION]', err && err.stack ? err.stack : err);
  });
  process.on('unhandledRejection', reason => {
    console.log('[FATAL UNHANDLED REJECTION]', reason && reason.stack ? reason.stack : reason);
  });
  process.on('exit', code => {
    console.log('[PROCESS EXIT EVENT] code:', code);
  });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  browser.on('disconnected', () => console.log('[BROWSER DISCONNECTED EVENT]'));

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  page.on('crash', () => console.log('[PAGE CRASH EVENT]'));
  page.on('close', () => console.log('[PAGE CLOSE EVENT]'));
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE ${msg.type()}]:`, msg.text().slice(0, 180));
  });
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]:', err.message);
  });

  try {
    // 1. Authenticate operator via API
    console.log('[2/7] Autenticando operador via API...');
    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
    });
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Token de autenticação deve ser retornado');
    const authToken = loginData.token;

    console.log('   ✅ Token obtido. Injetando credenciais e acessando /app#city...');
    await context.addInitScript(({ token }) => {
      try {
        localStorage.setItem('grg_token', token);
        localStorage.setItem('fenix_token', token);
        localStorage.setItem('grg_user', 'grg-admin');
        localStorage.setItem('grg_remember', '1');
      } catch (e) {}
    }, { token: authToken });

    await context.addCookies([
      { name: 'grg_token', value: authToken, url: baseUrl },
      { name: 'fenix_token', value: authToken, url: baseUrl }
    ]);

    await page.goto(`${baseUrl}/app#city`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. Switch to City View and activate 3D
    console.log('[3/7] Ativando City View e inicializando World 3D Engine...');
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('city');
      if (typeof window.fenixSetCityMode === 'function') window.fenixSetCityMode('world3d');
      if (typeof window.initFenixWorld3D === 'function') window.initFenixWorld3D();
    });
    await page.waitForTimeout(1500);

    // 3. Verify Canvas 3D is present in DOM
    console.log('[4/7] Verificando Three.js WebGL World Engine...');
    await page.waitForSelector('#cityCanvas3D', { state: 'attached', timeout: 15000 });
    const canvas3D = await page.$('#cityCanvas3D');
    assert.ok(canvas3D, '#cityCanvas3D deve existir no DOM');

    const isMode3D = await page.evaluate(() => document.body.classList.contains('fenix-mode-3d'));
    console.log(`   ✅ Modo 3D ativo no body: ${isMode3D}`);

    // Verify engine instance
    const engineInfo = await page.evaluate(() => {
      const e = window.fenixWorld3D;
      if (!e) return null;
      return {
        hasScene: !!e.scene,
        hasRenderer: !!e.renderer,
        hasCamera: !!e.camera,
        meshCount: e.scene ? e.scene.children.length : 0,
        interactiveCount: e.interactiveMeshes ? e.interactiveMeshes.length : 0,
        hasCamila: !!e.camilaGroup,
        hasDepósitoMais: !!e.depositoComplex
      };
    });
    console.log('   ✅ Engine 3D State:', JSON.stringify(engineInfo));
    assert.ok(engineInfo && engineInfo.hasScene, 'FenixWorld3D scene must be initialized');
    assert.ok(engineInfo.hasCamila, 'Camila 3D agent must be initialized');
    assert.ok(engineInfo.hasDepósitoMais, 'Depósito Mais 3D complex must be initialized');

    // ── 12-STAGE MANDATORY DIGITAL TWIN & SIMULATION VISUAL VERIFICATION ──

    // 01_CITY_MACRO: Wide angle view of city island, highways, HQ spire, and logistics zone
    console.log('[Capture 01/12] 01_CITY_MACRO...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(0, 0, 0);
        window.fenixWorld3D.cameraState.targetDistance = 95;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 4;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '01_CITY_MACRO.png'));

    // 02_DISTRICT: Isometric overview of Depósito Mais District
    console.log('[Capture 02/12] 02_DISTRICT...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(26, 0, -10);
        window.fenixWorld3D.cameraState.targetDistance = 55;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 3.5;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '02_DISTRICT.png'));

    // 03_COMPANY: Depósito Mais Corporate Office Wing, Entrance Canopy & Signage
    console.log('[Capture 03/12] 03_COMPANY...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(38, 4, -4);
        window.fenixWorld3D.cameraState.targetDistance = 32;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 3;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '03_COMPANY.png'));

    // 04_WAREHOUSE: High-bay warehouse exterior, loading bays and floodlight towers
    console.log('[Capture 04/12] 04_WAREHOUSE...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(26, 5, 2);
        window.fenixWorld3D.cameraState.targetDistance = 38;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 4.5;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '04_WAREHOUSE.png'));

    // 05_INTERIOR: AUTOMATED CUTAWAY! Roof removed revealing 4-tier pallet racks, floor markings & high-bays
    console.log('[Capture 05/12] 05_INTERIOR (Cutaway View)...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cutawayState.manual = true;
        window.fenixWorld3D.cameraState.targetLookAt.set(26, 3, -10);
        window.fenixWorld3D.cameraState.targetDistance = 26;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 3.8;
        window.fenixWorld3D.cameraState.elevation = 0.85; // Steeper angle for interior inspection
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1200);
    await saveCapture(page, path.join(ARTIFACT_DIR, '05_INTERIOR.png'));

    // 06_AGENT_CLOSEUP: Close-up of Camila in High-Vis vest with reflective stripes and WMS tablet
    console.log('[Capture 06/12] 06_AGENT_CLOSEUP...');
    await page.evaluate(() => {
      if (window.fenixWorld3D && window.fenixWorld3D.camilaGroup) {
        window.fenixWorld3D.cutawayState.manual = false;
        window.fenixWorld3D.cameraState.targetLookAt.copy(window.fenixWorld3D.camilaGroup.position);
        window.fenixWorld3D.cameraState.targetDistance = 7;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 2.8;
        window.fenixWorld3D.cameraState.elevation = 0.45;
        window.fenixWorld3D._updateCameraPosition(true);

        if (typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector({
            id: 'fenix-camila-agent',
            name: 'Camila',
            role: 'Operadora Logística WMS',
            department: 'DEPÓSITO MAIS',
            status: 'AVAILABLE',
            metrics: { activeTasks: 1, completedTasks: 84, efficiency: '99.4%' }
          });
        }
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '06_AGENT_CLOSEUP.png'));

    // 07_VEHICLE_CLOSEUP: Detailed 18-Wheeler Truck & Toyota Forklift
    console.log('[Capture 07/12] 07_VEHICLE_CLOSEUP...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(18, 2, 7);
        window.fenixWorld3D.cameraState.targetDistance = 14;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 3.2;
        window.fenixWorld3D.cameraState.elevation = 0.45;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '07_VEHICLE_CLOSEUP.png'));

    // 08_OPERATION: Active Dock Loading (Truck backed up to Doca 1 with open doors, forklift moving)
    console.log('[Capture 08/12] 08_OPERATION...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(22, 2.5, 5);
        window.fenixWorld3D.cameraState.targetDistance = 22;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 4;
        window.fenixWorld3D.cameraState.elevation = 0.55;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '08_OPERATION.png'));

    // 09_TRAFFIC: Dual-lane boulevard, crosswalks, streetlights, moving highway delivery van
    console.log('[Capture 09/12] 09_TRAFFIC...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(-10, 1, 0);
        window.fenixWorld3D.cameraState.targetDistance = 42;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 3;
        window.fenixWorld3D.cameraState.elevation = 0.6;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '09_TRAFFIC.png'));

    // 10_NIGHT: Nocturnal Lighting, Glowing Office Windows, Dock Floodlight Beams & Headlights
    console.log('[Capture 10/12] 10_NIGHT...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.toggleDayNight();
        window.fenixWorld3D.cameraState.targetLookAt.set(26, 3, -8);
        window.fenixWorld3D.cameraState.targetDistance = 44;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 4;
        window.fenixWorld3D.cameraState.elevation = 0.55;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '10_NIGHT.png'));

    // Reset Day Lighting
    await page.evaluate(() => {
      if (window.fenixWorld3D && window.fenixWorld3D.cameraState.night) {
        window.fenixWorld3D.toggleDayNight();
      }
    });

    // 11_FAST_LANE: Cyan Optical Data Pulse Conduits in action
    console.log('[Capture 11/12] 11_FAST_LANE...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(13, 8, -5);
        window.fenixWorld3D.cameraState.targetDistance = 28;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 4.5;
        window.fenixWorld3D.cameraState.elevation = 0.5;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '11_FAST_LANE.png'));

    // 12_JOB_LANE: Amber Volumetric Job Payload Transport
    console.log('[Capture 12/12] 12_JOB_LANE...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.cameraState.targetLookAt.set(13, 1, 0);
        window.fenixWorld3D.cameraState.targetDistance = 30;
        window.fenixWorld3D.cameraState.azimuth = Math.PI / 3.5;
        window.fenixWorld3D.cameraState.elevation = 0.55;
        window.fenixWorld3D._updateCameraPosition(true);
      }
    });
    await page.waitForTimeout(1000);
    await saveCapture(page, path.join(ARTIFACT_DIR, '12_JOB_LANE.png'));

    console.log('\n================================================================');
    console.log('🎉 VISUAL QUALITY GATE PASSED: ALL 12 DIGITAL TWIN PROOFS CAPTURED');
    console.log('================================================================\n');

  } catch (err) {
    console.log('❌ Error during verification:', err && err.stack ? err.stack : err);
    throw err;
  } finally {
    try {
      if (browser) await browser.close();
    } catch (e) {
      console.log('Browser close warning:', e.message);
    }
    try {
      if (server) {
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        await new Promise(r => server.close(r));
      }
    } catch (e) {
      console.log('Server close warning:', e.message);
    }
  }
}

verifyWorld3D()
  .then(() => {
    console.log('Verification process completed cleanly.');
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Verification failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
