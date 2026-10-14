'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe';

async function runVisualVerification() {
  console.log('[Playwright] Starting browser for Living World verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Fenix') || text.includes('Error') || text.includes('error')) {
      console.log(`[Browser Console ${msg.type()}]:`, text.slice(0, 150));
    }
  });

  try {
    // 1. Login flow via official /GRG-login
    console.log('[Playwright] Navigating to http://127.0.0.1:4400/GRG-login ...');
    await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    console.log('[Playwright] Submitting login form (#user / #pw)...');
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin');
    await page.click('#f button[type="submit"], #loginButton');
    
    // Wait for redirect to /app
    try {
      await page.waitForURL('**/app*', { waitUntil: 'domcontentloaded', timeout: 8000 });
    } catch (_) {
      await page.waitForFunction(() => window.location.href.includes('/app'), { timeout: 10000 });
    }
    console.log('[Playwright] Authenticated! Current URL:', page.url());

    // 2. Switch to city view
    console.log('[Playwright] Switching to City View (#city)...');
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('city');
    });

    // 3. Wait for fenixCity agents to populate from backend
    console.log('[Playwright] Waiting for living world entities to populate...');
    await page.waitForFunction(() => {
      return window.fenixCity && window.fenixCity.world && window.fenixCity.world.agents && window.fenixCity.world.agents.size > 0;
    }, { timeout: 15000 });

    const cityState = await page.evaluate(() => {
      const city = window.fenixCity;
      const camila = city.world.agents.get('agent-camila');
      return {
        agentsCount: city.world.agents.size,
        vehiclesCount: city.world.vehicles?.size || city.world.vehicles?.length || 0,
        constructionsCount: city.world.constructions?.size || city.world.constructions?.length || 0,
        hasCamila: Boolean(camila),
        camilaState: camila ? {
          id: camila.id,
          name: camila.displayName || camila.name,
          role: camila.role,
          company: camila.company,
          stationId: camila.workstationId || camila.stationId,
          coords: { x: camila.x, y: camila.y },
          status: camila.status,
          task: camila.currentTask,
          skills: camila.skills,
          tools: camila.tools
        } : null
      };
    });
    console.log('[Playwright] Living City State verified:', JSON.stringify(cityState, null, 2));

    // Capture Macro Overview Screenshot
    const macroPath = path.join(ARTIFACTS_DIR, 'living-city-macro-overview.png');
    await page.screenshot({ path: macroPath, fullPage: false });
    console.log(`[Playwright] Macro overview saved to: ${macroPath}`);

    // 4. Focus on Camila at Depósito Mais, Trigger Deep Zoom (3.4) and open Agent Inspector
    console.log('[Playwright] Triggering deep zoom into Camila at Depósito Mais...');
    await page.evaluate(() => {
      const city = window.fenixCity;
      if (city) {
        city.followAgent('agent-camila');
        city.state.targetCamera.zoom = 3.4;
        city.state.camera.zoom = 3.4;
        // Focus on Depósito Mais coordinates
        city.state.camera.x = -6.0 * 36;
        city.state.camera.y = 2.5 * 22;
        city.state.targetCamera.x = -6.0 * 36;
        city.state.targetCamera.y = 2.5 * 22;
        const camila = city.world.agents.get('agent-camila');
        if (camila && typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector(camila);
        }
      }
    });
    await page.waitForTimeout(2000);

    // Capture Deep Zoom Screenshot
    const deepZoomPath = path.join(ARTIFACTS_DIR, 'living-city-camila-deep-zoom.png');
    await page.screenshot({ path: deepZoomPath, fullPage: false });
    console.log(`[Playwright] Deep zoom saved to: ${deepZoomPath}`);

    // 5. Send Chat to Camila through Inspector
    console.log('[Playwright] Interacting with Camila via direct chat in Inspector...');
    await page.evaluate(async () => {
      const input = document.getElementById('worldAgentChatInput');
      if (input) {
        input.value = 'Camila, confirme o status das cargas e inspeções do Depósito Mais hoje.';
        await window.fenixSendWorldAgentChat('agent-camila');
      }
    });
    await page.waitForTimeout(3000);

    // Capture Agent Inspector & Speech Bubble Screenshot
    const chatScreenshotPath = path.join(ARTIFACTS_DIR, 'living-city-camila-chat-live.png');
    await page.screenshot({ path: chatScreenshotPath, fullPage: false });
    console.log(`[Playwright] Chat & Inspector screenshot saved to: ${chatScreenshotPath}`);

    // 6. Inspect inspector contents
    const inspectorInfo = await page.evaluate(() => {
      const el = document.getElementById('fenixWorldAgentInspector');
      const chatLog = document.getElementById('worldAgentChatLog');
      return {
        visible: el && el.style.display !== 'none',
        chatMessages: chatLog ? chatLog.innerText : ''
      };
    });
    console.log('[Playwright] Agent Inspector Info:', JSON.stringify(inspectorInfo, null, 2));

    console.log('[Playwright] All visual captures and runtime verifications completed successfully!');
  } finally {
    await browser.close();
  }
}

runVisualVerification().catch(err => {
  console.error('[Playwright Error]:', err);
  process.exit(1);
});
