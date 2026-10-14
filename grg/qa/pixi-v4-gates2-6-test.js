/**
 * FÊNIX CITY V4 — Gates 02 to 06 Comprehensive Validation
 * Sequential verification of:
 * - Gate 02: 32×16 Tile + High-Detail Pixel Art Buildings & Props (Art Director Gate)
 * - Gate 03: Animated Character System with Role Colors & Walk Cycles
 * - Gate 04: Interactive World & Agent Inspector with Real Data
 * - Gate 05: Building Enter System & Cutaway Multi-Floor Views
 * - Gate 06: Rooms, Workstations, Stations Inspector, and IDE Deep Link
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4400';
const RESULTS_DIR = path.join(__dirname, '..', 'qa-results', 'playwright');

async function run() {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log('=== FÊNIX CITY V4 — GATES 02 TO 06 VALIDATION ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Authenticate
  const page = await context.newPage();
  const loginRes = await page.request.post(`${BASE}/api/login`, {
    data: { tenantId: 'grg', userId: 'grg-admin', password: 'admin123' }
  });
  const { token } = await loginRes.json();
  await context.addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/' }]);
  await context.addInitScript((t) => { localStorage.setItem('token', t); }, token);
  await page.close();

  const p = await context.newPage();
  const consoleErrors = [];
  p.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Navigate to /app#city
  console.log('Navigating to http://localhost:4400/app#city...');
  await p.goto(`${BASE}/app#city`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3000);

  // Click AI City navigation button to switch view & reparent
  try {
    const cityBtn = p.locator('.nav-item[data-view="city"]');
    if (await cityBtn.count() > 0) {
      await cityBtn.click();
      await p.waitForTimeout(1500);
    }
  } catch (e) {}

  await p.waitForTimeout(2000);

  // ============================================================
  // GATE 02: High-Detail Pixel Art Buildings & Props
  // ============================================================
  console.log('--- Checking GATE 02: High-Detail Art & Visuals ---');
  const gate02 = await p.evaluate(() => {
    const r = window.fenixCity;
    if (!r) return { ok: false, error: 'fenixCity not found' };
    const tex = r.textures || {};
    return {
      ok: !!(tex.fenixHQ && tex.devLoft && tex.researchLab && tex.tree && tex.streetLamp && tex.bench && tex.serverMonolith),
      hasFenixHQ: !!tex.fenixHQ,
      hasDevLoft: !!tex.devLoft,
      hasResearchLab: !!tex.researchLab,
      hasTree: !!tex.tree,
      hasStreetLamp: !!tex.streetLamp,
      hasBench: !!tex.bench,
      hasServerMonolith: !!tex.serverMonolith,
      buildingsCount: r.buildings ? r.buildings.size : 0,
      sortedChildrenCount: r.sortedLayer ? r.sortedLayer.children.length : 0
    };
  });

  console.log('Gate 02 Result:', JSON.stringify(gate02, null, 2));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate02-high-detail-city.png') });
  console.log('📸 Screenshot saved: gate02-high-detail-city.png');

  // ============================================================
  // GATE 03: Animated Character System
  // ============================================================
  console.log('\n--- Checking GATE 03: Animated Character System ---');
  const gate03 = await p.evaluate(() => {
    const r = window.fenixCity;
    const cs = window.FenixCharacterSystem;
    if (!cs) return { ok: false, error: 'FenixCharacterSystem not loaded' };
    
    let animatedCharsCount = 0;
    let sampleChar = null;
    if (r && r.agents) {
      for (const [id, a] of r.agents) {
        if (a.character instanceof cs.CityCharacter) {
          animatedCharsCount++;
          if (!sampleChar) {
            sampleChar = {
              id: a.character.id,
              name: a.character.name,
              role: a.character.role,
              state: a.character.state,
              direction: a.character.direction,
              hasSprite: !!a.character.sprite,
              hasNameLabel: !!a.character.nameLabel
            };
          }
        }
      }
    }

    return {
      ok: animatedCharsCount > 0,
      characterSystemLoaded: true,
      totalAgents: r?.agents?.size || 0,
      animatedCharsCount,
      sampleChar
    };
  });

  console.log('Gate 03 Result:', JSON.stringify(gate03, null, 2));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate03-characters.png') });
  console.log('📸 Screenshot saved: gate03-characters.png');

  // ============================================================
  // GATE 04: Interactive World & Agent Inspector
  // ============================================================
  console.log('\n--- Checking GATE 04: Interactive World & Agent Inspector ---');
  const gate04 = await p.evaluate(() => {
    const inter = window.fenixInteraction;
    if (!inter) return { ok: false, error: 'FenixInteractionEngine not loaded' };

    // Find first agent object in interaction layer
    let targetAgent = null;
    for (const [id, obj] of inter.objects) {
      if (obj.type === 'agent') {
        targetAgent = obj;
        break;
      }
    }

    if (!targetAgent) return { ok: false, error: 'No interactive agent found' };

    // Trigger click on agent
    inter.onClick(targetAgent, { global: { x: 300, y: 300 } });

    const inspector = document.getElementById('cityInspector');
    const isOpen = inspector && inspector.classList.contains('open');
    const content = inspector ? inspector.innerText : '';

    return {
      ok: isOpen && content.length > 50,
      interactiveObjectsCount: inter.objects.size,
      agentId: targetAgent.id,
      inspectorOpen: isOpen,
      inspectorHasRole: content.includes('Role'),
      inspectorHasDetails: content.includes('Agent Details') || content.includes('Identity'),
      contentSnippet: content.slice(0, 150).replace(/\n/g, ' ')
    };
  });

  console.log('Gate 04 Result:', JSON.stringify(gate04, null, 2));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate04-agent-inspector.png') });
  console.log('📸 Screenshot saved: gate04-agent-inspector.png');

  // ============================================================
  // GATE 05: Building Enter System & Interior Floors
  // ============================================================
  console.log('\n--- Checking GATE 05: Building Enter System & Cutaway Floors ---');
  const gate05 = await p.evaluate(() => {
    const interior = window.fenixInterior;
    if (!interior) return { ok: false, error: 'BuildingInteriorSystem not loaded' };

    // Enter ZapAI CRM / Dev Loft on Floor 2 (Backend)
    interior.enter('dev-loft', 1);

    const floorSel = document.getElementById('cityFloorSelector');
    const breadcrumb = document.getElementById('cityBreadcrumb');
    const floorSelVisible = floorSel && floorSel.style.display !== 'none';
    const breadcrumbVisible = breadcrumb && breadcrumb.style.display !== 'none';

    return {
      ok: interior.container.visible && floorSelVisible && breadcrumbVisible,
      interiorVisible: interior.container.visible,
      activeBuildingId: interior.activeBuildingId,
      activeFloorIndex: interior.activeFloorIndex,
      floorSelectorVisible: floorSelVisible,
      breadcrumbVisible: breadcrumbVisible,
      breadcrumbText: breadcrumb ? breadcrumb.innerText.replace(/\n/g, ' ') : '',
      interiorChildrenCount: interior.container.children.length
    };
  });

  console.log('Gate 05 Result:', JSON.stringify(gate05, null, 2));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate05-interior-floor2.png') });
  console.log('📸 Screenshot saved: gate05-interior-floor2.png');

  // ============================================================
  // GATE 06: Rooms, Workstations, Stations Inspector & IDE Deep Link
  // ============================================================
  console.log('\n--- Checking GATE 06: Rooms, Workstations & IDE Deep Link ---');
  const gate06 = await p.evaluate(() => {
    const interior = window.fenixInterior;
    if (!interior) return { ok: false, error: 'BuildingInteriorSystem not loaded' };

    // Check Floor 2 stations
    const bld = window.BUILDING_INTERIORS['dev-loft'];
    const floor2 = bld.floors[1];

    // Trigger station click on the API Lead Workstation
    const apiStation = floor2.stations[0];
    interior.showStationInspector(apiStation, bld, floor2);

    const inspector = document.getElementById('cityInspector');
    const isOpen = inspector && inspector.classList.contains('open');
    const content = inspector ? inspector.innerText : '';

    return {
      ok: isOpen && content.includes('OPEN IN IDE') && content.includes(apiStation.label),
      stationLabel: apiStation.label,
      assignedAgent: apiStation.agentName,
      module: apiStation.module,
      sourceFile: apiStation.file,
      hasIdeButton: content.includes('OPEN IN IDE'),
      inspectorContent: content.slice(0, 200).replace(/\n/g, ' ')
    };
  });

  console.log('Gate 06 Result:', JSON.stringify(gate06, null, 2));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate06-station-inspector.png') });
  console.log('📸 Screenshot saved: gate06-station-inspector.png');

  // Test exit back to city
  const returnToCity = await p.evaluate(() => {
    window.BuildingInteriorSystem.exitActive();
    const r = window.fenixCity;
    const interior = window.fenixInterior;
    return {
      exteriorVisible: r?.worldContainer?.visible === true,
      interiorHidden: interior?.container?.visible === false
    };
  });
  console.log('Return to City Check:', JSON.stringify(returnToCity, null, 2));
  await p.screenshot({ path: path.join(RESULTS_DIR, 'gate06-return-city.png') });
  console.log('📸 Screenshot saved: gate06-return-city.png');

  await browser.close();

  // Final Summary
  const allPassed = gate02.ok && gate03.ok && gate04.ok && gate05.ok && gate06.ok && returnToCity.exteriorVisible;
  console.log('\n============================================================');
  console.log(allPassed ? '🎉 ALL GATES 02 TO 06 PASSED SUCCESSFULLY!' : '❌ SOME GATES FAILED');
  console.log('============================================================\n');

  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal error running gates 02-06 validation:', err);
  process.exit(1);
});
