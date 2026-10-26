'use strict';

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TARGET_URL = process.env.FENIX_URL || 'http://209.50.241.22:3000/';
const ARTIFACT_DIR = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\cd6d3967-5d56-4191-9635-645117fb32c7';

(async () => {
  console.log('================================================================');
  console.log('🧪 PHASE 53 E2E LIVE VPS CERTIFICATION, SCREENSHOTS & VIDEO TOUR');
  console.log(`Target: ${TARGET_URL}`);
  console.log('================================================================');

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: ARTIFACT_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  console.log('\n[1/6] Loading Fênix OS on VPS & Authenticating...');
  await page.goto(`${TARGET_URL}app`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('login') || (await page.$('#loginButton'))) {
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'grg-admin');
    await page.click('#loginButton');
    await page.waitForTimeout(3000);
  }

  // 2. VERIFY ALL PHASE 53 BACKEND API CONTRACTS ON LIVE VPS
  console.log('\n[2/6] Verifying Phase 53 Backend API Contracts on Live VPS...');
  const apiCheck = await page.evaluate(async () => {
    const getJson = async (u, opts) => {
      const r = await fetch(u, { credentials: 'same-origin', ...opts });
      return { status: r.status, body: await r.json() };
    };
    const [inv, specs, matrix, vpat, fp, sync, sec, orch] = await Promise.all([
      getJson('/api/v2/rea/ecosystem-inventory'),
      getJson('/api/v2/rea/reference-specs'),
      getJson('/api/v2/rea/technology-matrix'),
      getJson('/api/v2/rea/visual-patterns'),
      getJson('/api/v2/memory-index/fingerprints'),
      getJson('/api/v2/memory-index/incremental-sync', { method: 'POST' }),
      getJson('/api/v2/rea/security-audit'),
      getJson('/api/v2/rea/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'fenix-os',
          objective: 'Certificar Phase 53 Live VPS',
          requireHumanApproval: true,
          timeoutMs: 45000,
          force: true,
        }),
      }),
    ]);
    const orchId = orch.body?.orchestrationId;
    const cp = orchId
      ? await getJson(`/api/v2/rea/orchestrate/${orchId}/checkpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey: 'visual_qa', note: 'Live VPS E2E Checkpoint' }),
        })
      : null;
    const retry = orchId
      ? await getJson(`/api/v2/rea/orchestrate/${orchId}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey: 'implement' }),
        })
      : null;
    const approve = orchId
      ? await getJson(`/api/v2/rea/orchestrate/${orchId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision: 'APPROVE', actorId: 'grg-admin' }),
        })
      : null;
    return { inv, specs, matrix, vpat, fp, sync, sec, orch, cp, retry, approve };
  });

  assert.equal(apiCheck.inv.status, 200, 'Ecosystem inventory 200');
  assert.ok(apiCheck.inv.body.capabilities.length >= 12, '12+ capabilities in inventory');
  assert.equal(apiCheck.specs.status, 200, 'Reference specs 200');
  assert.equal(apiCheck.specs.body.references.length, 5, '5 reference systems');
  assert.equal(apiCheck.matrix.status, 200, 'Technology matrix 200');
  assert.equal(apiCheck.matrix.body.categories.length, 8, '8 categories A-H');
  assert.equal(apiCheck.vpat.status, 200, 'Visual patterns 200');
  assert.ok(apiCheck.vpat.body.patterns.length >= 5, '5+ visual patterns');
  assert.equal(apiCheck.fp.status, 200, 'Fingerprints status 200');
  assert.equal(apiCheck.sync.status, 200, 'Incremental sync 200');
  assert.equal(apiCheck.sec.status, 200, 'Security audit 200');
  assert.equal(apiCheck.sec.body.overallState, 'HARDENED', 'Security audit HARDENED');
  assert.ok([200, 201].includes(apiCheck.orch.status), 'Orchestrate 200/201');
  assert.equal(apiCheck.orch.body.dagSteps.length, 7, '7 specialized DAG steps');
  assert.equal(apiCheck.orch.body.lifecycleState, 'AWAITING_APPROVAL', 'Orchestrate respects requireHumanApproval');
  assert.equal(apiCheck.orch.body.governance?.timeoutMs, 45000, 'Orchestrate respects custom timeoutMs');
  assert.equal(apiCheck.cp?.status, 200, 'Checkpoint 200');
  assert.equal(apiCheck.cp?.body?.checkpoint?.stepKey, 'visual_qa', 'Checkpoint preserves stepKey');
  assert.equal(apiCheck.cp?.body?.checkpoint?.note, 'Live VPS E2E Checkpoint', 'Checkpoint preserves note');
  assert.equal(apiCheck.retry?.status, 200, 'Retry 200 without TypeError');
  assert.equal(apiCheck.retry?.body?.retryAttemptsUsed, 1, 'Retry increments retryAttemptsUsed');
  assert.equal(apiCheck.approve?.status, 200, 'Approve 200');
  assert.equal(apiCheck.approve?.body?.humanApprovalState, 'GRANTED', 'Approve grants humanApprovalState');
  console.log('   ✅ Live VPS APIs certified: Inventory, Specs, Matrix, Patterns, Fingerprints, Security Audit & 7-Role DAG (including Checkpoint/Retry/Approve)!');

  // 3. LIVING CITY 3D & 6 OPERATIONAL MODES
  console.log('\n[3/6] Certifying Living City 3D Operational Modes & Density Control...');
  await page.evaluate(() => window.showView?.('city'));
  await page.waitForTimeout(2500);

  const cityEval = await page.evaluate(() => {
    const engine = window.fenixWorld3D || window._fenixWorld3DInstance;
    if (!engine) return { ok: false };
    engine._mountOperationalModeBar?.();
    const mode1 = window.fenixSetCityMode?.('engineering');
    const mode2 = window.fenixSetCityMode?.('operation');
    const densityLow = window.fenixSetCityDensity?.('low');
    const lodLow = engine._densityLodScale;
    const density = window.fenixSetCityDensity?.('high');
    const lodHigh = engine._densityLodScale;
    const modeBar = document.getElementById('fenixCityModeBar');
    const modeStatus = document.getElementById('fenixCityModeStatus');
    const modeButtons = modeBar ? modeBar.querySelectorAll('[data-city-mode]').length : 0;
    const hasMeetingIsland = Boolean(engine.scene?.getObjectByName('ApiFloor1MeetingIsland'));
    const hasLiveKpi = Boolean(engine.liveKpiCanvas && engine.liveKpiTexture);
    return {
      ok: true,
      mode1,
      mode2,
      densityLow,
      lodLow,
      density,
      lodHigh,
      hasModeBar: Boolean(modeBar),
      hasModeStatus: Boolean(modeStatus && modeStatus.textContent.includes('OPERATION')),
      modeButtons,
      hasMeetingIsland,
      hasLiveKpi,
    };
  });
  console.log('   City 3D evaluation:', cityEval);
  assert.equal(cityEval.ok, true);
  assert.equal(cityEval.mode1, 'engineering', 'window.fenixSetCityMode("engineering") returns "engineering"');
  assert.equal(cityEval.mode2, 'operation', 'window.fenixSetCityMode("operation") returns "operation"');
  assert.equal(cityEval.hasModeBar, true, '#fenixCityModeBar must be present');
  assert.equal(cityEval.hasModeStatus, true, '#fenixCityModeStatus must reflect active mode & density');
  assert.equal(cityEval.lodLow, 0.65, 'Low density adjusts LOD scale to 0.65');
  assert.equal(cityEval.lodHigh, 1.35, 'High density adjusts LOD scale to 1.35');
  assert.equal(cityEval.modeButtons, 6, 'Must render 6 operational mode buttons');
  assert.equal(cityEval.hasMeetingIsland, true, 'ApiFloor1MeetingIsland present');
  assert.equal(cityEval.hasLiveKpi, true, 'Live KPI Wall active');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase53_living_city_modes_live.png') });
  console.log('   📸 Captured phase53_living_city_modes_live.png');

  // 4. MCP AI BRAIN & INCREMENTAL SHA-256 FINGERPRINTS
  console.log('\n[4/6] Certifying MCP AI Brain & Incremental SHA-256 Fingerprint Badge...');
  await page.evaluate(() => window.showView?.('memory'));
  await page.waitForSelector('.fml-decision-card', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  const memEval = await page.evaluate(async () => {
    await window.fenixRefreshFingerprintBadge?.();
    const syncRes = await window.fenixSyncIncrementalMemory?.();
    const chips = Array.from(document.querySelectorAll('.fml-tag-chip'));
    if (chips[0] && !chips[0].classList.contains('is-active')) chips[0].click();
    const fpBadge = document.getElementById('fmlFingerprintBadge');
    const decisionCard = document.querySelector('.fml-decision-card');
    return {
      hasFpBadge: Boolean(fpBadge && fpBadge.textContent.includes('SHA-256')),
      fpText: fpBadge?.textContent?.trim() || '',
      chipsCount: chips.length,
      hasDecisionCard: Boolean(decisionCard),
      cacheHits: syncRes?.stats?.cacheHits ?? 0,
    };
  });
  console.log('   MCP Brain evaluation:', memEval);
  assert.equal(memEval.hasFpBadge, true, '#fmlFingerprintBadge must render SHA-256 telemetry');
  assert.ok(memEval.chipsCount >= 6, 'Tag catalog chips present');
  assert.equal(memEval.hasDecisionCard, true, 'Deep Decision Card present');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase53_mcp_brain_fingerprints_live.png') });
  console.log('   📸 Captured phase53_mcp_brain_fingerprints_live.png');

  // 5. STITCH / MIRO / DAGRE HIERARCHICAL FLOW & VISUAL PATTERN LIBRARY
  console.log('\n[5/6] Certifying Stitch/Miro/Dagre Flowgraph & Visual Pattern Library...');
  await page.evaluate(() => {
    window.showView?.('flowgraph');
    window.fenixSwitchFlowTab?.('screens');
  });
  await page.waitForTimeout(2500);

  const flowEval = await page.evaluate(async () => {
    const mode = window.FenixFlowGraph?.setMode?.('DAGRE');
    const patData = await window.FenixFlowGraph?.openVisualPatternLibrary?.();
    const dagreContainer = document.querySelector('[data-layout-engine="dagre-hierarchical"]');
    const drawer = document.getElementById('ffgPatternLibraryDrawer');
    return {
      mode,
      hasDagreContainer: Boolean(dagreContainer),
      hasDrawer: Boolean(drawer && drawer.style.display === 'block'),
      patternsCount: patData?.patterns?.length || 0,
      dimensionsCount: patData?.dimensions?.length || 0,
    };
  });
  console.log('   Flowgraph Dagre & Pattern Library evaluation:', flowEval);
  assert.equal(flowEval.mode, 'DAGRE');
  assert.equal(flowEval.hasDagreContainer, true, 'Dagre hierarchical layout container must be rendered');
  assert.equal(flowEval.hasDrawer, true, 'Visual Pattern Library drawer must open');
  assert.ok(flowEval.patternsCount >= 5, 'At least 5 visual patterns loaded');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase53_stitch_dagre_patterns_live.png') });
  console.log('   📸 Captured phase53_stitch_dagre_patterns_live.png');

  // 6. AUTONOMOUS IDE GLOBAL SEARCH, VIEWPORT & LIVE PREVIEW
  console.log('\n[6/6] Certifying Autonomous IDE Global Search, Viewport & Live Preview...');
  await page.evaluate(() => window.showView?.('ide'));
  await page.waitForTimeout(3000);

  const ideEval = await page.evaluate(async () => {
    window.fenixSetIdeMode?.('split');
    window.fenixSetIdeViewport?.('tablet');
    const searchRes = await window.fenixSearchWorkspace?.('fenix');
    window.fenixSetIdeViewport?.('desktop');
    const searchPanel = document.getElementById('fenixIdeSearchResultsPanel');
    const searchBtn = document.getElementById('fenixIdeSearchBtn');
    const rollbackBtn = document.getElementById('fenixIdeRollbackBtn');
    const frame = document.getElementById('fenixIdeLiveFrame');
    return {
      searchOk: Boolean(searchRes?.ok),
      matchCount: searchRes?.matches?.length || 0,
      hasSearchPanel: Boolean(searchPanel && searchPanel.style.display === 'block'),
      hasSearchBtn: Boolean(searchBtn),
      hasRollbackBtn: Boolean(rollbackBtn),
      frameSrc: frame?.getAttribute('src') || '',
    };
  });
  console.log('   Autonomous IDE evaluation:', ideEval);
  assert.equal(ideEval.searchOk, true, 'Global workspace search must succeed');
  assert.equal(ideEval.hasSearchPanel, true, '#fenixIdeSearchResultsPanel must display results');
  assert.equal(ideEval.hasSearchBtn, true, '#fenixIdeSearchBtn must be present in DOM');
  assert.equal(ideEval.hasRollbackBtn, true, '#fenixIdeRollbackBtn must be present in DOM');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase53_lovable_ide_search_live.png') });
  console.log('   📸 Captured phase53_lovable_ide_search_live.png');

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    const targetVideoPath = path.join(ARTIFACT_DIR, 'phase53_full_evolution_tour.webm');
    try {
      fs.copyFileSync(videoPath, targetVideoPath);
      console.log(`   🎥 Saved E2E video demonstration: ${targetVideoPath}`);
    } catch (_) {}
  }

  const SUB_DIR = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\6fcbea5f-bed4-4820-92e2-a2367ca960be';
  fs.mkdirSync(SUB_DIR, { recursive: true });
  for (const fname of [
    'phase53_living_city_modes_live.png',
    'phase53_mcp_brain_fingerprints_live.png',
    'phase53_stitch_dagre_patterns_live.png',
    'phase53_lovable_ide_search_live.png',
    'phase53_full_evolution_tour.webm',
  ]) {
    const src = path.join(ARTIFACT_DIR, fname);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(SUB_DIR, fname));
    }
  }
  for (const invName of ['grg_space_capabilities_inventory.json', 'grg_space_capabilities_inventory.md']) {
    const src = path.join(SUB_DIR, invName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(ARTIFACT_DIR, invName));
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 53 E2E LIVE VPS ASSERTIONS PASSED 100%!');
  console.log('================================================================');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Phase 53 E2E Certification Failed:', err);
  process.exit(1);
});
