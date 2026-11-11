const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const ARTIFACTS_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7';

function withServer(fn) {
  return async () => {
    process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
    process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
    process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
    process.env.FENIX_ALLOW_DEV_HEADERS = '0';
    process.env.NODE_ENV = 'test';
    process.env.GRG_LLM = '0';
    const server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    try {
      await fn(base);
    } finally {
      await new Promise((r) => server.close(r));
    }
  };
}

test('LEVEL 23 SUITE: Holographic City Adaptive Dock, Interactions, Entity Popups & 6 Viewports', { timeout: 240_000 }, withServer(async (base) => {
  // 1. Authenticate and obtain session token
  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  assert.equal(loginRes.status, 200, 'Login returns 200');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert.ok(token, 'Session token obtained');

  // Launch Playwright Chromium
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, desc: 'Desktop Full HD' },
    { name: '1600x900', width: 1600, height: 900, desc: 'Desktop Standard' },
    { name: '1366x768', width: 1366, height: 768, desc: 'Laptop' },
    { name: '1024x768', width: 1024, height: 768, desc: 'Tablet Landscape' },
    { name: '768x1024', width: 768, height: 1024, desc: 'Tablet Portrait' },
    { name: '390x844', width: 390, height: 844, desc: 'Mobile iPhone' },
  ];

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Set auth in localStorage before load
    await page.addInitScript(({ t }) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, { t: token });

    await page.goto(`${base}/app#city`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2000);

    // Verify City View
    const cityView = await page.$('#view-city');
    assert.ok(cityView, '#view-city exists in DOM');

    // 1. Verify Unified Contextual Toolbar
    const toolbar = await page.$('#fenixUnifiedCityToolbar');
    assert.ok(toolbar, '#fenixUnifiedCityToolbar must exist');
    const brandText = await page.$eval('.city-brand-tag', el => el.textContent);
    assert.match(brandText, /GRG SPACE/i, 'Brand title in toolbar matches');

    // 2. Verify 4-Panel Adaptive Bottom Dock
    const dock = await page.$('#fenixModularBottomDock');
    assert.ok(dock, '#fenixModularBottomDock exists');
    const hasAdaptiveClass = await page.$eval('#fenixModularBottomDock', el => el.classList.contains('adaptive-dock-v23'));
    assert.ok(hasAdaptiveClass, 'Dock has adaptive-dock-v23 class');

    const p1 = await page.$('#fenixWorldMinimap');
    const p2 = await page.$('#dockWindowAgents');
    const p3 = await page.$('#dockWindowMissions');
    const p4 = await page.$('#dockWindowJobs');
    assert.ok(p1 && p2 && p3 && p4, 'All 4 canonical panels exist in dock');

    // 3. Test Panel Minimize Behavior
    console.log('Testing Panel Minimize...');
    // 2026-11-10: o cabecalho mantem um unico conjunto de controles (− □ ×, .cpc-*);
    // o par duplicado .btn-min/.btn-max do v23 fica oculto porque esmagava o titulo.
    await page.click('#dockWindowAgents .cpc-min-btn');
    await page.waitForTimeout(300);
    const isMin = await page.$eval('#dockWindowAgents', el => el.classList.contains('is-minimized'));
    assert.ok(isMin, 'Panel #dockWindowAgents is minimized to compact pill');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'level23_city_panel_minimized.png') });

    // 4. Test Panel Maximize Behavior
    console.log('Testing Panel Maximize...');
    await page.click('#dockWindowJobs .cpc-max-btn');
    await page.waitForTimeout(300);
    const isMax = await page.$eval('#dockWindowJobs', el => el.classList.contains('is-maximized'));
    assert.ok(isMax, 'Panel #dockWindowJobs is maximized');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'level23_city_panel_maximized.png') });

    // 5. Test Restore Layout
    console.log('Testing Restore Layout...');
    // O painel City Control (onde ficava #btnRestoreDockLayout) foi removido a pedido do
    // dono; a restauracao continua sendo a mesma funcao que o botao chamava.
    await page.evaluate(() => window.fenixResetDockLayout());
    await page.waitForTimeout(300);
    const restoredMin = await page.$eval('#dockWindowAgents', el => el.classList.contains('is-minimized'));
    const restoredMax = await page.$eval('#dockWindowJobs', el => el.classList.contains('is-maximized'));
    assert.equal(restoredMin, false, 'Minimize cleared on layout restore');
    assert.equal(restoredMax, false, 'Maximize cleared on layout restore');

    // 6. Test Contextual Entity Popup (Agent)
    console.log('Testing Entity Modal (Agent)...');
    await page.evaluate(() => {
      window.fenixOpenEntityModal('agent', 'Alex', {
        name: 'Alex',
        role: 'DevOps Specialist',
        status: 'WORKING',
        model: 'qwen2.5:3b (Local Ollama)',
        currentTask: 'Supervisionando cluster e rotas de gateway'
      });
    });
    await page.waitForTimeout(300);
    const modalVisible = await page.$eval('#fenixEntityDetailModal', el => el.style.display !== 'none');
    assert.ok(modalVisible, 'Entity modal is visible on select');
    const modalTitle = await page.$eval('#entityModalTitle', el => el.textContent);
    assert.equal(modalTitle, 'Alex', 'Modal shows agent name');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'level23_city_entity_modal_agent.png') });

    // Test Close on Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const modalClosed = await page.$eval('#fenixEntityDetailModal', el => el.style.display === 'none');
    assert.ok(modalClosed, 'Entity modal closes on Escape key');

    // 7. Test Contextual Entity Popup (Event)
    console.log('Testing Entity Modal (Event)...');
    await page.evaluate(() => {
      window.fenixOpenEntityModal('event', 'deployment.success', {
        type: 'DEPLOY',
        message: 'Deploy dual webroot concluído com sucesso',
        occurredAt: new Date().toISOString()
      });
    });
    await page.waitForTimeout(300);
    const eventModalVisible = await page.$eval('#fenixEntityDetailModal', el => el.style.display !== 'none');
    assert.ok(eventModalVisible, 'Entity modal opens for event');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 8. Test Quality Profile Switcher
    console.log('Testing Quality Profile Switcher...');
    await page.selectOption('#fenixQualitySelect', 'low');
    const lowProfile = await page.evaluate(() => localStorage.getItem('fenix_quality_profile'));
    assert.equal(lowProfile, 'low', 'Quality profile stored as low');
    await page.selectOption('#fenixQualitySelect', 'balanced');
    const balProfile = await page.evaluate(() => localStorage.getItem('fenix_quality_profile'));
    assert.equal(balProfile, 'balanced', 'Quality profile restored to balanced');

    // 9. Multi-Viewport Acceptance Verification (6 Viewports)
    for (const vp of viewports) {
      console.log(`Verifying Viewport: ${vp.name} (${vp.desc})...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(600);

      // Verify Dock visibility and bounds
      const dockBox = await page.$eval('#fenixModularBottomDock', el => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      });
      assert.ok(dockBox.width > 0, `Dock has positive width in ${vp.name}`);
      assert.ok(dockBox.height > 0, `Dock has positive height in ${vp.name}`);

      // Verify no horizontal document overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= vp.width + 10, `No unwanted horizontal page overflow in ${vp.name}`);

      // Screenshot capture
      const shotPath = path.join(ARTIFACTS_DIR, `level23_city_${vp.name}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`   📸 Captured screenshot: ${shotPath}`);
    }

    console.log('🎉 LEVEL 23 PLAYWRIGHT SUITE PASSED 100%!');
  } finally {
    await browser.close();
  }
}));
