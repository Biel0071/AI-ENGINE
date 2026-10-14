const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const token = fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '';
const outDir = 'qa-results/visual-rebuild';
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  console.log('[Visual QA] Launching browser...');
  const browser = await chromium.launch({ headless: true });
  
  // 1. Primary High-Res View (1440x900)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((t) => {
    localStorage.setItem('grg_token', t);
    localStorage.setItem('fenix_token', t);
  }, token);

  const page = await context.newPage();
  console.log('[Visual QA] Navigating to /app#city...');
  await page.goto(`${baseURL}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.waitForFunction(() => typeof showView === 'function' && window.syncCityPlacement, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => {
    if (typeof showView === 'function') showView('city');
    if (window.syncCityPlacement) window.syncCityPlacement('city');
  });
  await page.waitForFunction(() => document.getElementById('view-city')?.classList.contains('active'), { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => (window.fenixCity?.world?.agents?.size || 0) >= 5, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);

  // A. Capture Living Vertical Slice (Normal Mode with HUD & Nameplates)
  await page.screenshot({ path: `${outDir}/vertical_slice_living_1440.png` });
  console.log(`Saved ${outDir}/vertical_slice_living_1440.png`);

  const canvas = page.locator('#cityCanvas');
  if (await canvas.count() > 0 && await canvas.isVisible()) {
    await canvas.screenshot({ path: `${outDir}/vertical_slice_canvas_1440.png` });
    console.log(`Saved ${outDir}/vertical_slice_canvas_1440.png`);
  }

  // B. Toggle Photo Mode (Art Director Gate: NO HUD, NO TEXTS, NO LABELS, PURE GAME WORLD)
  console.log('[Visual QA] Testing Art Director Gate (Photo Mode / No HUD)...');
  await page.evaluate(() => {
    if (window.fenixCity) {
      window.fenixCity.state.photoMode = true;
    }
  });
  await page.waitForTimeout(600);
  await canvas.screenshot({ path: `${outDir}/vertical_slice_art_director_gate_no_hud.png` });
  console.log(`Saved ${outDir}/vertical_slice_art_director_gate_no_hud.png`);

  // Restore Photo Mode
  await page.evaluate(() => {
    if (window.fenixCity) {
      window.fenixCity.state.photoMode = false;
    }
  });
  await page.waitForTimeout(400);

  // C. Test Agent Click & Inspector Modal
  console.log('[Visual QA] Testing Agent Click & Inspector...');
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2 - 20);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${outDir}/vertical_slice_agent_clicked.png` });
    console.log(`Saved ${outDir}/vertical_slice_agent_clicked.png`);
  }

  await context.close();

  // 2. Viewport Matrix: 1920x1080, 1366x768, 1280x720, 390x844 (Mobile)
  const viewports = [
    { name: '1080p', width: 1920, height: 1080 },
    { name: '1366', width: 1366, height: 768 },
    { name: '720p', width: 1280, height: 720 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    console.log(`[Visual QA] Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const vpCtx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await vpCtx.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
    await vpCtx.addInitScript((t) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, token);

    const vpPage = await vpCtx.newPage();
    await vpPage.goto(`${baseURL}/app#city`, { waitUntil: 'domcontentloaded' });
    await vpPage.waitForFunction(() => typeof showView === 'function' && window.syncCityPlacement, { timeout: 10000 }).catch(() => {});
    await vpPage.evaluate(() => {
      if (typeof showView === 'function') showView('city');
      if (window.syncCityPlacement) window.syncCityPlacement('city');
    });
    await vpPage.waitForFunction(() => document.getElementById('view-city')?.classList.contains('active'), { timeout: 10000 }).catch(() => {});
    await vpPage.waitForFunction(() => (window.fenixCity?.world?.agents?.size || 0) >= 5, { timeout: 12000 }).catch(() => {});
    await vpPage.waitForTimeout(600);

    await vpPage.screenshot({ path: `${outDir}/vertical_slice_${vp.name}_${vp.width}x${vp.height}.png` });
    console.log(`Saved ${outDir}/vertical_slice_${vp.name}_${vp.width}x${vp.height}.png`);

    // For Mobile: Test agent inspection bottom-sheet
    if (vp.name === 'mobile') {
      const mobCanvas = vpPage.locator('#cityCanvas');
      const mobBox = await mobCanvas.boundingBox();
      if (mobBox) {
        // Dispatch agent click to trigger bottom sheet
        await vpPage.evaluate(() => {
          const firstAgent = window.fenixCity?.world?.agents?.values()?.next()?.value || { id: 'Developer', name: 'Senior Developer' };
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: firstAgent, agentId: firstAgent.id } }));
        });
        await vpPage.locator('.orch-modal').last().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await vpPage.waitForTimeout(400);
        await vpPage.screenshot({ path: `${outDir}/vertical_slice_mobile_bottom_sheet.png` });
        console.log(`Saved ${outDir}/vertical_slice_mobile_bottom_sheet.png`);
      }
    }

    await vpCtx.close();
  }

  // 3. Command Center Embedded View (Non-Regression Check)
  console.log('[Visual QA] Checking Command Center embedded city view (No Regression)...');
  const ccCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ccCtx.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
  await ccCtx.addInitScript((t) => {
    localStorage.setItem('grg_token', t);
    localStorage.setItem('fenix_token', t);
  }, token);

  const ccPage = await ccCtx.newPage();
  await ccPage.goto(`${baseURL}/app#command`, { waitUntil: 'domcontentloaded' });
  await ccPage.waitForTimeout(1000);
  await ccPage.evaluate(() => {
    if (window.syncCityPlacement) window.syncCityPlacement('command');
  });
  await ccPage.waitForTimeout(1500);
  await ccPage.screenshot({ path: `${outDir}/command_center_embedded_city.png` });
  console.log(`Saved ${outDir}/command_center_embedded_city.png`);
  await ccCtx.close();

  await browser.close();
  console.log('[Visual QA] All visual verification screenshots captured successfully!');
})();
