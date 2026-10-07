'use strict';

/**
 * FÊNIX OS — Visual Capture: Hot World Mutation & Live Dynamic Generation
 * Proves that Fênix OS dynamically instantiates new 3D buildings, agents, and missions
 * live in the running 3D WebGL scene without page reload.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const ARTIFACT_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit';

(async () => {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';

  console.log('[1/5] Starting ephemeral server...');
  const server = await start(0, { operationalActivation: false });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[1/5] Server online on ${baseUrl}`);

  console.log('[2/5] Authenticating via API...');
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  const { token } = await loginRes.json();

  console.log('[3/5] Launching Chromium with WebGL SwiftShader...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--use-gl=angle',
      '--use-angle=swiftshader'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });

  await context.addCookies([
    { name: 'grg_token', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' }
  ]);
  await context.addInitScript((tok) => {
    window.__FENIX_HEADLESS__ = true;
    window.localStorage.setItem('grg_token', tok);
    window.localStorage.setItem('fenix_token', tok);
  }, token);

  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  try {
    console.log('[4/5] Navigating to /app#city and awaiting 3D engine...');
    await page.goto(`${baseUrl}/app#city`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Ensure view-city is active
    await page.evaluate(() => {
      const cityView = document.getElementById('view-city');
      if (cityView) {
        cityView.classList.add('active');
        cityView.style.display = 'flex';
      }
    });

    // Wait for FenixWorld3D
    await page.waitForFunction(() => {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
      return Boolean(eng && eng.scene && eng.renderer && eng.camera);
    }, { timeout: 20000 });

    console.log('[5/5] Living World 3.0 initialized. Applying Hot Mutations live...');

    // Execute Hot Mutations in running 3D scene
    const mutationResult = await page.evaluate(async () => {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;

      // 1. Spawn Dynamic Building: Media Lab
      const bldRes = eng.applyWorldCommand({
        type: 'CREATE_BUILDING',
        payload: {
          id: 'bld-media-lab',
          name: 'Media Lab',
          floors: 3,
          color: '#8b5cf6',
          icon: '🧪',
          coordinates: { x: -26.0, y: 0, z: 16.0 }
        }
      });

      // 2. Spawn Dynamic Agent: João
      const agRes = eng.applyWorldCommand({
        type: 'CREATE_AGENT',
        payload: {
          id: 'agent-joao',
          name: 'João',
          role: 'Especialista em IA',
          department: 'AI_RESEARCH',
          buildingId: 'bld-media-lab',
          coordinates: { x: -26.0, y: 0.8, z: 16.0 },
          currentTask: 'Otimizando Redes Neurais'
        }
      });

      // 3. Focus camera smoothly on the newly created Media Lab
      eng.focusEntity({ x: -26.0, y: 3.0, z: 16.0 }, 24, 0.45, 0.42);

      // Force render 1 frame to ensure buffer is drawn
      eng.renderer.render(eng.scene, eng.camera);

      // Extract canvas data URL
      const canvas = eng.canvas || eng.renderer.domElement;
      const dataUrl = canvas.toDataURL('image/png');

      return {
        bldRes,
        agRes,
        dataUrl,
        metrics: eng.getLivingWorldMetrics()
      };
    });

    console.log('[CaptureHotMutation] Mutations applied:', JSON.stringify({
      bld: mutationResult.bldRes,
      ag: mutationResult.agRes,
      agentCount: mutationResult.metrics.agentCount
    }, null, 2));

    // Save 3D canvas render of newly mutated Media Lab and João
    const base64Data = mutationResult.dataUrl.replace(/^data:image\/png;base64,/, '');
    const canvasPath = path.join(ARTIFACT_DIR, 'world_hot_mutation_media_lab.png');
    fs.writeFileSync(canvasPath, Buffer.from(base64Data, 'base64'));
    console.log(`[CaptureHotMutation] Saved 3D canvas proof: ${canvasPath}`);

    // Pause animation loop before full screenshot to avoid CDP lockup on Windows
    await page.evaluate(() => {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (eng && eng._animationFrameId) {
        cancelAnimationFrame(eng._animationFrameId);
        eng._animationFrameId = null;
      }
    });

    const fullPath = path.join(ARTIFACT_DIR, 'world_reality_v19_mutated_cockpit.png');
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`[CaptureHotMutation] Saved full cockpit screenshot: ${fullPath}`);

    console.log('✅ ALL VISUAL PROOFS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('[CaptureHotMutation] Capture failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
