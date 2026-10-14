/**
 * Fênix OS — Visual Diagnostic Capture (Phase 1)
 * Captures 13 canonical screenshots across the system for thorough visual audit.
 */
const { start } = require('../src/server');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit');

async function runCapture() {
  console.log('=======================================================================');
  console.log('FÊNIX OS — PHASE 1: REAL VISUAL DIAGNOSTIC CAPTURE (13 SHOTS)');
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
    console.log('[1] Starting ephemeral backend server...');
    server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    console.log('[2] Authenticating session...');
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const { token } = await loginRes.json();

    console.log('[3] Launching browser (1440x900 viewport)...');
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
      window.__FENIX_HEADLESS__ = true;
      window.localStorage.setItem('grg_token', tok);
      window.localStorage.setItem('fenix_token', tok);
    }, token);

    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    console.log('[4] Loading /app and waiting for shell initialization...');
    await page.goto(`${base}/app`, { waitUntil: 'commit', timeout: 15000 });
    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      const copilot = window.__FENIX_COPILOT_INSTANCE__;
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      return Boolean(shell && copilot && world);
    }, { timeout: 15000 });

    await page.waitForTimeout(1000);
    console.log('    Shell online. Beginning 13 captures...\n');

    // Helper to capture
    const capture = async (name, filename) => {
      const outPath = path.join(ARTIFACT_DIR, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`  📸 [${name}] saved -> ${filename}`);
      return outPath;
    };

    // 1. World
    await page.evaluate(() => window.showView?.('city'));
    await page.waitForTimeout(800);
    await capture('1. World', '01_world.png');

    // 2. Build / IDE
    await page.evaluate(() => window.showView?.('ide'));
    await page.waitForTimeout(800);
    await capture('2. Build / IDE', '02_build_ide.png');

    // 3. Preview
    await page.evaluate(() => {
      // Toggle preview pane / tab in IDE if available
      const btnPreview = document.getElementById('fenixIdeBtnPreview') || document.querySelector('[data-ide-tab="preview"]') || document.getElementById('btnIdePreview');
      if (btnPreview) btnPreview.click();
      else {
        const previewPane = document.getElementById('fenixIdePreviewPane');
        const editorArea = document.getElementById('fenixIdeEditorArea');
        if (previewPane && editorArea) {
          previewPane.style.display = 'block';
          previewPane.style.flex = '1';
        }
      }
    });
    await page.waitForTimeout(600);
    await capture('3. Preview', '03_preview.png');

    // 4. Knowledge
    await page.evaluate(() => window.showView?.('knowledge'));
    await page.waitForTimeout(800);
    await capture('4. Knowledge', '04_knowledge.png');

    // 5. Control
    await page.evaluate(() => window.showView?.('operations'));
    await page.waitForTimeout(800);
    await capture('5. Control', '05_control.png');

    // 6. Copilot aberto
    await page.evaluate(() => {
      window.showView?.('city');
      const sb = window.FenixSidebar;
      if (sb && typeof sb.expand === 'function') sb.expand();
      else if (sb && typeof sb.toggle === 'function' && !sb.isExpanded) sb.toggle();
      const mascot = document.getElementById('fenixMascotSidebar');
      if (mascot) {
        mascot.classList.remove('collapsed');
        mascot.style.display = 'flex';
      }
    });
    await page.waitForTimeout(600);
    await capture('6. Copilot aberto', '06_copilot_open.png');

    // 7. Copilot fechado
    await page.evaluate(() => {
      const sb = window.FenixSidebar;
      if (sb && typeof sb.collapse === 'function') sb.collapse();
      else if (sb && typeof sb.toggle === 'function' && sb.isExpanded) sb.toggle();
      const mascot = document.getElementById('fenixMascotSidebar');
      if (mascot) mascot.classList.add('collapsed');
    });
    await page.waitForTimeout(600);
    await capture('7. Copilot fechado', '07_copilot_closed.png');

    // 8. World com prédio selecionado
    await page.evaluate(() => {
      window.showView?.('city');
      if (window.fenixWorld3D?.focusBuilding) {
        window.fenixWorld3D.focusBuilding('api-platform');
      } else if (window.fenixSelectEntity) {
        window.fenixSelectEntity('building', 'bldg-api-platform');
      }
    });
    await page.waitForTimeout(800);
    await capture('8. World com prédio selecionado', '08_world_building_selected.png');

    // 9. World aproximado
    await page.evaluate(() => {
      const w = window.fenixWorld3D;
      if (w && w.cameraState) {
        w.cameraState.targetDistance = 22;
        w.cameraState.distance = 22;
      }
    });
    await page.waitForTimeout(800);
    await capture('9. World aproximado', '09_world_zoomed_in.png');

    // 10. World afastado
    await page.evaluate(() => {
      const w = window.fenixWorld3D;
      if (w && w.cameraState) {
        w.cameraState.targetDistance = 160;
        w.cameraState.distance = 160;
        w.cameraState.targetPitch = 1.1;
        w.cameraState.pitch = 1.1;
      }
    });
    await page.waitForTimeout(800);
    await capture('10. World afastado', '10_world_zoomed_out.png');

    // 11. Interior do prédio
    await page.evaluate(() => {
      const w = window.fenixWorld3D;
      if (w && typeof w.focusFloor === 'function') {
        w.focusFloor(1);
      }
    });
    await page.waitForTimeout(800);
    await capture('11. Interior do prédio', '11_building_interior.png');

    // 12. Segundo andar
    await page.evaluate(() => {
      const w = window.fenixWorld3D;
      if (w && typeof w.focusFloor === 'function') {
        w.focusFloor(2);
      }
    });
    await page.waitForTimeout(800);
    await capture('12. Segundo andar', '12_second_floor.png');

    // 13. Agente selecionado
    await page.evaluate(() => {
      const w = window.fenixWorld3D;
      if (w && typeof w.focusAgent === 'function') {
        w.focusAgent('agent-infra');
      }
      if (window.fenixSelectEntity) {
        window.fenixSelectEntity('agent', 'agent-infra');
      }
    });
    await page.waitForTimeout(800);
    await capture('13. Agente selecionado', '13_agent_selected.png');

    console.log('\n=======================================================================');
    console.log('✅ ALL 13 SCREENSHOTS CAPTURED SUCCESSFULLY IN:');
    console.log(ARTIFACT_DIR);
    console.log('=======================================================================');

  } catch (err) {
    console.error('❌ Error during capture:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(r => server.close(r));
  }
}

runCapture();
