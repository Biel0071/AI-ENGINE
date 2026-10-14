/**
 * Fênix OS — WORLD REALITY V18 LIVING PROOF CAPTURE
 * Captures high-resolution visual evidence of the living operational 3D world:
 * - Real agents with 3D models & thought bubbles
 * - Depósito Mais logistics (EURO-pallets, forklift cycle, dock levelers, warehouse interior)
 * - API Platform Hero complex (floors 0-3, neural core, data conduits)
 * - Living world telemetry metrics
 */
const { start } = require('../src/server');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit');

async function run() {
  console.log('=======================================================================');
  console.log('FÊNIX OS — WORLD REALITY V18 LIVING PROOF CAPTURE');
  console.log('=======================================================================\n');

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
  process.env.FENIX_ALLOW_DEV_HEADERS = '0';
  process.env.FENIX_SMOKE_MODE = '1';
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';

  let server = null;
  let browser = null;

  try {
    console.log('[1/6] Starting backend server...');
    server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    console.log('[2/6] Authenticating...');
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const { token } = await loginRes.json();

    console.log('[3/6] Launching Chromium (1440x900)...');
    browser = await chromium.launch({
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
    page.setDefaultTimeout(20000);

    console.log('[4/6] Loading /app and waiting for shell & 3D world engine...');
    await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      return Boolean(shell && world);
    }, { timeout: 15000 });

    console.log('[5/6] Activating World view & configuring 3D camera vantage...');
    await page.evaluate(() => {
      // 1. Switch view to city
      window.showView?.('city');

      // 2. Set city mode to world3d
      if (typeof window.fenixSetCityMode === 'function') {
        window.fenixSetCityMode('world3d');
      }

      // 3. Ensure 3D host is visible
      const host3D = document.querySelector('.fenix-world-3d') || document.getElementById('fenix3DHost');
      if (host3D) {
        host3D.style.display = 'block';
        host3D.style.visibility = 'visible';
      }

      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (world) {
        world.resize?.();
        world._resumeAnimationLoop?.();

        // Send a live physical data packet between Sora (AI Core) and Alex (API Ops)
        try {
          world.sendPhysicalDataPacket('agent-ai-core', 'agent-api-ops', 'NEURAL_EMBEDDING_V18');
        } catch (_) {}

        // Focus on Depósito Mais logistics hub with roof cutaway to reveal interior
        world.focusEntity({ x: 22, y: 2, z: 2 }, 36, 1.35, 0.38);
      }
    });

    // Allow animation & cutaway to progress
    await page.waitForTimeout(2000);

    console.log('[6/6] Collecting living world telemetry & capturing visual proof...');
    const result = await page.evaluate(() => {
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      let metrics = null;
      if (world && typeof world.getLivingWorldMetrics === 'function') {
        metrics = world.getLivingWorldMetrics();
      }

      // Pause animation frame to prevent compositor contention during capture
      if (world) {
        if (world._animationFrameId) {
          cancelAnimationFrame(world._animationFrameId);
          world._animationFrameId = null;
        }
        if (world.renderer && world.scene && world.camera) {
          world.renderer.render(world.scene, world.camera);
        }
      }

      // Capture direct canvas data URL
      const canvas3D = document.getElementById('cityCanvas3D') || (world && world.canvas);
      let dataUrl = null;
      if (canvas3D && typeof canvas3D.toDataURL === 'function') {
        try {
          dataUrl = canvas3D.toDataURL('image/png');
        } catch (_) {}
      }

      return { metrics, dataUrl };
    });

    console.log('\n📊 LIVING WORLD METRICS REPORT:');
    console.log(JSON.stringify(result.metrics, null, 2));

    // Save direct canvas artifact
    if (result.dataUrl && result.dataUrl.startsWith('data:image/png;base64,')) {
      const b64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
      const canvasPath = path.join(ARTIFACT_DIR, 'world_reality_v18_canvas.png');
      fs.writeFileSync(canvasPath, Buffer.from(b64, 'base64'));
      console.log(`\n📸 Direct 3D Canvas render saved -> ${canvasPath}`);
    }

    // Save full page screenshot
    const outPath = path.join(ARTIFACT_DIR, 'world_reality_v18_living.png');
    await page.screenshot({ path: outPath, timeout: 8000 });
    console.log(`📸 Full Application View saved -> ${outPath}\n`);

  } catch (err) {
    console.error('❌ Capture failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    console.log('Capture process finished.');
  }
}

run();
