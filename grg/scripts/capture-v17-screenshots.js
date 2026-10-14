'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };
const OUT_DIRS = [
  path.resolve(__dirname, '../../qa-results/v17-visual-reality'),
  path.resolve(__dirname, '../public/screenshots/reality/v17')
];

for (const dir of OUT_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, filename) {
  for (const dir of OUT_DIRS) {
    const dest = path.join(dir, filename);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`[Screenshot Saved] -> ${dest}`);
  }
}

async function main() {
  console.log('[V17 Capture] Starting ephemeral server...');
  process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
  process.env.FENIX_ALLOW_DEV_HEADERS = '0';
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';

  const server = await start(0, { operationalActivation: false });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log(`[V17 Capture] Server listening on ${base}`);

  try {
    // Authenticate
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const browser = await chromium.launch({ headless: true });
    
    // 1. Capture Login Screen
    console.log('[V17 Capture] 01_login.png...');
    const loginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const loginPage = await loginContext.newPage();
    await loginPage.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await loginPage.waitForTimeout(500);
    await saveScreenshot(loginPage, '01_login.png');
    await loginContext.close();

    // Setup authenticated desktop context (1920x1080)
    console.log('[V17 Capture] Setting up 1920x1080 context...');
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.addCookies([
      { name: 'fenix_session', value: encodeURIComponent(token), url: base, httpOnly: true, sameSite: 'Lax' }
    ]);
    await context.addInitScript((t) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, token);

    const page = await context.newPage();
    await page.goto(`${base}/app#command`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 02. Command Center (Canonical Proportions)
    console.log('[V17 Capture] 02_command_center_1920.png...');
    await saveScreenshot(page, '02_command_center_1920.png');

    // 03. World 3D Spatial
    console.log('[V17 Capture] 03_world_3d_spatial.png...');
    await page.evaluate(() => {
      if (typeof showView === 'function') showView('city');
    });
    await page.waitForTimeout(2000);
    await saveScreenshot(page, '03_world_3d_spatial.png');

    // 04. Left Sidebar Collapsed (64px)
    console.log('[V17 Capture] 04_sidebar_collapsed_64px.png...');
    await page.evaluate(() => {
      const btn = document.getElementById('sidebarCollapseBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    await saveScreenshot(page, '04_sidebar_collapsed_64px.png');

    // Restore sidebar
    await page.evaluate(() => {
      const btn = document.getElementById('sidebarCollapseBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    // 05. Copilot Compact (64px)
    console.log('[V17 Capture] 05_copilot_compact_64px.png...');
    await page.evaluate(() => {
      const btn = document.getElementById('fsbCompactBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    await saveScreenshot(page, '05_copilot_compact_64px.png');

    // 06. Copilot Expanded (480px)
    console.log('[V17 Capture] 06_copilot_expanded_480px.png...');
    await page.evaluate(() => {
      const btn = document.getElementById('fsbExpandBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    await saveScreenshot(page, '06_copilot_expanded_480px.png');

    // 07. Copilot Collapsed (Full canvas)
    console.log('[V17 Capture] 07_copilot_collapsed_full_canvas.png...');
    await page.evaluate(() => {
      const btn = document.getElementById('fsbCollapseBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    await saveScreenshot(page, '07_copilot_collapsed_full_canvas.png');

    // Restore copilot
    await page.evaluate(() => {
      if (window.fenixCopilot) {
        window.fenixCopilot.setState('default');
      }
    });
    await page.waitForTimeout(500);

    // 08. World Focus Building
    console.log('[V17 Capture] 08_world_focus_building.png...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.focusBuilding('ApiPlatformHeroComplex');
      }
    });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '08_world_focus_building.png');

    // 09. World Floor Cutaway
    console.log('[V17 Capture] 09_world_floor_cutaway.png...');
    await page.evaluate(() => {
      if (window.fenixWorld3D) {
        window.fenixWorld3D.focusFloor(2);
      }
    });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '09_world_floor_cutaway.png');

    // 10. IDE Split Workspace
    console.log('[V17 Capture] 10_ide_split_workspace.png...');
    await page.evaluate(() => {
      if (typeof showView === 'function') showView('ide');
    });
    await page.waitForTimeout(1500);
    await saveScreenshot(page, '10_ide_split_workspace.png');

    // 11. Agents View
    console.log('[V17 Capture] 11_agents_view.png...');
    await page.evaluate(() => {
      if (typeof showView === 'function') showView('agents');
    });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '11_agents_view.png');

    // 12. Operations View
    console.log('[V17 Capture] 12_operations_view.png...');
    await page.evaluate(() => {
      if (typeof showView === 'function') showView('operations');
    });
    await page.waitForTimeout(1000);
    await saveScreenshot(page, '12_operations_view.png');

    await context.close();

    // 13. Responsive Tablet (1024x768)
    console.log('[V17 Capture] 13_responsive_tablet_1024.png...');
    const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    await tabletContext.addCookies([
      { name: 'fenix_session', value: encodeURIComponent(token), url: base, httpOnly: true, sameSite: 'Lax' }
    ]);
    await tabletContext.addInitScript((t) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, token);
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`${base}/app#command`, { waitUntil: 'domcontentloaded' });
    await tabletPage.waitForTimeout(1500);
    await saveScreenshot(tabletPage, '13_responsive_tablet_1024.png');
    await tabletContext.close();

    // 14. Responsive Mobile Drawer (390x844)
    console.log('[V17 Capture] 14_responsive_mobile_drawer_390.png...');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mobileContext.addCookies([
      { name: 'fenix_session', value: encodeURIComponent(token), url: base, httpOnly: true, sameSite: 'Lax' }
    ]);
    await mobileContext.addInitScript((t) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, token);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${base}/app#command`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);
    await saveScreenshot(mobilePage, '14_responsive_mobile_drawer_390.png');
    await mobileContext.close();

    await browser.close();
    console.log('[V17 Capture] All 14 visual screenshots captured successfully!');
  } finally {
    await new Promise((r) => server.close(r));
    console.log('[V17 Capture] Ephemeral server closed.');
  }
}

main().catch((err) => {
  console.error('[V17 Capture] Error:', err);
  process.exit(1);
});
