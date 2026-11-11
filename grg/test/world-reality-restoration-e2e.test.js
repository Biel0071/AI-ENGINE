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

test('FÊNIX OS — World Reality Restoration 14-Step Playwright E2E Acceptance Suite', { timeout: 240000 }, async (t) => {
  const app = express();
  app.use(express.static(publicDir));

  // 1. Projects Registry API Endpoints
  const mockProjects = [
    {
      id: 'zapai-crm',
      name: 'ZapAI CRM',
      displayName: 'ZapAI Tower',
      organization: 'Biel0071 SaaS',
      description: 'CRM Conversacional — WhatsApp Multi-Device, Campanhas, Inbox Omnichannel, Automações',
      repository: 'https://github.com/Biel0071/ZAPAI-FINAL.git',
      branch: 'main',
      status: 'ONLINE',
      frontend: { framework: 'React 18 + Vite + TypeScript', port: 1000 },
      backend: { framework: 'Express + Baileys / Node.js 20', port: 4025 },
      database: { primary: 'PostgreSQL 16 / SQLite', cache: 'Redis' },
      services: ['crm', 'whatsapp-gateway', 'campaigns', 'inbox'],
      apis: ['/api/whatsapp', '/api/messages', '/api/conversations', '/api/contacts'],
      routes: ['/dashboard', '/inbox', '/contacts', '/campaigns'],
      components: ['ActiveChatPane', 'ChatListPanel', 'SidebarPanel']
    },
    {
      id: 'fenix-os',
      name: 'FÊNIX Operating System HQ',
      displayName: 'Fênix HQ',
      organization: 'Fênix Core Systems',
      description: 'Central de Comando · Kernel, Governança & Swarm',
      repository: 'https://github.com/fenix-os/ai-engine-core.git',
      branch: 'main',
      status: 'ONLINE',
      frontend: { framework: 'Vanilla ES Modular Shell', port: 3000 },
      backend: { framework: 'Native Node HTTP Kernel', port: 4400 },
      database: { primary: 'PostgreSQL 16 / SQLite', cache: 'Redis' },
      services: ['kernel', 'telemetry', 'memory-fabric', 'mission-router'],
      apis: ['/api/runtime', '/api/missions', '/api/v2/jobs'],
      routes: ['/app#city', '/app#command', '/app#ide'],
      components: ['FenixCityMachineScene', 'VisualWorkspaceEngine']
    }
  ];

  app.get('/api/v2/projects-registry', (_req, res) => {
    res.json({ ok: true, projects: mockProjects, count: mockProjects.length });
  });

  app.get('/api/v2/projects-registry/:id', (req, res) => {
    const p = mockProjects.find(item => item.id === req.params.id);
    if (!p) return res.status(404).json({ ok: false, error: 'Project not found', id: req.params.id });
    res.json({ ok: true, project: p });
  });

  app.get('/api/fenix/projects', (_req, res) => {
    res.json({ ok: true, projects: mockProjects });
  });

  // 2. Agents Endpoint
  app.get('/api/v2/living-city/agents', (_req, res) => {
    res.json({
      ok: true,
      agents: [
        { id: 'DevAgent-01', name: 'DevAgent-01', role: 'Backend', model: 'GPT-4o', currentTask: 'Implementar gateway de pagamento', duration: '27m 18s', tokens: '42.7k', status: 'Ativo', department: 'Desenvolvimento', projectId: 'zapai-crm' },
        { id: 'DevAgent-02', name: 'DevAgent-02', role: 'Frontend', model: 'Claude-3.7', currentTask: 'Ajustar fluxo do checkout', duration: '12m 04s', tokens: '18.4k', status: 'Ativo', department: 'Desenvolvimento', projectId: 'zapai-crm' },
        { id: 'DevAgent-03', name: 'DevAgent-03', role: 'Fullstack', model: 'GPT-4o', currentTask: 'Refatorar módulo de clientes', duration: '18m 47s', tokens: '37.2k', status: 'Ativo', department: 'Desenvolvimento', projectId: 'zapai-crm' },
        { id: 'DevAgent-04', name: 'DevAgent-04', role: 'QA', model: 'o3-mini', currentTask: 'Executar testes E2E', duration: '5m 41s', tokens: '6.9k', status: 'Ativo', department: 'Desenvolvimento', projectId: 'zapai-crm' },
        { id: 'DevAgent-05', name: 'DevAgent-05', role: 'Docs', model: 'GPT-4o', currentTask: 'Atualizar documentação da API', duration: '—', tokens: '0', status: 'Parado', department: 'Desenvolvimento', projectId: 'zapai-crm' }
      ]
    });
  });

  // 3. Telemetry & Health
  app.get('/api/v2/system-reconstruction/health', (_req, res) => {
    res.json({
      ok: true,
      health: 98,
      status: 'HEALTHY',
      cpu: 34,
      ram: 62,
      disk: 41,
      network: 128
    });
  });

  // 4. Jobs Endpoint
  app.get('/api/v2/jobs', (_req, res) => {
    res.json({
      ok: true,
      items: [
        { id: 'JOB-4412', title: 'Refatorar API de clientes', time: '2m 14s', tokens: '12.4k', status: 'active', projectId: 'zapai-crm' },
        { id: 'JOB-4413', title: 'Implementar filtros avançados', time: '4m 37s', tokens: '21.9k', status: 'active', projectId: 'zapai-crm' },
        { id: 'JOB-4414', title: 'Corrigir testes E2E - checkout', time: '1m 02s', tokens: '8.6k', status: 'active', projectId: 'zapai-crm' }
      ]
    });
  });

  // 5. Missions Endpoint
  app.get('/api/missions', (_req, res) => {
    res.json({
      missions: [
        { id: 'MSN-8724', title: 'Evoluir módulo de relatórios (zapai-crm)', pct: 72, time: '1h 14m', cost: '$0.024', tokens: '128.4k', projectId: 'zapai-crm' },
        { id: 'MSN-8725', title: 'Otimizar performance das consultas', pct: 48, time: '42m 11s', cost: '$0.016', tokens: '83.9k', projectId: 'zapai-crm' },
        { id: 'MSN-8726', title: 'Integrar novo gateway de pagamento', pct: 15, time: '18m 47s', cost: '$0.007', tokens: '37.2k', projectId: 'zapai-crm' }
      ]
    });
  });

  // 6. Voice & SSE
  app.get('/api/voice/health', (_req, res) => {
    res.json({ ok: true, service: 'fenix-voice-personaplex', status: 'ONLINE', sessionsActive: 1 });
  });

  app.get('/api/v2/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('data: {"type":"system.boot","message":"Fênix OS Reality Kernel Synchronized"}\n\n');
    req.on('close', () => res.end());
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html#city`;

  let browser;
  t.after(async () => {
    if (browser) await browser.close();
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let lastStepTime = Date.now();
  const page = await browser.newPage();
  page.setDefaultTimeout(35000);

  await page.addInitScript(() => {
    try {
      Object.defineProperty(document, 'fonts', {
        value: {
          ready: Promise.resolve(),
          check: () => true,
          add: () => {},
          forEach: () => {},
          load: () => Promise.resolve([])
        },
        configurable: true
      });
    } catch (_) {}
  });

  // ── Passo 1: Abrir Cidade 3D em 1920x1080 ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 1/14] Navegando para Cidade 3D em 1920x1080...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);

  // Switch to view-city if not active
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
  });
  await page.waitForTimeout(400);

  // ── Passo 2: Selecionar ZapAI CRM ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 2/14] Selecionando edifício ZapAI CRM...');
  await page.evaluate(() => {
    if (typeof window.fenixSelectBuilding === 'function') {
      window.fenixSelectBuilding('zapai-crm');
    } else if (window.FenixSpatialCity) {
      window.FenixSpatialCity.selectBuilding('zapai-crm');
    }
  });
  await page.waitForTimeout(600);

  // Capture screenshot of selected building
  const shot1 = path.join(screenshotsDir, 'world-reality-01-zapai-selected.png');
  await page.screenshot({ path: shot1, fullPage: false, animations: 'disabled', timeout: 35000 });
  assert.ok(fs.existsSync(shot1), 'Screenshot 01 must exist');

  // ── Passo 3: Verificar Identidade Real e Não-Vazia ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 3/14] Validando telemetria e KPIs reais...');
  const buildingName = await page.locator('#building-name').textContent();
  assert.ok(buildingName && buildingName.includes('ZapAI'), `Building name must be ZapAI CRM, got: ${buildingName}`);
  assert.notEqual(buildingName.trim(), '—', 'Building name must not be dash');

  const subtitle = await page.locator('#spatialBuildingSubtitle').textContent();
  assert.notEqual(subtitle.trim(), '—', 'Subtitle must not be dash');

  const statusText = await page.locator('#spatialBuildingStatus').textContent();
  assert.ok(statusText.includes('ONLINE') || statusText.includes('Operacional'), `Status must be online/operational, got: ${statusText}`);

  const statFloors = await page.locator('#bldStatFloors').textContent();
  assert.ok(statFloors && !statFloors.includes('—'), `Floors stat must not be dash, got: ${statFloors}`);

  const statArea = await page.locator('#bldStatArea').textContent();
  assert.ok(statArea && !statArea.includes('—'), `Area stat must not be dash, got: ${statArea}`);

  const statAgents = await page.locator('#bldStatAgents').textContent();
  assert.ok(statAgents && !statAgents.includes('—'), `Agents stat must not be dash, got: ${statAgents}`);

  const statJobs = await page.locator('#bldStatJobs').textContent();
  assert.ok(statJobs && !statJobs.includes('—'), `Jobs stat must not be dash, got: ${statJobs}`);

  const statMissions = await page.locator('#bldStatMissions').textContent();
  assert.ok(statMissions && !statMissions.includes('—'), `Missions stat must not be dash, got: ${statMissions}`);

  const statHealth = await page.locator('#bldStatHealth').textContent();
  assert.ok(statHealth && !statHealth.includes('—'), `Health stat must not be dash, got: ${statHealth}`);

  // ── Passo 4: Verificar Aba Visão Geral ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 4/14] Validando aba Visão Geral...');
  const overviewTabBtn = page.locator('#inspectorTabStrip [data-tab="overview"]');
  if (await overviewTabBtn.count() > 0) {
    await overviewTabBtn.click({ force: true });
    await page.waitForTimeout(300);
    const content = await page.locator('#inspectorFloorContent').textContent();
    assert.ok(content.includes('ZapAI') || content.includes('FRONTEND') || content.includes('BACKEND'), 'Overview tab must render project architecture');
    assert.ok(content.includes('React 18') || content.includes('Express') || content.includes('PostgreSQL'), 'Overview must display real stack');
  }

  // ── Passo 5: Verificar Aba Andares & Acordeão ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 5/14] Validando aba Andares & Acordeão...');
  const floorsTabBtn = page.locator('#inspectorTabStrip [data-tab="floors"]');
  await floorsTabBtn.click({ force: true });
  await page.waitForTimeout(400);

  const floorCards = page.locator('.floor-card');
  const floorCount = await floorCards.count();
  assert.ok(floorCount >= 4, `Must render at least 4 floors in accordion, got: ${floorCount}`);

  const floor3Card = page.locator('.floor-card[data-floor-num="3"]');
  if (await floor3Card.count() > 0) {
    const isFloor3Expanded = await floor3Card.evaluate(el => el.classList.contains('expanded'));
    if (!isFloor3Expanded) {
      await page.locator('.floor-card[data-floor-num="3"] .floor-card-header').click({ force: true });
      await page.waitForTimeout(300);
    }
    const floor3Body = page.locator('.floor-card[data-floor-num="3"] .floor-card-body');
    assert.ok(await floor3Body.isVisible(), 'Floor 3 body must be visible when expanded');
  }

  // ── Passo 6: Verificar Aba Agentes ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 6/14] Validando aba Agentes...');
  const agentsTabBtn = page.locator('#inspectorTabStrip [data-tab="agents"]');
  await agentsTabBtn.click({ force: true });
  await page.waitForTimeout(300);

  const agentsContent = await page.locator('#inspectorFloorContent').textContent();
  assert.ok(agentsContent.includes('DevAgent') || agentsContent.includes('Agentes Alocados'), 'Agents tab must render roster');
  assert.ok(agentsContent.includes('GPT-4o') || agentsContent.includes('Claude') || agentsContent.includes('o3-mini'), 'Agents tab must display model tags');

  // ── Passo 7: Verificar Aba Métricas ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 7/14] Validando aba Métricas...');
  const metricsTabBtn = page.locator('#inspectorTabStrip [data-tab="metrics"]');
  await metricsTabBtn.click({ force: true });
  await page.waitForTimeout(300);

  const metricsContent = await page.locator('#inspectorFloorContent').textContent();
  assert.ok(metricsContent.includes('CPU') && metricsContent.includes('RAM'), 'Metrics tab must display CPU and RAM telemetry');

  // ── Passo 8: Verificar Aba Defesa ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 8/14] Validando aba Defesa...');
  const defenseTabBtn = page.locator('#inspectorTabStrip [data-tab="defense"]');
  await defenseTabBtn.click({ force: true });
  await page.waitForTimeout(300);

  const defenseContent = await page.locator('#inspectorFloorContent').textContent();
  assert.ok(defenseContent.includes('Defesa') && defenseContent.includes('WAF'), 'Defense tab must display SOC security telemetry');

  // ── Passo 9: Verificar Dock Operacional (4 Cards) ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 9/14] Validando dock operacional...');
  assert.ok(await page.locator('#fenixModularBottomDock').isVisible(), 'Bottom dock must be visible');
  assert.ok(await page.locator('#fenixWorldMinimap').isVisible(), 'Minimap card must be visible');
  assert.ok(await page.locator('#dockWindowAgents').isVisible(), 'Agents card must be visible');
  // Eventos sairam do dock e ficam no botao Eventos do rodape (com filtros por tipo real).
  assert.equal(await page.locator('#dockWindowMissions').isVisible(), false, 'Events list moved out of the dock');
  assert.ok(await page.locator('#footerAlertBtn').isVisible(), 'Events button must be visible in the footer');
  assert.ok(await page.locator('#dockWindowJobs').isVisible(), 'Jobs card must be visible');

  // ── Passo 10: Alternar para outro Edifício (Fênix OS HQ) ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 10/14] Alternando para Fênix OS HQ...');
  await page.evaluate(() => {
    window.fenixSelectBuilding('fenix-os');
  });
  await page.waitForTimeout(500);

  const newBuildingName = await page.locator('#building-name').textContent();
  assert.ok(newBuildingName.includes('FÊNIX') || newBuildingName.includes('HQ'), `Building name must shift to Fênix HQ, got: ${newBuildingName}`);

  // ── Passo 11: Minimapa 3D e Filtros de Camadas ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 11/14] Validando minimapa 3D...');
  const minimapCanvas = page.locator('#fenixMinimap');
  assert.ok(await minimapCanvas.isVisible(), 'Minimap canvas must be visible');

  const btnLayerDistricts = page.locator('.mls-btn[data-layer="districts"]');
  if (await btnLayerDistricts.count() > 0) {
    await btnLayerDistricts.click({ force: true });
    await page.waitForTimeout(200);
    assert.ok(await btnLayerDistricts.evaluate(el => el.classList.contains('active')), 'Districts layer button must be active');
  }

  // ── Passo 12: Minimizar, Maximizar e Fechar Inspetor ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 12/14] Validando controles do inspetor...');
  const btnMin = page.locator('#btnInspectorMinimize');
  await btnMin.click({ force: true });
  await page.waitForTimeout(200);
  assert.ok(await page.locator('#spatialBuildingInspectorPanel').evaluate(el => el.classList.contains('is-minimized')), 'Inspector must have is-minimized');

  const btnMax = page.locator('#btnInspectorMaximize');
  await btnMax.click({ force: true });
  await page.waitForTimeout(200);
  assert.ok(await page.locator('#spatialBuildingInspectorPanel').evaluate(el => el.classList.contains('is-maximized')), 'Inspector must have is-maximized');

  const btnClose = page.locator('#btnCutawayClose');
  await btnClose.click({ force: true });
  await page.waitForTimeout(200);
  const isClosed = await page.locator('#spatialBuildingInspectorPanel').evaluate(el => el.style.display === 'none');
  assert.ok(isClosed, 'Inspector panel must be display:none after close');

  // ── Passo 13: Viewport Laptop 1366x768 ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 13/14] Validando responsividade em 1366x768...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.fenixSelectBuilding('zapai-crm');
  });
  await page.waitForTimeout(400);

  const shot1366 = path.join(screenshotsDir, 'world-reality-13-laptop-1366.png');
  await page.screenshot({ path: shot1366, fullPage: false, animations: 'disabled', timeout: 35000 });
  assert.ok(fs.existsSync(shot1366), 'Screenshot 1366 must exist');

  // Verify Inspector and Dock do not overlap
  const inspBox = await page.locator('#spatialBuildingInspectorPanel').boundingBox();
  const dockBox = await page.locator('#fenixModularBottomDock').boundingBox();
  if (inspBox && dockBox) {
    assert.ok(inspBox.y + inspBox.height <= dockBox.y + 2, `Inspector (bottom: ${inspBox.y + inspBox.height}) must not collide with dock (top: ${dockBox.y})`);
  }

  // ── Passo 14: Estado Honesto de Ausência para Edifício Desconhecido ──
  console.log('--- Completed in ' + (Date.now() - (typeof lastStepTime !== 'undefined' ? lastStepTime : t0)) + 'ms ---');
  lastStepTime = Date.now();
  console.log('[Passo 14/14] Validando honestidade para edifício não cadastrado...');
  await page.evaluate(() => {
    window.fenixSelectBuilding('unknown-ghost-tower');
  });
  await page.waitForTimeout(400);

  const unknownSubtitle = await page.locator('#spatialBuildingSubtitle').textContent();
  assert.ok(unknownSubtitle.includes('Não registrado'), `Must display honest not registered subtitle, got: ${unknownSubtitle}`);

  const unknownStatus = await page.locator('#spatialBuildingStatus').textContent();
  assert.ok(unknownStatus.includes('Não disponível'), `Must display honest unavailable status, got: ${unknownStatus}`);

  console.log('✅ ALL 14 STEPS PASSED SUCCESSFULLY WITH 100% FACTUAL FIDELITY!');
});
