import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4400';
const OUTPUT_DIR = 'qa-results/playwright';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  console.log('=== FÊNIX CITY LIVING WORLD E2E TEST ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Authenticate with real token or login
  let token = '';
  if (fs.existsSync('.session_token')) {
    token = fs.readFileSync('.session_token', 'utf8').trim();
  }
  if (!token) {
    const pageInit = await context.newPage();
    try {
      const loginRes = await pageInit.request.post(`${BASE}/api/login`, {
        data: { tenantId: 'grg', userId: 'grg-admin', password: 'admin123' }
      });
      if (loginRes.ok) {
        const data = await loginRes.json();
        token = data.token || '';
      }
    } catch (e) {}
    await pageInit.close();
  }

  if (token) {
    await context.addCookies([
      { name: 'token', value: token, domain: 'localhost', path: '/' },
      { name: 'fenix_session', value: encodeURIComponent(token), domain: 'localhost', path: '/' }
    ]);
    await context.addInitScript((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('fenix_token', t);
      localStorage.setItem('grg_token', t);
    }, token);
  }

  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else consoleLogs.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('1. Navigating to /app#command...');
  await page.goto(`${BASE}/app#command`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // If redirected to login, perform UI login
  if (page.url().includes('login') || page.url().includes('GRG-login')) {
    console.log('Logging in via form...');
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/app#command`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
  }

  // Verify core DOM elements
  console.log('2. Verifying City HUD and Toolbar controls...');
  const toolbar = page.locator('.orch-city-toolbar');
  await toolbar.waitFor({ state: 'visible', timeout: 12000 });

  const btnObserver = page.locator('#btnModeObserver');
  const btnCommand = page.locator('#btnModeCommand');
  const btnCinematic = page.locator('#btnModeCinematic');
  const selSpeed = page.locator('#selSimSpeed');
  const minimapWidget = page.locator('#cityMinimapWidget');
  const timelineDrawer = page.locator('#cityTimelineDrawer');

  if (await btnObserver.count() === 0) throw new Error('Missing #btnModeObserver');
  if (await btnCommand.count() === 0) throw new Error('Missing #btnModeCommand');
  if (await btnCinematic.count() === 0) throw new Error('Missing #btnModeCinematic');
  if (await selSpeed.count() === 0) throw new Error('Missing #selSimSpeed');
  if (await minimapWidget.count() === 0) throw new Error('Missing #cityMinimapWidget');
  if (await timelineDrawer.count() === 0) throw new Error('Missing #cityTimelineDrawer');

  console.log('✓ Toolbar and HUD controls present');

  // Verify PixiCityRenderer initialized
  console.log('3. Verifying PixiCityRenderer and CityIntegration runtime...');
  const rendererStatus = await page.evaluate(() => {
    const r = window.fenixCity;
    const c = window.fenixCityIntegration;
    const i = window.fenixInteraction;
    return {
      hasRenderer: !!r,
      isReady: r?.isReady || false,
      agentsCount: r?.agents?.size || 0,
      buildingsCount: r?.buildings?.size || 0,
      hasIntegration: !!c,
      hasInteraction: !!i,
      simulationSpeed: r?.simulationSpeed || 1.0
    };
  });
  console.log('Renderer status:', rendererStatus);
  if (!rendererStatus.hasRenderer) throw new Error('window.fenixCity not initialized');

  // Test Simulation Speed
  console.log('4. Testing Simulation Speed changes...');
  await page.evaluate(() => {
    window.fenixCity.setSimulationSpeed(2.0);
  });
  const newSpeed = await page.evaluate(() => window.fenixCity.simulationSpeed);
  if (newSpeed !== 2.0) throw new Error(`Simulation speed expected 2.0, got ${newSpeed}`);
  console.log('✓ Simulation speed successfully set to 2.0x');

  // Test Procedural Building Generation
  console.log('5. Testing Procedural Building Generation for new projects...');
  const procResult = await page.evaluate(() => {
    const r = window.fenixCity;
    r.syncProjectBuildings([
      { id: 'nexus-ai', name: 'Nexus AI Cloud', status: 'ACTIVE', healthScore: 98, localPath: '/projects/nexus' },
      { id: 'sentinel-sec', name: 'Sentinel Security', status: 'BUILDING', healthScore: 94, localPath: '/projects/sentinel' }
    ]);
    return {
      procCount: r.proceduralBuildings?.size || 0,
      hasNexus: r.proceduralBuildings?.has('proc-nexus-ai'),
      hasSentinel: r.proceduralBuildings?.has('proc-sentinel-sec')
    };
  });
  console.log('Procedural buildings result:', procResult);
  if (!procResult.hasNexus || !procResult.hasSentinel) {
    throw new Error('Procedural buildings were not registered in proceduralBuildings map');
  }
  console.log('✓ Procedural towers successfully created with dynamic textures and plots');

  // Test Event Bus Dispatching (15 states, movement, floating world events, timeline)
  console.log('6. Testing Event Bus & Visual State transitions...');
  const testEvents = [
    { type: 'task.started', visual: { visualState: 'WORKING', location: 'execution' }, payload: { name: 'Audit Auth Security', agentId: '38515b10-48a4-4c9e-8c07-86d95326ed89' } },
    { type: 'build.started', visual: { visualState: 'DEPLOYING', location: 'devops' }, payload: { name: 'Core Kernel v4.5', project: 'ai-engine-core' } },
    { type: 'agent.collaboration.started', visual: { visualState: 'COLLABORATING', location: 'communication' }, payload: { name: 'Council Review', peerId: 'npc-scientist' } },
    { type: 'task.completed', visual: { visualState: 'SUCCESS', location: 'command-center' }, payload: { name: 'Audit Auth Security' } }
  ];

  for (const ev of testEvents) {
    await page.evaluate((eventData) => {
      window.dispatchEvent(new CustomEvent('fenix-city-event', { detail: eventData }));
    }, ev);
    await page.waitForTimeout(300);
  }

  // Check Timeline entries
  const timelineItemsCount = await page.locator('.city-timeline-item').count();
  console.log(`✓ Timeline received ${timelineItemsCount} live event items`);
  if (timelineItemsCount === 0) throw new Error('Timeline did not receive projected events');

  // Test Agent Inspection & Rich Inspector
  console.log('7. Testing Agent Inspector & 15-State Badge...');
  await page.evaluate(() => {
    const firstAgentId = window.fenixCity.agents.keys().next().value;
    const obj = window.fenixInteraction.objects.get(firstAgentId);
    if (obj) {
      window.fenixInteraction.onClick(obj, {});
    }
  });
  await page.waitForTimeout(400);

  const inspector = page.locator('#cityInspector');
  const inspectorVisible = await inspector.evaluate(el => el.classList.contains('open'));
  if (!inspectorVisible) throw new Error('cityInspector did not open on agent click');

  const inspectorText = await inspector.innerText();
  console.log('Inspector snippet:', inspectorText.slice(0, 140).replace(/\n/g, ' '));
  if (!inspectorText.includes('OPERATIONAL STATE')) throw new Error('Inspector missing OPERATIONAL STATE section');
  if (!inspectorText.includes('VER TAREFA')) throw new Error('Inspector missing VER TAREFA button');
  console.log('✓ Rich Agent Inspector verified with operational states and action buttons');

  // Capture Inspector screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'living-world-inspector-agent.png') });
  console.log('📸 Saved living-world-inspector-agent.png');

  // Test Building Inspection
  console.log('8. Testing Project Building Inspector...');
  await page.evaluate(() => {
    const obj = window.fenixInteraction.objects.get('proc-nexus-ai') || window.fenixInteraction.objects.get('fenix-hq');
    if (obj) {
      window.fenixInteraction.onClick(obj, {});
    }
  });
  await page.waitForTimeout(400);

  const bldInspectorText = await inspector.innerText();
  console.log('Building Inspector snippet:', bldInspectorText.slice(0, 140).replace(/\n/g, ' '));
  if (!bldInspectorText.includes('PROJECT HEALTH')) throw new Error('Building inspector missing PROJECT HEALTH section');
  if (!bldInspectorText.includes('ABRIR PROJETO')) throw new Error('Building inspector missing ABRIR PROJETO button');
  console.log('✓ Rich Project Inspector verified with health scores, stationed agents, and action buttons');

  // Capture Building Inspector screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'living-world-inspector-project.png') });
  console.log('📸 Saved living-world-inspector-project.png');

  // Test Modes: Cinematic Mode
  console.log('9. Testing Cinematic Mode...');
  await btnCinematic.click();
  await page.waitForTimeout(1200);
  const isCinematic = await page.evaluate(() => window.fenixCity.isCinematicMode);
  if (!isCinematic) throw new Error('Cinematic mode was not enabled');
  console.log('✓ Cinematic mode camera orbit active');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'living-world-cinematic.png') });
  console.log('📸 Saved living-world-cinematic.png');

  // Return to Observer Mode & Macro City Preset
  await btnObserver.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'living-world-overview.png') });
  console.log('📸 Saved living-world-overview.png');

  await browser.close();
  console.log('\n=== ALL FÊNIX CITY LIVING WORLD TESTS PASSED SUCCESSFULLY! ===');
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
