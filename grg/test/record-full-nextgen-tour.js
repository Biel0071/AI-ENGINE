/**
 * Full Next-Gen Fênix OS End-to-End Reality Tour Video Recorder
 * Demonstrates:
 * 1. Command Center Cockpit & Holographic JARVIS Orb (rotating rings & orbiting cards)
 * 2. AI Living City / Fênix Universe (5 Islands, Train, Bridges, Towers, Spire)
 * 3. Continuous Semantic Zoom (Universe -> Island -> Close-Up Agent)
 * 4. Next-Gen Agent Head Pins (Role capsule, name, profit pill, approval badge)
 * 5. Right Sidebar FastLane Chat (resizable 520px/780px, direct agent chat, task delegation)
 * 6. Cognitive Memory Hub & 3D Neural Constellation (rotating 3D particles & O(1) Index)
 * 7. Visual IDE with API Platform (file browser, opening src/app.ts, editing & saving)
 */

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const TARGET_URL = process.env.FENIX_URL || 'http://209.50.241.22:3000/';
const OUTPUT_DIR = path.resolve(__dirname, '../../../scratch/videos');
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7');

(async () => {
  console.log('===========================================================');
  console.log('🎥 FÊNIX NEXT-GEN TOUR: LAUNCHING PLAYWRIGHT RECORDER');
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log('===========================================================');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Authenticate via API to obtain session token
  console.log('\n[AUTH] Authenticating against /api/login...');
  let sessionToken = '';
  try {
    const loginRes = await fetch(`${TARGET_URL.replace(/\/$/, '')}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' })
    }).then(r => r.json());
    sessionToken = loginRes?.token || '';
    console.log(`[AUTH] Session acquired: ${sessionToken ? 'YES (' + sessionToken.slice(0, 8) + '...)' : 'NO'}`);
  } catch (err) {
    console.warn('[AUTH] Direct login fetch failed:', err.message);
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 }
    }
  });

  if (sessionToken) {
    const urlObj = new URL(TARGET_URL);
    await context.addCookies([{
      name: 'fenix_session',
      value: sessionToken,
      domain: urlObj.hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }]);
    await context.addInitScript((tok) => {
      localStorage.setItem('grg_token', tok);
      localStorage.setItem('grg_user', 'GRG Admin');
      localStorage.setItem('grg_remember', '1');
    }, sessionToken);
  }

  const page = await context.newPage();

  try {
    // ── STEP 0: Entry into App ──
    console.log('\n[0/7] Navigating directly to /app#city...');
    await page.goto(`${TARGET_URL.replace(/\/$/, '')}/app#city`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // If redirected to login, handle form submission
    if (page.url().includes('login') || (await page.$('#loginButton'))) {
      console.log('  -> Fallback: Submitting login credentials via UI...');
      await page.fill('#user', 'grg-admin');
      await page.fill('#pw', 'grg-admin');
      await page.click('#loginButton');
      await page.waitForTimeout(3000);
    }

    const currentUrl = page.url();
    console.log(`  -> Current URL: ${currentUrl}`);
    const hasCity = await page.$('#cityCanvas');
    console.log(`  -> City Canvas found: ${!!hasCity}`);

    // ── STEP 1: Command Center & Holographic JARVIS Orb ──
    console.log('\n[1/7] Navigating to Command Center Cockpit (view-command)...');
    await page.evaluate(() => {
      window.showView?.('command');
    });
    await page.waitForTimeout(3500);

    const shot1 = path.join(OUTPUT_DIR, '01_command_center_orb.png');
    await page.screenshot({ path: shot1 });
    console.log(`  📸 Snapshot 1 saved: ${shot1}`);

    // ── STEP 2: Living City / Fênix Universe Overview ──
    console.log('\n[2/7] Navigating to AI Living City / Fênix Universe (view-city)...');
    await page.evaluate(() => {
      window.showView?.('city');
    });
    await page.waitForTimeout(2500);

    console.log('  -> Setting Global Universe Zoom (z: 0.45x)...');
    await page.evaluate(() => {
      if (window.fenixCity?.state?.camera) {
        window.fenixCity.state.camera.zoom = 0.45;
        window.fenixCity.state.targetCamera.zoom = 0.45;
      }
      window.fenixCitySemanticZoom?.('universe');
    });
    await page.waitForTimeout(4000);

    const shot2 = path.join(OUTPUT_DIR, '02_universe_islands.png');
    await page.screenshot({ path: shot2 });
    console.log(`  📸 Snapshot 2 saved: ${shot2}`);

    // ── STEP 3: Semantic Zoom & Agent Head Pins ──
    console.log('\n[3/7] Zooming into Island (z: 1.35x)...');
    await page.evaluate(() => {
      if (window.fenixCity?.state?.camera) {
        window.fenixCity.state.camera.zoom = 1.35;
        window.fenixCity.state.targetCamera.zoom = 1.35;
      }
      window.fenixCitySemanticZoom?.('island');
    });
    await page.waitForTimeout(3000);

    console.log('  -> Zooming Close-Up on Agent (z: 2.80x)...');
    await page.evaluate(() => {
      if (window.fenixCity?.state?.camera) {
        window.fenixCity.state.camera.zoom = 2.80;
        window.fenixCity.state.targetCamera.zoom = 2.80;
      }
      window.fenixCitySemanticZoom?.('agent');
    });
    await page.waitForTimeout(3500);

    const shot3 = path.join(OUTPUT_DIR, '03_agent_closeup_pins.png');
    await page.screenshot({ path: shot3 });
    console.log(`  📸 Snapshot 3 saved: ${shot3}`);

    // ── STEP 4: Right Sidebar FastLane Chat & Sizing ──
    console.log('\n[4/7] Interacting with Agent in Right Sidebar FastLane Chat...');
    try {
      await page.evaluate(() => {
        const agentsList = window.fenixCity?.world?.agents ? Array.from(window.fenixCity.world.agents.values()) : [];
        const ag = agentsList.find(a => (a.id || '').includes('dev') || (a.name || '').includes('Camila') || (a.id || '').includes('camila'))
          || agentsList[0]
          || { id: 'agent-dev-lead', name: 'Dev Lead (Camila)', role: 'DEVELOPER' };

        window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: ag, agentId: ag.id } }));
      });
      await page.waitForTimeout(2000);
    } catch (e4) {
      console.warn('  -> Step 4 event dispatch note:', e4.message);
    }

    console.log('  -> Expanding Right Sidebar to Wide Mode (780px)...');
    await page.evaluate(() => {
      const expandBtn = document.getElementById('fsbExpandBtn');
      if (expandBtn) expandBtn.click();
    });
    await page.waitForTimeout(2000);

    console.log('  -> Sending FastLane Message to Agent...');
    await page.evaluate(() => {
      const input = document.getElementById('fsbChatInput');
      if (input) {
        input.value = 'Relatório de integridade e tarefas do ecossistema';
      }
      const sendBtn = document.getElementById('fsbSendBtn');
      if (sendBtn) sendBtn.click();
    });
    await page.waitForTimeout(3000);

    const shot4 = path.join(OUTPUT_DIR, '04_sidebar_fastlane_chat.png');
    await page.screenshot({ path: shot4 });
    console.log(`  📸 Snapshot 4 saved: ${shot4}`);

    // ── STEP 5: Cognitive Memory Hub & 3D Neural Constellation ──
    console.log('\n[5/7] Navigating to Cognitive Memory Hub (view-memory)...');
    await page.evaluate(() => {
      window.showView?.('memory');
    });
    await page.waitForTimeout(2500);

    console.log('  -> Toggling 3D Neural Constellation (Darwin V5 pattern)...');
    await page.evaluate(() => {
      window.fenixToggle3DNeuralBrain?.();
    });
    await page.waitForTimeout(3500);

    const shot5 = path.join(OUTPUT_DIR, '05_memory_3d_constellation.png');
    await page.screenshot({ path: shot5 });
    console.log(`  📸 Snapshot 5 saved: ${shot5}`);

    // ── STEP 6: Visual IDE & API Platform Project ──
    console.log('\n[6/7] Opening Visual IDE with API Platform (view-ide)...');
    await page.evaluate(() => {
      window.showView?.('ide');
    });
    await page.waitForTimeout(2500);

    console.log('  -> Selecting api-platform in project selector...');
    await page.evaluate(() => {
      const sel = document.getElementById('fenixIdeProject');
      if (sel) {
        sel.value = 'api-platform';
        sel.dispatchEvent(new Event('change'));
      }
    });
    await page.waitForTimeout(3000);

    console.log('  -> Writing code in editor and saving file...');
    await page.evaluate(() => {
      const editor = document.getElementById('fenixIdeCodeEditor');
      if (editor) {
        editor.value = '// FÊNIX OS NEXT-GEN RUNTIME\n// API Platform coupled with BullMQ, Redis, PostgreSQL\nimport { createServer } from "http";\n\nexport const app = createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ status: "ONLINE", universe: "FENIX_OS" }));\n});\n';
        editor.dispatchEvent(new Event('input'));
      }
      const saveBtn = document.getElementById('fenixIdeLiveSave');
      if (saveBtn) saveBtn.click();
    });
    await page.waitForTimeout(2500);

    const shot6 = path.join(OUTPUT_DIR, '06_visual_ide_api_platform.png');
    await page.screenshot({ path: shot6 });
    console.log(`  📸 Snapshot 6 saved: ${shot6}`);

    // ── STEP 7: Return to City Universe Overview ──
    console.log('\n[7/7] Returning to AI Living City Universe View...');
    await page.evaluate(() => {
      window.showView?.('city');
      if (window.fenixCity?.state?.camera) {
        window.fenixCity.state.camera.zoom = 0.45;
        window.fenixCity.state.targetCamera.zoom = 0.45;
      }
      window.fenixCitySemanticZoom?.('universe');
    });
    await page.waitForTimeout(4000);

    console.log('\n✅ Tour demonstration complete! Closing browser and saving video...');
  } catch (err) {
    console.error('❌ Error during tour recording:', err);
  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (videoObj) {
      const rawVideoPath = await videoObj.path();
      console.log(`Raw Video saved to: ${rawVideoPath}`);

      const finalMp4Path = path.join(OUTPUT_DIR, 'fenix-nextgen-tour.mp4');
      console.log(`Converting to MP4: ${finalMp4Path}...`);
      try {
        execSync(`ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p -preset fast "${finalMp4Path}"`, { stdio: 'inherit' });
        console.log(`\n🎉 High-Quality MP4 Tour Video generated successfully:`);
        console.log(`   👉 ${finalMp4Path}`);
        const stat = fs.statSync(finalMp4Path);
        console.log(`   Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
      } catch (convErr) {
        console.warn('FFmpeg conversion warning, using raw video:', convErr.message);
      }
    }

    // Copy MP4 and all 6 snapshots to Artifact Directory
    if (fs.existsSync(ARTIFACT_DIR)) {
      console.log('\n[ARTIFACTS] Syncing video and snapshots to artifact directory...');
      const finalMp4 = path.join(OUTPUT_DIR, 'fenix-nextgen-tour.mp4');
      if (fs.existsSync(finalMp4)) {
        fs.copyFileSync(finalMp4, path.join(ARTIFACT_DIR, 'fenix-nextgen-tour.mp4'));
        console.log('  -> Copied fenix-nextgen-tour.mp4 to artifacts');
      }
      for (let i = 1; i <= 6; i++) {
        const matches = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith(`0${i}_`) && f.endsWith('.png'));
        if (matches.length > 0) {
          fs.copyFileSync(path.join(OUTPUT_DIR, matches[0]), path.join(ARTIFACT_DIR, matches[0]));
          console.log(`  -> Copied ${matches[0]} to artifacts`);
        }
      }
    }
  }
})();
