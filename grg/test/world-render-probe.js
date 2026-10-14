/**
 * Fênix OS — WORLD RENDER PROBE & DIAGNOSTIC (V17.3)
 * Full contract diagnosis and visual verification.
 */
const { start } = require('../src/server');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit');

async function runProbe() {
  console.log('=======================================================================');
  console.log('FÊNIX OS — WORLD SINGLETON CONTRACT & RENDER PROBE (V17.3)');
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
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
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
      window.localStorage.setItem('grg_token', tok);
      window.localStorage.setItem('fenix_token', tok);
    }, token);

    const page = await context.newPage();
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.stack || err.message}`));
    page.on('requestfailed', req => console.warn(`[REQUEST FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`));

    console.log('[1/5] Navigating to /app with domcontentloaded...');
    await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    console.log('[2/5] Waiting for app-shell...');
    await page.waitForFunction(() => Boolean(document.getElementById('app-shell')), { timeout: 10000 });

    console.log('[3/5] Inspecting boot and singleton states independently...');

    // A) Wait for World Engine
    console.log('      - Checking World Engine...');
    await page.waitForFunction(() => {
      return Boolean(window.fenixWorld3D || window.fenixWorldEngine3D || (window.__FENIX_SINGLETONS__ && window.__FENIX_SINGLETONS__.get('worldEngine')));
    }, { timeout: 10000 }).catch(e => console.warn('      ⚠️ World Engine wait timeout:', e.message));

    // B) Wait for Copilot
    console.log('      - Checking Copilot...');
    await page.waitForFunction(() => {
      return Boolean(window.__FENIX_COPILOT_INSTANCE__ || window.fenixCopilot || window.FenixSidebar);
    }, { timeout: 10000 }).catch(e => console.warn('      ⚠️ Copilot wait timeout:', e.message));

    // C) Collect Comprehensive Contract Diagnostic (User Directive Section 4)
    const contractResult = await page.evaluate(() => {
      const names = [
        "fenixWorld3D",
        "fenixWorldEngine3D",
        "FenixWorld3D",
        "FenixWorld3DEngine",
        "fenixCity"
      ];
      const result = {};
      for (const name of names) {
        result[name] = {
          exists: Boolean(window[name]),
          type: typeof window[name]
        };
      }
      result.FENIX = {
        exists: Boolean(window.FENIX),
        keys: window.FENIX ? Object.keys(window.FENIX).slice(0, 50) : []
      };
      result.singletons = window.__FENIX_SINGLETONS__ ? Object.keys(window.__FENIX_SINGLETONS__.getAll()) : [];
      result.copilot = {
        hasCopilotInstance: Boolean(window.__FENIX_COPILOT_INSTANCE__),
        hasFenixCopilot: Boolean(window.fenixCopilot),
        hasFenixSidebar: Boolean(window.FenixSidebar)
      };
      result.three = {
        defined: typeof window.THREE !== 'undefined',
        hasWebGLRenderer: typeof window.THREE?.WebGLRenderer !== 'undefined'
      };
      result.body = document.body?.className;
      result.host = (() => {
        const el = document.querySelector(".fenix-world-3d");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          display: getComputedStyle(el).display,
          visibility: getComputedStyle(el).visibility,
          opacity: getComputedStyle(el).opacity,
          width: r.width,
          height: r.height
        };
      })();
      result.canvases = [...document.querySelectorAll("canvas")].map((canvas, index) => {
        const r = canvas.getBoundingClientRect();
        return {
          id: canvas.id || `canvas_${index}`,
          index,
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          rectWidth: r.width,
          rectHeight: r.height,
          display: getComputedStyle(canvas).display
        };
      });
      return result;
    });

    console.log('\n[WORLD SINGLETON CONTRACT]');
    console.log(JSON.stringify(contractResult, null, 2));

    // [4/5] Switch to World view and trigger canonical 3D mode
    console.log('\n[4/5] Switching to World view (city)...');
    await page.evaluate(() => {
      window.showView?.('city');
      if (typeof window.fenixSetCityMode === 'function') {
        window.fenixSetCityMode('world3d');
      }
      if (window.fenixWorld3D) {
        window.fenixWorld3D.resize?.();
        window.fenixWorld3D._resumeAnimationLoop?.();
      }
    });
    await page.waitForTimeout(1000);

    // [5/5] Measure World 3D Host and Canvas dimensions
    console.log('[5/5] Measuring World 3D Host and Canvas in active view...');
    const activeProbe = await page.evaluate(() => {
      const viewCity = document.getElementById('view-city');
      const host3D = document.querySelector('.fenix-world-3d');
      const canvas3D = document.getElementById('cityCanvas3D');
      const canvas2D = document.getElementById('cityCanvas');
      const w3d = window.fenixWorld3D || window.fenixWorldEngine3D;

      let webglContextOk = false;
      let rendererPresent = false;
      let sceneChildren = 0;
      let cameraPos = null;
      let cameraTarget = null;
      let renderLoopActive = false;

      if (w3d) {
        rendererPresent = Boolean(w3d.renderer);
        if (w3d.renderer) {
          const gl = w3d.renderer.getContext();
          webglContextOk = Boolean(gl && !gl.isContextLost());
          // Render a frame
          if (w3d.scene && w3d.camera) {
            w3d.renderer.render(w3d.scene, w3d.camera);
          }
        }
        if (w3d.scene) sceneChildren = w3d.scene.children.length;
        if (w3d.camera) cameraPos = [w3d.camera.position.x, w3d.camera.position.y, w3d.camera.position.z];
        if (w3d.cameraState) cameraTarget = w3d.cameraState.target ? [w3d.cameraState.target.x, w3d.cameraState.target.y, w3d.cameraState.target.z] : null;
        renderLoopActive = Boolean(w3d._animationFrameId);
      }

      return {
        bodyClasses: document.body?.className,
        viewCity: viewCity ? {
          display: getComputedStyle(viewCity).display,
          rect: viewCity.getBoundingClientRect()
        } : null,
        host3D: host3D ? {
          display: getComputedStyle(host3D).display,
          rect: host3D.getBoundingClientRect(),
          clientWidth: host3D.clientWidth,
          clientHeight: host3D.clientHeight
        } : null,
        canvas3D: canvas3D ? {
          display: getComputedStyle(canvas3D).display,
          width: canvas3D.width,
          height: canvas3D.height,
          clientWidth: canvas3D.clientWidth,
          clientHeight: canvas3D.clientHeight
        } : null,
        canvas2D: canvas2D ? {
          display: getComputedStyle(canvas2D).display,
          clientWidth: canvas2D.clientWidth,
          clientHeight: canvas2D.clientHeight
        } : null,
        w3d: {
          rendererPresent,
          webglContextOk,
          sceneChildren,
          cameraPos,
          cameraTarget,
          renderLoopActive
        }
      };
    });

    console.log('\n[ACTIVE WORLD 3D PROBE RESULTS]');
    console.log(JSON.stringify(activeProbe, null, 2));

    // Capture Canonical Fixed Screenshot
    const shotPath = path.join(ARTIFACT_DIR, 'world_3d_fixed.png');
    await page.screenshot({ path: shotPath });
    console.log(`\n📸 Canonical World 3D Screenshot saved -> ${shotPath}`);

    // FASE 2: Minimal Cube Probe
    console.log('\n--- FASE 2: CUBE PROBE EXECUTION ---');
    const cubeResult = await page.evaluate(() => {
      const w3d = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (!w3d || !w3d.scene || !w3d.renderer || !w3d.camera) {
        return { error: 'FenixWorld3D scene/renderer/camera missing' };
      }
      const T = window.THREE;
      if (!T) return { error: 'THREE is not defined' };

      const geo = new T.BoxGeometry(12, 12, 12);
      const mat = new T.MeshStandardMaterial({ color: 0x00FF88, roughness: 0.2, metalness: 0.8 });
      const cube = new T.Mesh(geo, mat);
      cube.name = '__DEBUG_PROBE_CUBE__';
      cube.position.set(14, 6, -4);
      w3d.scene.add(cube);

      const light = new T.PointLight(0xFFFFFF, 3, 60);
      light.position.set(14, 25, -4);
      w3d.scene.add(light);

      w3d.renderer.render(w3d.scene, w3d.camera);
      return { cubeAdded: true, sceneChildren: w3d.scene.children.length };
    });
    console.log('Cube Result:', JSON.stringify(cubeResult));

    await page.waitForTimeout(500);
    const cubeShot = path.join(ARTIFACT_DIR, 'probe_cube_verified.png');
    await page.screenshot({ path: cubeShot });
    console.log(`📸 Cube Probe verified screenshot saved -> ${cubeShot}`);

    console.log('\n=======================================================================');
    console.log('✅ WORLD RENDER PROBE COMPLETED WITH FACTUAL EVIDENCE');
    console.log('=======================================================================');

  } catch (err) {
    console.error('❌ Probe failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(r => server.close(r));
  }
}

runProbe();
