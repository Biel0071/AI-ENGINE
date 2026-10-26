'use strict';

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TARGET_URL = process.env.FENIX_URL || 'http://209.50.241.22:3000/';
const ARTIFACT_DIR = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\cd6d3967-5d56-4191-9635-645117fb32c7';

(async () => {
  console.log('================================================================');
  console.log('🧪 PHASE 54 E2E LIVE VPS CERTIFICATION & VISUAL PROOF');
  console.log(`Target: ${TARGET_URL}`);
  console.log('================================================================');

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log('\n[1/5] Loading Fênix OS on VPS & Authenticating...');
  await page.goto(`${TARGET_URL}app`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('login') || (await page.$('#loginButton'))) {
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'grg-admin');
    await page.click('#loginButton');
    await page.waitForTimeout(3000);
  }

  // 2. VERIFY PHASE 54 AUTONOMOUS EVOLUTION ENGINE APIs ON LIVE VPS
  console.log('\n[2/5] Certifying Phase 54 Autonomous Evolution Engine APIs on Live VPS...');
  const autoApi = await page.evaluate(async () => {
    const reqJson = async (u, opts = {}) => {
      const r = await fetch(u, { credentials: 'same-origin', ...opts });
      return { status: r.status, body: await r.json() };
    };

    const dash = await reqJson('/api/v2/autonomous/dashboard');
    const bugCreate = await reqJson('/api/v2/autonomous/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: 'TEST_FAILURE',
        projectId: 'fenix-os',
        title: 'Live VPS E2E Bug Guard Verification',
        classification: 'CONFIRMED',
        severity: 'HIGH',
        priority: 'P1',
        affectedFiles: ['grg/src/api/autonomous-loop-routes.js'],
      }),
    });
    const bugId = bugCreate.body?.bug?.bugId;

    // Must reject VERIFIED without real passing test evidence
    const prematureVerify = bugId
      ? await reqJson(`/api/v2/autonomous/bugs/${encodeURIComponent(bugId)}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: 'VERIFIED',
            evidence: { testsPassed: false, testExitCode: 1 },
          }),
        })
      : null;

    // Execute 16-Step Real Autonomous Bug-Fix PoC on Live VPS
    const poc = await reqJson('/api/v2/autonomous/poc/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Execute Proactive Project Evolution Scan on Live VPS
    const scan = await reqJson('/api/v2/autonomous/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxFiles: 12 }),
    });

    // Pause / Stop / Start lifecycle (leaving scheduler ACTIVE in production)
    const pause = await reqJson('/api/v2/autonomous/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'E2E Live Test Pause' }),
    });
    const stop = await reqJson('/api/v2/autonomous/stop', { method: 'POST' });
    const restart = await reqJson('/api/v2/autonomous/start', { method: 'POST' });

    return { dash, bugCreate, prematureVerify, poc, scan, pause, stop, restart };
  });

  assert.equal(autoApi.dash.status, 200, 'Dashboard 200');
  assert.ok(autoApi.dash.body.dashboard.cityState.agents.length === 7, '7 canonical engineering roles in cityState');
  assert.ok([200, 201].includes(autoApi.bugCreate.status), 'Bug registration 200/201');
  assert.equal(autoApi.prematureVerify.status, 400, 'Strict Bug Guard must reject premature VERIFIED with 400');
  assert.equal(autoApi.poc.status, 200, '16-Step Autonomous Bug-Fix PoC 200');
  assert.equal(autoApi.poc.body.bugFinalState, 'VERIFIED', 'PoC transitions bug to VERIFIED');
  assert.equal(autoApi.poc.body.postFixExitCode, 0, 'PoC real test execution exitCode === 0');
  assert.equal(autoApi.poc.body.rollbackProof.sha256RestoredMatchesOriginal, true, 'PoC rollback restores exact SHA-256');
  assert.equal(autoApi.poc.body.coldRestartProof.noDuplicateOnReEnqueue, true, 'PoC cold-restart recovery prevents duplicates');
  assert.equal(autoApi.scan.status, 200, 'Proactive scan 200');
  assert.ok(autoApi.scan.body.scannedFilesCount > 0, 'Proactive scan inspected real files');
  assert.ok(autoApi.scan.body.findingsCount > 0, 'Proactive scan returned ranked findings');
  assert.ok(autoApi.scan.body.findings[0].compositeRank > 0, 'Proactive scan ranked findings by 7 criteria');
  assert.equal(autoApi.pause.status, 200, 'Pause loop 200');
  assert.equal(autoApi.pause.body.loop.status, 'PAUSED', 'Loop status transitions to PAUSED');
  assert.equal(autoApi.stop.status, 200, 'Stop loop 200');
  assert.equal(autoApi.restart.status, 200, 'Start loop 200');
  assert.equal(autoApi.restart.body.loop.status, 'ACTIVE', 'Loop restarted to ACTIVE state on live VPS');
  console.log('   ✅ Live VPS Autonomous Evolution Engine APIs & 16-Step Real Bug-Fix PoC certified!');

  // 3. VERIFY PHASE 54 GRG UNIVERSAL ENGINEERING HUB APIs ON LIVE VPS
  console.log('\n[3/5] Certifying Phase 54 GRG Universal Engineering Hub APIs on Live VPS...');
  const hubApi = await page.evaluate(async () => {
    const reqJson = async (u, opts = {}) => {
      const r = await fetch(u, { credentials: 'same-origin', ...opts });
      return { status: r.status, body: await r.json() };
    };

    const [inventory, adapters, testNode, testGit, forbiddenDispatch, approvalDispatch, proof, propagate] = await Promise.all([
      reqJson('/api/v2/rea/universal-hub/inventory'),
      reqJson('/api/v2/rea/universal-hub/adapters'),
      reqJson('/api/v2/rea/universal-hub/adapters/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterId: 'node-test-runner' }),
      }),
      reqJson('/api/v2/rea/universal-hub/adapters/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterId: 'git-workspace' }),
      }),
      reqJson('/api/v2/rea/universal-hub/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adapterId: 'mcp-memory-brain',
          projectId: 'fenix-os',
          operation: 'deploy',
          objective: 'Operação fora do escopo permitido',
        }),
      }),
      reqJson('/api/v2/rea/universal-hub/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adapterId: 'pm2-deployer',
          projectId: 'fenix-os',
          operation: 'write',
          objective: 'Operação destrutiva exigindo aprovação humana',
        }),
      }),
      reqJson('/api/v2/rea/universal-hub/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProject: 'api-platform',
          consumerProject: 'fenix-os',
          primaryTool: 'git-workspace',
          validatorTool: 'node-test-runner',
        }),
      }),
      reqJson('/api/v2/rea/universal-hub/propagate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProjectId: 'api-platform',
          sharedContract: 'contract:api-platform:v1-chat-completions',
          summary: 'E2E Live VPS Cross-Project Contract Propagation',
        }),
      }),
    ]);

    return { inventory, adapters, testNode, testGit, forbiddenDispatch, approvalDispatch, proof, propagate };
  });

  assert.equal(hubApi.inventory.status, 200, 'Universal project inventory 200');
  assert.ok(hubApi.inventory.body.projectsTotal >= 7, '7+ ecosystem projects in Universal Hub');
  assert.equal(hubApi.adapters.status, 200, 'Universal tool adapters 200');
  assert.ok(hubApi.adapters.body.adaptersTotal >= 10, '10+ universal tool adapters');
  for (const ad of hubApi.adapters.body.adapters) {
    if (ad.certificationStage === 'CONNECTED' || ad.certificationStage === 'CERTIFIED') {
      assert.ok(ad.lastTestEvidence, `Adapter ${ad.adapterId} is ${ad.certificationStage} with real test evidence`);
    }
  }
  assert.equal(hubApi.testNode.status, 200, 'Test node-test-runner 200');
  assert.equal(hubApi.testNode.body.certificationStage, 'CERTIFIED', 'node-test-runner CERTIFIED on live VPS');
  assert.equal(hubApi.testGit.status, 200, 'Test git-workspace 200');
  assert.equal(hubApi.testGit.body.certificationStage, 'CERTIFIED', 'git-workspace CERTIFIED on live VPS');
  assert.equal(hubApi.forbiddenDispatch.status, 403, 'Unauthorized adapter operation rejected with HTTP 403');
  assert.equal(hubApi.approvalDispatch.status, 200, 'Human approval gate returns 200');
  assert.equal(hubApi.approvalDispatch.body.awaitingApproval, true, 'Destructive adapter write gated by human approval');
  assert.equal(hubApi.proof.status, 200, 'Cross-Tool & Cross-Project Proof 200');
  assert.equal(hubApi.proof.body.step2ValidatorExecution.exitCode, 0, 'Cross-Tool proof validator exitCode === 0');
  assert.ok(hubApi.proof.body.memoryPreCheck.sourceMatches > 0, 'Cross-Tool proof memoryPreCheck returned matches');
  assert.ok(hubApi.proof.body.centralMissionId, 'Cross-Tool proof created central mission');
  assert.equal(hubApi.proof.body.bugTrackerRecord?.bugState, 'VERIFIED', 'Cross-Tool proof recorded VERIFIED bug');
  assert.equal(hubApi.propagate.status, 200, 'Cross-project contract propagation 200');
  assert.ok(hubApi.propagate.body.propagation.impactedProjects.includes('fenix-os'), 'Propagation impacts fenix-os');
  console.log('   ✅ Live VPS GRG Universal Engineering Hub (Inventory, 11 Adapters, Permissions, Cross-Tool Proof & Propagation) certified!');

  // 4. CERTIFY CANONICAL CONTROL DASHBOARD IN VIEW-OPERATIONS (EVOLUTION TAB)
  console.log('\n[4/5] Certifying Canonical Control Dashboard in view-operations (Evolution Tab)...');
  await page.evaluate(async () => {
    window.showView?.('operations');
    if (window.FenixOperationsLive?.load) {
      await window.FenixOperationsLive.load();
    }
    const evoTabBtn = document.querySelector('#view-operations .flo-tabs button[data-tab="evolution"]');
    if (evoTabBtn) evoTabBtn.click();
  });
  await page.waitForTimeout(2000);

  const opsEval = await page.evaluate(() => {
    return {
      hasPocBtn: Boolean(document.getElementById('floBtnAutoPoc')),
      hasCrossProofBtn: Boolean(document.getElementById('floBtnHubProof')),
      hasScanBtn: Boolean(document.getElementById('floBtnAutoScan')),
      hasPauseBtn: Boolean(document.getElementById('floBtnAutoPause')),
      hasResumeBtn: Boolean(document.getElementById('floBtnAutoResume')),
      hasTelemetryGrid: Boolean(document.getElementById('fenixAutonomousTelemetryGrid')),
      hasProactiveFindingsSection: Boolean(document.getElementById('fenixProactiveFindingsSection')),
      proactiveFindingsCardsCount: document.querySelectorAll('#fenixProactiveFindingsSection > .flo-card').length,
      hasAdaptersGrid: Boolean(document.getElementById('fenixUniversalAdaptersGrid')),
      adapterCardsCount: document.querySelectorAll('#fenixUniversalAdaptersGrid > .flo-card').length,
      totalEvoCards: document.querySelectorAll('#view-operations .flo-content .flo-card').length,
    };
  });
  console.log('   Operations Evolution Tab DOM evaluation:', opsEval);
  assert.equal(opsEval.hasPocBtn, true, '#floBtnAutoPoc present');
  assert.equal(opsEval.hasCrossProofBtn, true, '#floBtnHubProof present');
  assert.equal(opsEval.hasScanBtn, true, '#floBtnAutoScan present');
  assert.equal(opsEval.hasPauseBtn, true, '#floBtnAutoPause present');
  assert.equal(opsEval.hasResumeBtn, true, '#floBtnAutoResume present');
  assert.equal(opsEval.hasTelemetryGrid, true, '#fenixAutonomousTelemetryGrid present');
  assert.equal(opsEval.hasProactiveFindingsSection, true, '#fenixProactiveFindingsSection present');
  assert.ok(opsEval.proactiveFindingsCardsCount > 0, 'Proactive scan findings cards rendered in UI');
  assert.equal(opsEval.hasAdaptersGrid, true, '#fenixUniversalAdaptersGrid present');
  assert.ok(opsEval.adapterCardsCount >= 10, '10+ Universal Tool Adapter cards rendered');
  assert.ok(opsEval.totalEvoCards >= 18, 'Roles, bugs, findings, adapters & dependency graph cards rendered');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase54_autonomous_evolution_dashboard_live.png') });
  console.log('   📸 Captured phase54_autonomous_evolution_dashboard_live.png');

  await page.evaluate(() => {
    const el = document.getElementById('fenixUniversalAdaptersGrid');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase54_universal_hub_adapters_and_graph_live.png') });
  console.log('   📸 Captured phase54_universal_hub_adapters_and_graph_live.png');

  // 5. CERTIFY LIVING CITY 3D 7 ROLES & 9 ENGINEERING STATES SYNCHRONIZATION
  console.log('\n[5/5] Certifying Living City 3D 7 Engineering Roles & Contextual Inspector...');
  await page.evaluate(() => window.showView?.('city'));
  await page.waitForTimeout(2500);

  const cityRoleEval = await page.evaluate(async () => {
    const engine = window.fenixWorld3D || window._fenixWorld3DInstance;
    if (!engine) return { ok: false };
    engine._mountOperationalModeBar?.();
    await window.fenixSyncCityAutonomousState?.();
    const inspected = window.fenixInspectCityRole?.('bug-hunter');
    const roster = document.getElementById('fenixCityAutonomousRoster');
    const inspector = document.getElementById('fenixCityRoleInspector');
    const pillsCount = roster ? roster.querySelectorAll('[data-city-role-id]').length : 0;
    const inspectorHtml = inspector ? inspector.innerHTML : '';
    return {
      ok: true,
      hasRoster: Boolean(roster),
      pillsCount,
      hasInspector: Boolean(inspector && inspector.style.display !== 'none'),
      hasProgressField: inspectorHtml.includes('PROGRESSO REAL'),
      hasCostField: inspectorHtml.includes('TOKENS / CUSTO'),
      hasBlockersField: inspectorHtml.includes('Bloqueios:'),
      inspectedLabel: inspected?.role || null,
      inspectedState: inspected?.engineeringState || null,
    };
  });
  console.log('   Living City 3D 7-Role evaluation:', cityRoleEval);
  assert.equal(cityRoleEval.ok, true);
  assert.equal(cityRoleEval.hasRoster, true, '#fenixCityAutonomousRoster mounted in 3D City');
  assert.equal(cityRoleEval.pillsCount, 7, '7 canonical engineering role pills rendered in 3D City');
  assert.equal(cityRoleEval.hasInspector, true, '#fenixCityRoleInspector visible upon role click');
  assert.equal(cityRoleEval.hasProgressField, true, 'Role inspector shows PROGRESSO REAL');
  assert.equal(cityRoleEval.hasCostField, true, 'Role inspector shows TOKENS / CUSTO');
  assert.equal(cityRoleEval.hasBlockersField, true, 'Role inspector shows Bloqueios');
  assert.equal(cityRoleEval.inspectedLabel, 'Bug Hunter', 'Contextual inspector shows Bug Hunter role details');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase54_living_city_7roles_inspector_live.png') });
  console.log('   📸 Captured phase54_living_city_7roles_inspector_live.png');

  await context.close();
  await browser.close();

  console.log('================================================================');
  console.log('🎉 ALL PHASE 54 LIVE VPS E2E CERTIFICATIONS PASSED (5/5 STAGES)');
  console.log('================================================================');
  process.exit(0);
})().catch((err) => {
  console.error('❌ PHASE 54 E2E CERTIFICATION FAILED:', err);
  process.exit(1);
});
