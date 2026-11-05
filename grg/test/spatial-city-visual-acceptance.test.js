'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');
const screenshotsDir = path.resolve(__dirname, '..', '..', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test('FÊNIX OS — Level 20 Spatial City Visual Acceptance across 3 Viewports', async (t) => {
  const app = express();
  app.use(express.static(publicDir));

  // Serve verified telemetry endpoints for visual QA
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
        { id: 'MSN-8725', title: 'Otimizar performance das consultas', pct: 48, progress: 48, tokens: '83.9k', time: '42m 11s', cost: '$0.016', projectId: 'zapai-crm' },
        { id: 'MSN-8726', title: 'Integrar novo gateway de pagamento', pct: 15, progress: 15, tokens: '37.2k', time: '18m 47s', cost: '$0.007', projectId: 'zapai-crm' }
      ]
    });
  });

  app.get('/api/v2/jobs', (_req, res) => {
    res.json({
      ok: true,
      jobs: [
        { id: 'JOB-4412', title: 'Refatorar API de clientes', time: '2m 14s', tokens: '12.4k', status: 'RUNNING', projectId: 'zapai-crm' },
        { id: 'JOB-4413', title: 'Implementar filtros avançados', time: '4m 37s', tokens: '21.9k', status: 'RUNNING', projectId: 'zapai-crm' },
        { id: 'JOB-4414', title: 'Corrigir testes E2E - checkout', time: '1m 02s', tokens: '8.6k', status: 'RUNNING', projectId: 'zapai-crm' }
      ]
    });
  });

  app.get('/api/v2/system-reconstruction/health', (_req, res) => {
    res.json({
      ok: true,
      status: 'HEALTHY',
      health: 98,
      cpu: 34,
      ram: 62,
      disk: 41,
      net: '128 Mbps',
      tokens: '2.48M',
      cost: '$0.87',
      threats: 0
    });
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined,
  });

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('WebGL')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`http://127.0.0.1:${port}/index.html#city`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(600);

    // Verify 7 KPI Topbar Capsules exist
    const kpisCount = await page.locator('#fnxTopbarKpisCluster [data-metric]').count();
    assert.ok(kpisCount >= 7, `Expected at least 7 KPI capsules on viewport ${vp.name}, found ${kpisCount}`);

    // Verify Defesa Sidebar Item exists
    const defenseBtn = page.locator('[data-view="defense"]');
    assert.ok(await defenseBtn.count() > 0, `Expected Defesa sidebar button on viewport ${vp.name}`);

    // Verify 5 Minimap Layer Filters exist
    const minimapLayersCount = await page.locator('#minimapLayerSelectors .mls-btn').count();
    assert.equal(minimapLayersCount, 5, `Expected 5 minimap layer buttons on viewport ${vp.name}`);

    // Verify Bottom 4 Docks exist
    assert.ok(await page.locator('#fenixWorldMinimap').count() > 0, 'Minimap card must exist');
    assert.ok(await page.locator('#dockWindowAgents').count() > 0, 'Featured agents card must exist');
    assert.ok(await page.locator('#dockWindowMissions').count() > 0, 'Active missions card must exist');
    assert.ok(await page.locator('#dockWindowJobs').count() > 0, 'Running jobs card must exist');

    // Trigger Building Inspection (ZapAI CRM / dev-loft)
    await page.waitForFunction(() => typeof window.fenixSelectBuilding === 'function', { timeout: 15000 });
    await page.evaluate(() => {
      window.fenixSelectBuilding('dev-loft');
    });
    await page.waitForTimeout(800);

    // Take screenshot of inspected building state
    const shotPath = path.join(screenshotsDir, `spatial_city_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false, animations: 'disabled', timeout: 60000 });
    assert.ok(fs.existsSync(shotPath), `Screenshot must exist at ${shotPath}`);

    // Verify Building Cutaway & Inspector elements
    const bldName = await page.locator('#building-name').textContent();
    assert.match(bldName, /ZapAI CRM|Edifício/i, 'Building name should match selected building');

    // Close page cleanly
    await page.close();
  }

  // Additional Step: Verify Defense Modal appearance on Desktop
  const desktopPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await desktopPage.goto(`http://127.0.0.1:${port}/index.html#city`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await desktopPage.waitForTimeout(500);

  await desktopPage.evaluate(() => {
    window.FenixSpatialCity.openDefensePanel();
  });
  await desktopPage.waitForTimeout(300);

  const defenseModal = desktopPage.locator('#spatialDefenseModal');
  assert.ok(await defenseModal.isVisible(), 'Defense modal must be visible after openDefensePanel()');

  const defShotPath = path.join(screenshotsDir, 'spatial_city_defense_panel.png');
  await desktopPage.screenshot({ path: defShotPath, animations: 'disabled', timeout: 60000 });
  assert.ok(fs.existsSync(defShotPath), 'Defense modal screenshot must exist');

  await desktopPage.close();
});
