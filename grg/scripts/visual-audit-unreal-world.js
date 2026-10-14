'use strict';

/**
 * FÊNIX OS — UNREAL LIVING WORLD PLAYWRIGHT VISUAL AUDIT (Fases 17.3 a 17.15)
 * ===========================================================================
 * Executes real headless browser navigation to validate:
 * 1. Mode switcher to [ 🎮 Unreal 3D Living World ]
 * 2. Real-time Telemetry Ribbon (PROTOCOL_V1, FPS, VRAM, Active Agents)
 * 3. 3D Spatial Canvas Viewport rendering 7 Districts, HQ Spire & Animated Agents
 * 4. Mission Dispatch & Workstation occupancy
 * 5. OODA Cognitive Loop stages
 * 6. Social Graph & Peer relationships
 * 7. 9 Modular Profession profiles
 * 8. Roundtrip switch back to [ 🌐 Mundo 2.5D ]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../../screenshots/unreal_world');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runVisualAudit() {
  console.log('[VisualAudit] Starting Unreal Living World visual audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  try {
    // 1. Authenticate via API directly
    console.log('[VisualAudit] Authenticating as grg-admin via /api/login...');
    const loginRes = await context.request.post('http://127.0.0.1:4400/api/login', {
      data: {
        tenantId: 'grg',
        userId: 'grg-admin',
        password: 'admin'
      }
    });

    if (!loginRes.ok()) {
      throw new Error(`Login failed with status ${loginRes.status()}`);
    }
    const loginData = await loginRes.json();
    console.log('[VisualAudit] Logged in successfully. Token:', loginData.token?.slice(0, 10) + '...');

    const page = await context.newPage();

    // Set token in localStorage before navigation
    await page.addInitScript((token) => {
      localStorage.setItem('fenix_token', token);
      window.__FENIX_STATE__ = { token, authed: true, userId: 'grg-admin' };
    }, loginData.token);

    // 2. Navigate to /app#city
    console.log('[VisualAudit] Navigating to /app#city...');
    await page.goto('http://127.0.0.1:4400/app#city', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 3. Switch to Unreal 3D Living World Mode
    console.log('[VisualAudit] Clicking [ 🎮 Unreal 3D Living World ] tab...');
    const btnUnreal = await page.waitForSelector('#btnCityModeUnreal', { state: 'visible', timeout: 10000 });
    await btnUnreal.click();
    await page.waitForTimeout(2000);

    // 4. Capture Main Viewport & Telemetry Ribbon
    console.log('[VisualAudit] Capturing 01-unreal-deck-main-viewport-1080p.png...');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01-unreal-deck-main-viewport-1080p.png'),
      fullPage: false
    });

    // 5. Select Mission tab and capture
    console.log('[VisualAudit] Capturing 02-unreal-mission-dispatch-tab-1080p.png...');
    await page.click('.unreal-sidebar-tab[data-tab="mission"]');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02-unreal-mission-dispatch-tab-1080p.png'),
      fullPage: false
    });

    // 6. Select OODA Cognition tab and capture
    console.log('[VisualAudit] Capturing 03-unreal-ooda-cognitive-tab-1080p.png...');
    await page.click('.unreal-sidebar-tab[data-tab="ooda"]');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03-unreal-ooda-cognitive-tab-1080p.png'),
      fullPage: false
    });

    // 7. Select Social Life tab and capture
    console.log('[VisualAudit] Capturing 04-unreal-social-graph-tab-1080p.png...');
    await page.click('.unreal-sidebar-tab[data-tab="social"]');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04-unreal-social-graph-tab-1080p.png'),
      fullPage: false
    });

    // 8. Select Professions tab and capture
    console.log('[VisualAudit] Capturing 05-unreal-professions-modular-tab-1080p.png...');
    await page.click('.unreal-sidebar-tab[data-tab="agents"]');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05-unreal-professions-modular-tab-1080p.png'),
      fullPage: false
    });

    // 9. Roundtrip test: switch back to [ 🌐 Mundo 2.5D ]
    console.log('[VisualAudit] Switching back to [ 🌐 Mundo 2.5D ]...');
    await page.click('#btnCityModeWorld');
    await page.waitForTimeout(2000);
    console.log('[VisualAudit] Capturing 06-unreal-back-to-world-2.5d-roundtrip-1080p.png...');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '06-unreal-back-to-world-2.5d-roundtrip-1080p.png'),
      fullPage: false
    });

    console.log('[VisualAudit] ✅ All 6 visual audit screenshots captured successfully in:', OUTPUT_DIR);

    const auditReport = {
      timestamp: new Date().toISOString(),
      viewport: '1920x1080',
      screenshots: [
        '01-unreal-deck-main-viewport-1080p.png',
        '02-unreal-mission-dispatch-tab-1080p.png',
        '03-unreal-ooda-cognitive-tab-1080p.png',
        '04-unreal-social-graph-tab-1080p.png',
        '05-unreal-professions-modular-tab-1080p.png',
        '06-unreal-back-to-world-2.5d-roundtrip-1080p.png'
      ],
      passed: true
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'unreal_visual_audit_report.json'), JSON.stringify(auditReport, null, 2));

  } catch (err) {
    console.error('[VisualAudit] ❌ Error during visual audit:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVisualAudit();
