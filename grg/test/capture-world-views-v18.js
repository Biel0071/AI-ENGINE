/**
 * Fênix OS — WORLD REALITY V18 MULTI-VIEW HIGH FIDELITY CAPTURES
 */
const { start } = require('../src/server');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit');

async function run() {
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
    server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const { token } = await loginRes.json();

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader']
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
    page.setDefaultTimeout(30000);

    await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      return Boolean(shell && world);
    }, { timeout: 15000 });

    // Switch to World View and 3D mode
    await page.evaluate(() => {
      window.showView?.('city');
      if (typeof window.fenixSetCityMode === 'function') {
        window.fenixSetCityMode('world3d');
      }
      const host3D = document.querySelector('.fenix-world-3d') || document.getElementById('fenix3DHost');
      if (host3D) {
        host3D.style.display = 'block';
        host3D.style.visibility = 'visible';
      }
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (world) {
        world.resize?.();
        world._resumeAnimationLoop?.();
      }
    });

    await page.waitForTimeout(1500);

    // HELPER to render & extract canvas PNG directly
    const snapshotCanvas = async (filename) => {
      const b64 = await page.evaluate(() => {
        const w3d = window.fenixWorld3D || window.fenixWorldEngine3D;
        if (w3d && w3d.renderer && w3d.scene && w3d.camera) {
          w3d.renderer.render(w3d.scene, w3d.camera);
        }
        const canvas = document.getElementById('cityCanvas3D') || (w3d && w3d.canvas);
        return canvas ? canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '') : null;
      });
      if (b64) {
        const outPath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        console.log(`Saved -> ${outPath}`);
      }
    };

    // ── SHOT 1: Depósito Mais Interior (Camila, Racks, Pallets, Forklift) ──
    console.log('[1/3] Capturing Depósito Mais Interior...');
    await page.evaluate(() => {
      const w3d = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (w3d) {
        w3d.focusEntity({ x: 26, y: 1.5, z: -4 }, 20, 1.45, 0.32);
      }
    });
    await page.waitForTimeout(1000);
    await snapshotCanvas('world_v18_deposito_interior.png');

    // ── SHOT 2: API Platform Hero Complex (Floors 1-2, Desks, Thought Bubbles) ──
    console.log('[2/3] Capturing API Platform Hero Complex...');
    await page.evaluate(() => {
      const w3d = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (w3d) {
        w3d.focusFloor(1);
        w3d.focusEntity({ x: -18, y: 5.5, z: 2 }, 18, 1.62, 0.28);
      }
    });
    await page.waitForTimeout(1000);
    await snapshotCanvas('world_v18_api_platform.png');

    // ── SHOT 3: Full Application Shell Cockpit Overview ──
    console.log('[3/3] Capturing Full Application Shell Overview...');
    await page.evaluate(() => {
      const w3d = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (w3d) {
        w3d.focusFloor(null);
        w3d.focusEntity({ x: 4, y: 0, z: 0 }, 55, 1.35, 0.42);
        if (w3d._animationFrameId) {
          cancelAnimationFrame(w3d._animationFrameId);
          w3d._animationFrameId = null;
        }
        if (w3d.renderer && w3d.scene && w3d.camera) {
          w3d.renderer.render(w3d.scene, w3d.camera);
        }
      }
    });
    await page.waitForTimeout(1000);
    await snapshotCanvas('world_v18_overview.png');

    const fullAppPath = path.join(ARTIFACT_DIR, 'world_reality_v18_verified.png');
    await page.screenshot({ path: fullAppPath, timeout: 6000 });
    console.log(`Saved -> ${fullAppPath}`);

  } catch (err) {
    console.error('Capture error:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run();
