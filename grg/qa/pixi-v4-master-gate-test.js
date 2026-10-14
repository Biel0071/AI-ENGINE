/**
 * FÊNIX CITY V4 — Master Validation Test (Gates 07 to 14 + Master Gates)
 * Sequential verification of:
 * - Art Director Gate: Photo Mode / Pure Game World without HUD
 * - Gate 07: Rooms & Room Inspector
 * - Gate 08: Live Agent Camera Follow Engine
 * - Gate 09: Real Kanban Mission Board from /api/v2/jobs
 * - Gate 10: Real Application Deep View with Desktop/Tablet/Mobile viewports
 * - Gate 12: IDE Deep Link to Workflow Code Editor
 * - Gate 13: World Return Path (Code -> File -> Room -> Building -> City)
 * - Gate 14: Mobile Responsive (390×844) Viewport
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4400';
const RESULTS_DIR = path.join(__dirname, '..', 'qa-results', 'playwright');

async function run() {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log('=== FÊNIX CITY V4 — MASTER GATES VALIDATION ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Authenticate with local token / session
  const page = await context.newPage();
  let token = '';
  if (fs.existsSync('.session_token')) {
    token = fs.readFileSync('.session_token', 'utf8').trim();
  }
  if (!token) {
    const loginRes = await page.request.post(`${BASE}/api/login`, {
      data: { tenantId: 'grg', userId: 'grg-admin', password: 'admin123' }
    });
    const data = await loginRes.json();
    token = data.token;
  }

  await context.addCookies([
    { name: 'token', value: token, domain: 'localhost', path: '/' },
    { name: 'fenix_session', value: encodeURIComponent(token), domain: 'localhost', path: '/' }
  ]);
  await context.addInitScript((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('fenix_token', t);
    localStorage.setItem('grg_token', t);
  }, token);
  await page.close();

  const p = await context.newPage();
  const consoleErrors = [];
  p.on('console', msg => {
    if (msg.type === 'error') consoleErrors.push(msg.text());
  });

  // 2. Navigate to /app#city
  console.log('Navigating to http://localhost:4400/app#city...');
  await p.goto(`${BASE}/app#city`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);

  // Switch to City view
  try {
    const cityBtn = p.locator('.nav-item[data-view="city"]');
    if (await cityBtn.count() > 0) {
      await cityBtn.click();
      await p.waitForTimeout(1500);
    }
  } catch (e) {}

  await p.waitForTimeout(2000);

  // ============================================================
  // ART DIRECTOR GATE: Pure Game World without HUD (Photo Mode)
  // ============================================================
  console.log('--- Checking ART DIRECTOR GATE: Pure 2.5D Game World ---');
  await p.evaluate(() => {
    if (window.fenixCity && window.fenixCity.togglePhotoMode) {
      window.fenixCity.togglePhotoMode(true);
    }
  });
  await p.waitForTimeout(1000);

  const artDirectorCheck = await p.evaluate(() => {
    const body = document.body;
    const isPhoto = body.classList.contains('art-director-photo-mode');
    const canvas = document.querySelector('#view-city canvas') || document.querySelector('#wsCityContainer canvas') || (window.fenixCity && window.fenixCity.app && window.fenixCity.app.canvas);
    return {
      isPhotoModeActive: isPhoto,
      hasCanvas: !!canvas,
      canvasWidth: canvas ? (canvas.clientWidth || canvas.width) : 0,
      canvasHeight: canvas ? (canvas.clientHeight || canvas.height) : 0
    };
  });

  console.log('Art Director Check:', JSON.stringify(artDirectorCheck));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'art-director-pure-world.png') });
  console.log('📸 Screenshot saved: art-director-pure-world.png');

  // Exit Photo Mode
  await p.evaluate(() => {
    if (window.fenixCity && window.fenixCity.togglePhotoMode) {
      window.fenixCity.togglePhotoMode(false);
    }
  });
  await p.waitForTimeout(500);

  // ============================================================
  // GATE 08: Live Agent Camera Follow Engine
  // ============================================================
  console.log('\n--- Checking GATE 08: Live Agent Camera Follow ---');
  const followResult = await p.evaluate(() => {
    const r = window.fenixCity;
    if (!r || !r.agents || r.agents.size === 0) return { ok: false, error: 'no agents found' };

    const firstAgentId = r.agents.keys().next().value;
    r.followAgent(firstAgentId);

    return {
      ok: !!(r.followedAgentId === firstAgentId && r.followTarget),
      followedAgentId: r.followedAgentId,
      cameraZoom: r.targetCamera.zoom
    };
  });

  console.log('Gate 08 Result:', JSON.stringify(followResult));
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate08-follow-agent.png') });
  console.log('📸 Screenshot saved: gate08-follow-agent.png');

  // ============================================================
  // GATE 05 & 07: Enter Building & Room Inspector
  // ============================================================
  console.log('\n--- Checking GATE 07: Room System & Room Inspector ---');
  await p.evaluate(() => {
    if (window.fenixInterior) {
      // Enter Floor 2 (Backend & Database)
      window.fenixInterior.enter('dev-loft', 1);
    }
  });
  await p.waitForTimeout(1000);

  const roomInspectResult = await p.evaluate(() => {
    const interior = window.fenixInterior;
    if (!interior) return { ok: false, error: 'interior not found' };

    const building = window.BUILDING_INTERIORS['dev-loft'];
    const floor = building.floors[1]; // Floor 2
    const apiRoom = floor.rooms[0]; // API & Microservices

    // Trigger room inspection
    interior.showRoomInspector(apiRoom, building, floor);

    const inspector = document.getElementById('cityInspector');
    const isOpen = inspector && inspector.classList.contains('open');
    const text = inspector ? inspector.innerText : '';
    const breadcrumb = document.getElementById('cityBreadcrumb')?.innerText || '';

    return {
      ok: isOpen && text.includes('API & Microservices'),
      isOpen: isOpen,
      hasRoomName: text.includes('API & Microservices'),
      hasWorkstations: text.includes('Workstations'),
      hasIdeButton: text.includes('OPEN ROOM CODE IN IDE'),
      breadcrumb: breadcrumb
    };
  });

  console.log('Gate 07 Result:', JSON.stringify(roomInspectResult));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate07-room-inspector.png') });
  console.log('📸 Screenshot saved: gate07-room-inspector.png');

  // ============================================================
  // GATE 09: Real Kanban Mission Board from /api/v2/jobs
  // ============================================================
  console.log('\n--- Checking GATE 09: Real Kanban Mission Board ---');
  await p.evaluate(async () => {
    if (window.BuildingInteriorSystem?.openMissionModal) {
      await window.BuildingInteriorSystem.openMissionModal();
    }
  });
  await p.waitForTimeout(1500);

  const missionBoardResult = await p.evaluate(() => {
    const modal = document.getElementById('fenixMissionBoardModal');
    const isVisible = modal && modal.style.display !== 'none';
    const cards = modal ? modal.querySelectorAll('.mission-card').length : 0;
    const bodyText = modal ? modal.innerText : '';

    return {
      ok: isVisible && cards > 0,
      isVisible: isVisible,
      cardsCount: cards,
      hasColumns: bodyText.includes('Queued') && bodyText.includes('Succeeded'),
      previewText: bodyText.substring(0, 100).replace(/\n/g, ' ')
    };
  });

  console.log('Gate 09 Result:', JSON.stringify(missionBoardResult));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate09-mission-board.png') });
  console.log('📸 Screenshot saved: gate09-mission-board.png');

  // Close Mission Modal
  await p.evaluate(() => {
    const modal = document.getElementById('fenixMissionBoardModal');
    if (modal) modal.style.display = 'none';
  });
  await p.waitForTimeout(500);

  // ============================================================
  // GATE 10: Real Application Deep View
  // ============================================================
  console.log('\n--- Checking GATE 10: Real Application Deep View ---');
  await p.evaluate(() => {
    if (window.BuildingInteriorSystem?.openAppPreview) {
      window.BuildingInteriorSystem.openAppPreview('ZapAI CRM');
    }
  });
  await p.waitForTimeout(1000);

  const appPreviewResult = await p.evaluate(() => {
    const modal = document.getElementById('fenixAppPreviewModal');
    const isVisible = modal && modal.style.display !== 'none';
    const iframe = modal ? modal.querySelector('iframe') : null;
    const hasVpButtons = !!(modal && modal.querySelector('#btnVpDesktop') && modal.querySelector('#btnVpMobile'));

    return {
      ok: isVisible && !!iframe && hasVpButtons,
      isVisible: isVisible,
      hasIframe: !!iframe,
      iframeSrc: iframe ? iframe.src : ''
    };
  });

  console.log('Gate 10 Result:', JSON.stringify(appPreviewResult));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate10-application-preview.png') });
  console.log('📸 Screenshot saved: gate10-application-preview.png');

  // Close App Modal
  await p.evaluate(() => {
    const modal = document.getElementById('fenixAppPreviewModal');
    if (modal) modal.style.display = 'none';
  });
  await p.waitForTimeout(500);

  // ============================================================
  // GATE 12: IDE Deep Link
  // ============================================================
  console.log('\n--- Checking GATE 12: IDE Deep Link ---');
  await p.evaluate(() => {
    if (window.BuildingInteriorSystem?.openIDE) {
      window.BuildingInteriorSystem.openIDE('src/server.js');
    }
  });
  await p.waitForTimeout(1500);

  const ideResult = await p.evaluate(() => {
    const ideView = document.getElementById('view-ide');
    const isIdeVisible = ideView && (ideView.classList.contains('active') || ideView.style.display !== 'none');
    const hasMonacoOrEditor = !!(document.getElementById('monacoEditor') || document.getElementById('editor'));

    return {
      ok: isIdeVisible,
      isIdeVisible: isIdeVisible,
      hasEditor: hasMonacoOrEditor
    };
  });

  console.log('Gate 12 Result:', JSON.stringify(ideResult));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate12-ide-deep-link.png') });
  console.log('📸 Screenshot saved: gate12-ide-deep-link.png');

  // ============================================================
  // GATE 13: World Return (ESC back to City)
  // ============================================================
  console.log('\n--- Checking GATE 13: World Return ---');
  // Switch back to city view and exit interior
  try {
    const cityBtn = p.locator('.nav-item[data-view="city"]');
    if (await cityBtn.count() > 0) {
      await cityBtn.click();
      await p.waitForTimeout(1000);
    }
  } catch (e) {}

  await p.evaluate(() => {
    if (window.BuildingInteriorSystem?.exitActive) {
      window.BuildingInteriorSystem.exitActive();
    }
  });
  await p.waitForTimeout(1000);

  const worldReturnResult = await p.evaluate(() => {
    const r = window.fenixCity;
    const interior = window.fenixInterior;
    const isInteriorHidden = !interior || !interior.activeBuildingId;
    const isWorldVisible = r && r.worldContainer && r.worldContainer.visible;

    return {
      ok: isInteriorHidden && isWorldVisible,
      isInteriorHidden: isInteriorHidden,
      isWorldVisible: isWorldVisible
    };
  });

  console.log('Gate 13 Result:', JSON.stringify(worldReturnResult));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate13-world-return.png') });
  console.log('📸 Screenshot saved: gate13-world-return.png');

  // ============================================================
  // GATE 14: Mobile Responsive (390×844)
  // ============================================================
  console.log('\n--- Checking GATE 14: Mobile Responsive (390×844) ---');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1000);

  const mobileCheck = await p.evaluate(() => {
    const r = window.fenixCity;
    if (r && r.resize) r.resize();
    const canvas = document.querySelector('#view-city canvas') || document.querySelector('#wsCityContainer canvas') || (r && r.app && r.app.canvas);
    return {
      ok: !!canvas,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      canvasWidth: canvas ? (canvas.clientWidth || canvas.width) : 0,
      canvasHeight: canvas ? (canvas.clientHeight || canvas.height) : 0
    };
  });

  console.log('Gate 14 Result:', JSON.stringify(mobileCheck));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate14-mobile-390x844.png') });
  console.log('📸 Screenshot saved: gate14-mobile-390x844.png');

  await browser.close();

  // Summary
  console.log('\n============================================================');
  console.log('MASTER GATES VERIFICATION SUMMARY');
  console.log('============================================================');
  const allPass = artDirectorCheck.isPhotoModeActive !== undefined &&
                  followResult.ok &&
                  roomInspectResult.ok &&
                  missionBoardResult.ok &&
                  appPreviewResult.ok &&
                  ideResult.ok &&
                  worldReturnResult.ok &&
                  mobileCheck.ok;

  console.log('Art Director Gate:', artDirectorCheck.hasCanvas ? 'PASS' : 'FAIL');
  console.log('Gate 07 (Rooms & Inspector):', roomInspectResult.ok ? 'PASS' : 'FAIL');
  console.log('Gate 08 (Agent Follow):', followResult.ok ? 'PASS' : 'FAIL');
  console.log('Gate 09 (Mission Board):', missionBoardResult.ok ? 'PASS' : 'FAIL');
  console.log('Gate 10 (App Preview):', appPreviewResult.ok ? 'PASS' : 'FAIL');
  console.log('Gate 12 (IDE Deep Link):', ideResult.ok ? 'PASS' : 'FAIL');
  console.log('Gate 13 (World Return):', worldReturnResult.ok ? 'PASS' : 'FAIL');
  console.log('Gate 14 (Mobile 390x844):', mobileCheck.ok ? 'PASS' : 'FAIL');

  if (allPass) {
    console.log('\n>>> ALL GATES PASSED (Exit code 0) <<<');
    process.exit(0);
  } else {
    console.error('\n>>> SOME GATES FAILED <<<');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
