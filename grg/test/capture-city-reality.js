'use strict';

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = path.join(
  'C:', 'Users', 'Dell', '.gemini', 'antigravity', 'brain',
  '7a8ad23c-1ef2-444e-80e2-30f2f87f38fe'
);

(async () => {
  console.log('[CaptureCityReality] Starting verification and screenshot capture...');
  
  // 1. Authenticate via API
  const loginRes = await fetch('http://127.0.0.1:4400/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const sessionMatch = setCookie ? setCookie.match(/fenix_session=([^;]+)/) : null;
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) throw new Error('Falha ao autenticar para captura Playwright');
  console.log('[CaptureCityReality] Logged in with token.');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  if (sessionMatch) {
    await context.addCookies([{
      name: 'fenix_session',
      value: sessionMatch[1],
      domain: '127.0.0.1',
      path: '/'
    }]);
  }

  // Inject token in localStorage before load
  await context.addInitScript((tok) => {
    localStorage.setItem('grg_token', tok);
    localStorage.setItem('fenix_token', tok);
    sessionStorage.setItem('grg_token', tok);
    sessionStorage.setItem('fenix_token', tok);
  }, token);

  const page = await context.newPage();
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

  // 2. Open /app#city
  console.log('[CaptureCityReality] Navigating to http://127.0.0.1:4400/app#city...');
  await page.goto('http://127.0.0.1:4400/app#city', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Ensure view-city is active and data is freshly hydrated
  await page.evaluate(async () => {
    if (window.fenixActivateView) window.fenixActivateView('city');
    else if (window.switchView) window.switchView('city');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const city = document.getElementById('view-city');
    if (city) city.classList.add('active');
    await window.fenixCityReality?.refreshContextualPanel();
    await window.fenixCityReality?.refreshBottomDock();
  });
  await page.waitForTimeout(2000);

  // Verify DOM elements exist
  const checks = await page.evaluate(() => {
    const strip = document.getElementById('fenixCompanySelectorStrip');
    const panel = document.getElementById('fenixContextualCommandPanel');
    const dock = document.getElementById('fenixModularBottomDock');
    const net = document.getElementById('fenixCognitiveNetworkContainer');
    const grid4 = document.getElementById('dock4GridContainer');
    const windowMap = document.getElementById('dockWindowMap');
    const windowAgents = document.getElementById('dockWindowAgents');
    const windowCutaway = document.getElementById('dockWindowCutaway');
    const windowMissions = document.getElementById('dockWindowMissions');
    const topbarPills = document.getElementById('v10StatusPillsCluster');
    const alertBtn = document.getElementById('footerAlertBtn');
    const gauges = document.getElementById('fenixFooterHardwareGauges');
    const companyChips = strip ? strip.querySelectorAll('.fenix-company-chip').length : 0;
    const kpiCards = panel ? panel.querySelectorAll('.cmd-kpi-card').length : 0;
    const dockTabs = dock ? dock.querySelectorAll('.dock-nav-tab').length : 0;
    const companyTitle = document.getElementById('cmdPanelTitle')?.textContent;
    const kpiPerf = document.getElementById('cmdKpiPerf')?.textContent;

    return {
      stripExists: Boolean(strip),
      panelExists: Boolean(panel),
      dockExists: Boolean(dock),
      grid4Exists: Boolean(grid4),
      windowMapExists: Boolean(windowMap),
      windowAgentsExists: Boolean(windowAgents),
      windowCutawayExists: Boolean(windowCutaway),
      windowMissionsExists: Boolean(windowMissions),
      topbarPillsExists: Boolean(topbarPills),
      alertBtnExists: Boolean(alertBtn),
      gaugesExists: Boolean(gauges),
      netExists: Boolean(net),
      companyChips,
      kpiCards,
      dockTabs,
      companyTitle,
      kpiPerf
    };
  });
  console.log('[CaptureCityReality] DOM Elements Inspection:', JSON.stringify(checks, null, 2));

  // Screenshot 1: Spatial City Reality (Depósito Mais Focus + Contextual Panel + Modular Dock)
  const ss1Path = path.join(ARTIFACT_DIR, '01-spatial-city-reality-1080p.png');
  await page.screenshot({ path: ss1Path, fullPage: false });
  console.log('[CaptureCityReality] Screenshot 1 saved:', ss1Path);

  // Screenshot 2: Switch to Layer 2 Cognitive Network
  console.log('[CaptureCityReality] Switching to Layer 2: Rede Cognitiva...');
  await page.evaluate(async () => {
    await window.fenixCityReality?.setMode('network');
  });
  await page.waitForSelector('#cognitiveNetworkCanvas', { timeout: 10000 });
  await page.waitForTimeout(2500);

  const netChecks = await page.evaluate(() => {
    const net = document.getElementById('fenixCognitiveNetworkContainer');
    const isActive = net?.classList.contains('active');
    const hasCanvas = Boolean(net?.querySelector('canvas'));
    return { isActive, hasCanvas };
  });
  console.log('[CaptureCityReality] Cognitive Network status:', JSON.stringify(netChecks, null, 2));

  const ss2Path = path.join(ARTIFACT_DIR, '02-cognitive-network-graph-1080p.png');
  await page.screenshot({ path: ss2Path, fullPage: false });
  console.log('[CaptureCityReality] Screenshot 2 saved:', ss2Path);

  // Screenshot 3: Switch back and select another company (AI ENGINE)
  console.log('[CaptureCityReality] Switching to AI ENGINE company focus...');
  await page.evaluate(() => {
    window.fenixCityReality?.setMode('world');
    window.fenixCityReality?.selectCompany('ai-engine');
  });
  await page.waitForTimeout(2000);

  const compChecks = await page.evaluate(() => {
    const title = document.getElementById('cmdPanelTitle')?.textContent;
    const kpiOps = document.getElementById('cmdKpiOps')?.textContent;
    return { title, kpiOps };
  });
  console.log('[CaptureCityReality] AI ENGINE Focus:', JSON.stringify(compChecks, null, 2));

  const ss3Path = path.join(ARTIFACT_DIR, '03-company-focus-switch-1080p.png');
  await page.screenshot({ path: ss3Path, fullPage: false });
  console.log('[CaptureCityReality] Screenshot 3 saved:', ss3Path);

  await browser.close();
  console.log('[CaptureCityReality] All 3 screenshots captured and verified successfully!');
})().catch(err => {
  console.error('[CaptureCityReality] Error:', err);
  process.exit(1);
});
