'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');
const screenshotsDir = path.resolve(__dirname, '..', 'public', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test('FÊNIX OS — Visual Recovery & Fênix Life Integration E2E Acceptance', { timeout: 300000 }, async (t) => {
  const app = express();
  app.use(express.static(publicDir));

  // Voice PersonaPlex mock endpoints for E2E tests
  app.get('/api/voice/health', (_req, res) => {
    res.json({ ok: true, service: 'fenix-voice-personaplex', status: 'ONLINE', sessionsActive: 1 });
  });

  app.post('/api/voice/chat', express.json(), (req, res) => {
    const msg = req.body?.message || '';
    res.json({
      ok: true,
      reply: `Comando Fênix recebido: "${msg}". Operações da cidade coordenadas com sucesso.`,
      visemes: [
        { time: 0, viseme: 'open-aa' },
        { time: 150, viseme: 'teeth' },
        { time: 300, viseme: 'open-oo' },
        { time: 450, viseme: 'wide' },
        { time: 600, viseme: 'closed' }
      ]
    });
  });

  app.get('/api/voice/sessions', (_req, res) => {
    res.json({ ok: true, sessions: [{ id: 'sess-test', agentId: 'fenix-mascot', active: true }] });
  });

  // Mock defense endpoints
  app.get('/api/defense/status', (_req, res) => {
    res.json({ ok: true, wafBlocked24h: 142, threatLevel: 'LOW', zeroTrustPolicies: 18, integrityValidPct: 100 });
  });

  app.get('/api/defense/threats', (_req, res) => {
    res.json({ ok: true, threats: [{ id: 'THR-101', type: 'SQL_INJECTION_ATTEMPT', ip: '185.220.101.5', status: 'BLOCKED' }] });
  });

  // Real telemetry endpoints for City view
  app.get('/api/fenix/projects', (_req, res) => {
    res.json({
      ok: true,
      projects: [
        { id: 'zapai-crm', name: 'ZapAI CRM', workspace: 'active', status: 'ONLINE' },
        { id: 'api-platform', name: 'API Platform Hub', workspace: 'active', status: 'ONLINE' },
        { id: 'fenix-os', name: 'Fênix Operating System HQ', workspace: 'active', status: 'ONLINE' },
        { id: 'ai-engine-core', name: 'AI Engine Core', workspace: 'active', status: 'ONLINE' }
      ]
    });
  });

  app.get('/api/v2/living-city/agents', (_req, res) => {
    res.json({
      ok: true,
      agents: [
        { id: 'ag-arch', name: 'Architect', role: 'IA & Sistemas', status: 'WORKING', model: 'GPT-4o', currentTask: 'Otimizar pipeline de embeddings', duration: '12m 04s', tokens: '18.4k', projectId: 'zapai-crm' },
        { id: 'ag-dev', name: 'DevAgent', role: 'Frontend · Claude-3.7', status: 'WORKING', model: 'Claude-3.7', currentTask: 'Implementar gateway de pagamento', duration: '27m 18s', tokens: '42.7k', projectId: 'zapai-crm' },
        { id: 'ag-qa', name: 'QA Sentinel', role: 'Testes & QA · o3-mini', status: 'MONITORING', model: 'o3-mini', currentTask: 'Executar testes E2E Playwright', duration: '5m 41s', tokens: '6.9k', projectId: 'zapai-crm' },
        { id: 'ag-sec', name: 'Victor Security', role: 'Zero-Trust Vault Guard', status: 'AVAILABLE', model: 'GPT-4o', currentTask: 'Inspeção de tokens e RBAC', duration: '1h 10m', tokens: '31.2k', projectId: 'api-platform' }
      ]
    });
  });

  app.get('/api/missions', (_req, res) => {
    res.json({
      ok: true,
      missions: [
        { id: 'MSN-8724', title: 'Evoluir módulo de relatórios (zapai-crm)', pct: 72, progress: 72, tokens: '128.4k', time: '1h 14m', cost: '$0.024', projectId: 'zapai-crm' },
        { id: 'MSN-8725', title: 'Otimizar performance das consultas', pct: 48, progress: 48, tokens: '83.9k', time: '42m 11s', cost: '$0.016', projectId: 'zapai-crm' }
      ]
    });
  });

  app.get('/api/v2/jobs', (_req, res) => {
    res.json({
      ok: true,
      jobs: [
        { id: 'job-991', task: 'Indexação vetorial de documentos', agent: 'Architect', status: 'RUNNING', duration: '3m 12s', tokens: '14.2k' },
        { id: 'job-992', task: 'Compilação de contratos Solidity', agent: 'DevAgent', status: 'RUNNING', duration: '1m 45s', tokens: '8.7k' }
      ]
    });
  });

  app.get('/api/v2/city/state', (_req, res) => {
    res.json({ ok: true, buildings: [], agents: [], timestamp: Date.now() });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1600x900',  width: 1600, height: 900 },
    { name: '1366x768',  width: 1366, height: 768 },
    { name: '1024x768',  width: 1024, height: 768 },
    { name: '768x1024',  width: 768,  height: 1024 },
    { name: '390x844',   width: 390,  height: 844 },
    { name: '360x800',   width: 360,  height: 800 }
  ];

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // ── 1. Viewport Sweep & Screenshots (Dynamic Resize) ──
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(250);

      // Verify that header exists
      const headerVisible = await page.locator('.global-topbar, .orch-topbar, .fnx-brand-lockup').first().isVisible().catch(() => false);
      assert.ok(headerVisible, `Header must be visible at ${vp.name}`);

      // Verify bottom dock exists in City view
      const bottomDock = page.locator('#fenixModularBottomDock');
      assert.ok(await bottomDock.count() > 0, `Bottom dock must exist at ${vp.name}`);

      // Take screenshot
      const shotPath = path.join(screenshotsDir, `viewport-${vp.name}-city.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      assert.ok(fs.existsSync(shotPath), `Screenshot must exist for ${vp.name}`);
    }

    // Verify the floor inspector stays within the usable area above the bottom dock.
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.evaluate(() => window.fenixWorld3D?.enterBuilding('bld-api-platform'));
      await page.waitForTimeout(150);
      const floorDock = page.locator('#fw3FloorDock');
      assert.ok(await floorDock.isVisible(), `Floor inspector must open at ${vp.name}`);
      const floorBox = await floorDock.boundingBox();
      const bottomBox = await page.locator('#fenixModularBottomDock').boundingBox();
      assert.ok(floorBox && bottomBox, `Floor and bottom docks must be measurable at ${vp.name}`);
      assert.ok(floorBox.y + floorBox.height <= bottomBox.y + 2, `Floor inspector must not overlap bottom dock at ${vp.name}`);
      await page.evaluate(() => window.fenixWorld3D?.exitBuilding());
    }

    // ── 2. Deep Functional Verification at 1920x1080 ──
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(400);

    // Verify 4 dock cards
    const dockCard1 = page.locator('#fenixWorldMinimap');
    const dockCard2 = page.locator('#dockWindowAgents');
    const dockCard3 = page.locator('#dockWindowMissions');
    const dockCard4 = page.locator('#dockWindowJobs');

    assert.ok(await dockCard1.isVisible(), 'Card 1 (Minimap) must be visible');
    assert.ok(await dockCard2.isVisible(), 'Card 2 (Agents) must be visible');
    assert.ok(await dockCard3.isVisible(), 'Card 3 (Missions) must be visible');
    assert.ok(await dockCard4.isVisible(), 'Card 4 (Jobs) must be visible');

    // Verify Building Inspector interaction without overlap
    await page.evaluate(() => {
      window.fenixSelectBuilding?.('dev-loft');
    });
    await page.waitForTimeout(300);

    const inspector = page.locator('#spatialBuildingInspectorPanel');
    assert.ok(await inspector.isVisible(), 'Building inspector must open when building is selected');

    const viewCityHasClass = await page.evaluate(() => {
      return document.getElementById('view-city')?.classList.contains('has-inspector-open');
    });
    assert.ok(viewCityHasClass, '#view-city must have .has-inspector-open when inspector is open');

    // Verify Inspector bounding box does not overlap bottom dock
    const inspBox = await inspector.boundingBox();
    const dockBox = await page.locator('#fenixModularBottomDock').boundingBox();
    assert.ok(inspBox && dockBox, 'Both bounding boxes must exist');
    assert.ok(inspBox.y + inspBox.height <= dockBox.y + 10, 'Inspector bottom must not penetrate bottom dock');

    // Close Inspector
    await page.evaluate(() => {
      window.fenixCloseInspectorOnly?.();
    });
    await page.waitForTimeout(200);

    const viewCityClosed = await page.evaluate(() => {
      return !document.getElementById('view-city')?.classList.contains('has-inspector-open');
    });
    assert.ok(viewCityClosed, '#view-city must remove .has-inspector-open when closed');

    // ── 3. Fênix Life Mascot & Immersive Mode ──
    const compactMascot = page.locator('#fenix-floating-mascot');
    assert.ok(await compactMascot.count() > 0, '#fenix-floating-mascot must exist in DOM');

    // Check 10 States
    const states = ['idle', 'listening', 'thinking', 'speaking', 'explaining', 'success', 'warning', 'error', 'meeting', 'offline'];
    for (const st of states) {
      await page.evaluate((s) => window.FenixMascotController?.setMood(s), st);
      const attrState = await compactMascot.getAttribute('data-state');
      assert.equal(attrState, st, `Mascot data-state must equal ${st}`);
    }

    // Open Immersive Mode
    await page.evaluate(() => {
      window.FenixLife?.openImmersive();
    });
    await page.waitForTimeout(400);

    const immersiveModal = page.locator('#fenixImmersiveMascotModal');
    const isImmOpen = await immersiveModal.isVisible();
    assert.ok(isImmOpen, 'Fênix Life Immersive Modal must be visible after openImmersive()');

    // Capture Immersive screenshot
    const shotImm = path.join(screenshotsDir, 'fenix-life-immersive-3d.png');
    await page.screenshot({ path: shotImm });
    assert.ok(fs.existsSync(shotImm), 'Immersive screenshot must be saved');

    // Verify 3D Canvas and Spectrum Canvas exist in Immersive Mode
    const life3DCanvas = page.locator('#fenixLife3DCanvas');
    const specCanvas = page.locator('#fimSpectrumCanvas');
    assert.ok(await life3DCanvas.count() > 0, '#fenixLife3DCanvas must exist');
    assert.ok(await specCanvas.count() > 0, '#fimSpectrumCanvas must exist');

    // Verify Critical Action Safety Gate Modal
    await page.evaluate(() => {
      window.FenixLife?.handleUserInstruction('executar deploy em producao agora');
    });
    await page.waitForTimeout(300);

    const safetyModal = page.locator('#fenixCriticalSafetyModal');
    assert.ok(await safetyModal.isVisible(), 'Critical Safety Modal must open on dangerous instruction');

    // Cancel safety modal
    await page.locator('#fcsmBtnCancel').click();
    await page.waitForTimeout(200);
    assert.ok(await safetyModal.isHidden(), 'Critical Safety Modal must close on Cancel');

    // Close Immersive mode and return to City
    await page.locator('#fimBtnCloseImmersive').click();
    await page.waitForTimeout(300);
    assert.ok(await immersiveModal.isHidden(), 'Immersive Modal must close on Retornar à Cidade');

    // ── 4. Defesa SOC View Verification ──
    await page.evaluate(() => {
      window.showView?.('defense');
    });
    await page.waitForTimeout(600);

    const defenseView = page.locator('#view-defense');
    assert.ok(await defenseView.isVisible(), '#view-defense must be visible');

    // Capture Defesa screenshot
    const shotDefense = path.join(screenshotsDir, 'view-defense-soc.png');
    await page.screenshot({ path: shotDefense });
    assert.ok(fs.existsSync(shotDefense), 'Defesa view screenshot must be saved');

    // Verify SOC tabs exist
    const socTabs = await page.locator('#fenixDefenseTabs button, #fenixDefenseTabs .fenix-pill-tab').count();
    assert.ok(socTabs >= 5, 'Defesa must have at least 5 SOC tabs');

    console.log('✅ ALL E2E PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
    server.close();
  }
});
