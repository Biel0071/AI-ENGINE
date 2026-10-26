const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const TARGET_URL = process.env.FENIX_URL || 'http://209.50.241.22:3000/';
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7');
const VIDEO_DIR = path.join(ARTIFACT_DIR, 'videos');

(async () => {
  console.log('================================================================');
  console.log('🎬 RECORDING FULL SYSTEM CAPABILITIES TOUR (PHASE 50)');
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Video Output Dir: ${VIDEO_DIR}`);
  console.log('================================================================');

  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1440, height: 900 }
    }
  });

  const page = await context.newPage();

  console.log('Navigating to Fênix OS...');
  await page.goto(`${TARGET_URL}app`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);

  // 0. AUTHENTICATION
  if (page.url().includes('login') || (await page.$('#loginButton'))) {
    console.log('Authenticating as grg-admin...');
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'grg-admin');
    await page.click('#loginButton');
    await page.waitForTimeout(4000);
  }

  if (!page.url().includes('/app')) {
    await page.goto(`${TARGET_URL}app`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);
  }

  // =========================================================================
  // SCENE 1: COMMAND CENTER & TELEMETRY RIBBON
  // =========================================================================
  console.log('\n🎬 SCENE 1: Command Center & Real-Time Telemetry Ribbon...');
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('command');
  });
  await page.waitForTimeout(4000);

  // Type a brief operator inquiry in chat to demonstrate Fast Lane
  try {
    const chatInput = await page.$('#chatInput, #globalPromptInput, textarea');
    if (chatInput) {
      await chatInput.click();
      await chatInput.fill('Fênix, status geral do ecossistema e agentes autônomos');
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('Chat input interaction skipped:', e.message);
  }
  await page.waitForTimeout(2500);

  // =========================================================================
  // SCENE 2: UNIFIED 3D LIVING CITY & WORKSTATIONS
  // =========================================================================
  console.log('\n🎬 SCENE 2: Unified 3D Living City & Workstations...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('city');
    await new Promise(r => setTimeout(r, 600));

    if (typeof window.fenixSetCityMode === 'function') {
      window.fenixSetCityMode('world3d');
    }

    const world = window.fenixWorld3D;
    if (world) {
      world.resize?.();
      world._resumeAnimationLoop?.();
      // Orbit camera slightly to show warehouse cutaway
      if (world.cameraState) {
        world.cameraState.targetAzimuth = Math.PI / 3.8;
        world.cameraState.targetElevation = 0.52;
        world.cameraState.targetDistance = 46;
      }
    }
  });
  await page.waitForTimeout(4500);

  // Focus on Lead Supervisor Camila
  console.log('Focusing on Supervisor Camila & Workstations...');
  await page.evaluate(() => {
    const world = window.fenixWorld3D;
    if (world && typeof world.focusAgent === 'function') {
      world.focusAgent('agent-camila');
    }
  });
  await page.waitForTimeout(3500);

  // Demonstrate RTS Movement Command on floor
  console.log('Demonstrating RTS Point-and-Click Direct Move Command & Beacon...');
  await page.evaluate(() => {
    const world = window.fenixWorld3D;
    if (world && typeof world.navigateAgent === 'function') {
      // Direct Camila to move towards center aisle
      world.navigateAgent('agent-camila', { x: -3.5, y: 0.1, z: 2.0 });
    }
    // Also trigger inspector docked panel
    const camila = world?.agents?.get?.('agent-camila') || { id: 'agent-camila', name: 'Camila (Supervisor)', role: 'Lead Architect', status: 'PATROLLING' };
    if (typeof window.fenixShowWorldAgentInspector === 'function') {
      window.fenixShowWorldAgentInspector(camila);
    }
  });
  await page.waitForTimeout(5000);

  // =========================================================================
  // SCENE 3: STITCH & MIRO SPATIAL SCREEN FLOW (TELAS & CÓDIGO)
  // =========================================================================
  console.log('\n🎬 SCENE 3: Stitch & Miro Spatial Screen Flow...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('flowgraph');
    await new Promise(r => setTimeout(r, 600));

    if (typeof window.fenixSwitchFlowTab === 'function') {
      window.fenixSwitchFlowTab('screens');
    }
  });
  await page.waitForSelector('.ffg-stitch-screen-card', { timeout: 15000 });
  await page.waitForTimeout(4000);

  // Toggle to Real Code Mode [💻 Código Real]
  console.log('Toggling to Real Code Mode [💻 Código Real]...');
  await page.evaluate(() => {
    const btnCode = document.getElementById('btnDisplayCode');
    if (btnCode) btnCode.click();
  });
  await page.waitForTimeout(4000);

  // Flip an individual card back to screen view to demonstrate hybrid view
  console.log('Flipping individual card back to Screen Mode...');
  await page.evaluate(() => {
    const flipBtn = document.querySelector('.ffg-btn-card-flip');
    if (flipBtn) flipBtn.click();
  });
  await page.waitForTimeout(3000);

  // Switch to Miro Infinite Canvas Mode
  console.log('Switching to Miro Infinite Canvas Tab...');
  await page.evaluate(() => {
    const btnMiro = document.querySelector('[data-flow-tab="miro"]');
    if (btnMiro) btnMiro.click();
  });
  await page.waitForTimeout(4000);

  // Return to Stitch 5-Stage Journey and open HD Screen Preview Modal
  console.log('Opening HD Screen Preview Modal...');
  await page.evaluate(() => {
    const btnStitch = document.querySelector('[data-flow-tab="screens"]');
    if (btnStitch) btnStitch.click();
  });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const zoomBtn = document.querySelector('.ffg-screen-zoom-btn, .ffg-screen-card-badge');
    if (zoomBtn) zoomBtn.click();
  });
  await page.waitForTimeout(3500);

  // Close HD Screen Preview Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.ffg-modal-close-btn, #fenixScreenModalClose');
    if (closeBtn) closeBtn.click();
    else {
      const modal = document.getElementById('fenixScreenPreviewModal');
      if (modal) modal.remove();
    }
  });
  await page.waitForTimeout(2000);

  // =========================================================================
  // SCENE 4: LOVABLE IDE SPLIT STUDIO & REACTIVE COMPONENT PREVIEW
  // =========================================================================
  console.log('\n🎬 SCENE 4: Lovable Split IDE Studio & Reactive Component Preview...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('ide');
    await new Promise(r => setTimeout(r, 800));

    if (typeof window.fenixSetIdeMode === 'function') window.fenixSetIdeMode('split');
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('desktop');

    // Click on a file in explorer
    const file = document.querySelector('.fenix-ide-tree-file, .ide-file-item, .fpt-node-label');
    if (file) file.click();
  });
  await page.waitForTimeout(4500);

  // Demonstrate Device Frame Switching: Tablet (768px)
  console.log('Switching IDE Preview to Tablet Frame (768px)...');
  await page.evaluate(() => {
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('tablet');
  });
  await page.waitForTimeout(3500);

  // Demonstrate Device Frame Switching: Mobile (375px)
  console.log('Switching IDE Preview to Mobile Frame (375px)...');
  await page.evaluate(() => {
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('mobile');
  });
  await page.waitForTimeout(3500);

  // Return to Desktop FHD Frame
  console.log('Returning to Desktop FHD Preview Frame...');
  await page.evaluate(() => {
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('desktop');
  });
  await page.waitForTimeout(3000);

  // =========================================================================
  // SCENE 5: 3D NEURAL CONSTELLATION MEMORY BRAIN
  // =========================================================================
  console.log('\n🎬 SCENE 5: 3D Neural Constellation Memory Brain...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('memory');
    await new Promise(r => setTimeout(r, 800));

    const brain = window.fenixMemoryBrain;
    if (brain) {
      brain.resize?.();
      brain._resumeAnimationLoop?.();
      // Orbit camera around 3D brain
      if (brain.cameraState) {
        brain.cameraState.targetAzimuth = Math.PI / 2.2;
        brain.cameraState.targetDistance = 42;
      }
    }
  });
  await page.waitForTimeout(5000);

  // =========================================================================
  // SCENE 6: RETURN TO COMMAND CENTER & CONCLUDE TOUR
  // =========================================================================
  console.log('\n🎬 SCENE 6: Concluding Tour in Command Center...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('command');
  });
  await page.waitForTimeout(3500);

  // Finish Recording
  console.log('\nClosing browser and finalizing video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the generated webm file
  const videoFiles = fs.readdirSync(VIDEO_DIR)
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ name: f, path: path.join(VIDEO_DIR, f), time: fs.statSync(path.join(VIDEO_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (videoFiles.length > 0) {
    const rawWebm = videoFiles[0].path;
    const finalWebm = path.join(VIDEO_DIR, 'fenix_full_system_tour_phase50.webm');
    const finalMp4 = path.join(VIDEO_DIR, 'fenix_full_system_tour_phase50.mp4');

    fs.copyFileSync(rawWebm, finalWebm);
    console.log(`✅ Recorded Raw WebM Video: ${finalWebm} (${(fs.statSync(finalWebm).size / (1024 * 1024)).toFixed(2)} MB)`);

    console.log('Transcoding to MP4 with FFmpeg for universal playback...');
    try {
      execSync(`ffmpeg -y -i "${finalWebm}" -c:v libx264 -pix_fmt yuv420p -movflags faststart "${finalMp4}"`, { stdio: 'inherit' });
      console.log(`🎉 Transcoded MP4 Video: ${finalMp4} (${(fs.statSync(finalMp4).size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (ffmpegErr) {
      console.warn('⚠️ FFmpeg transcode warning:', ffmpegErr.message);
    }
  } else {
    console.error('❌ No video file recorded.');
  }

  console.log('================================================================');
  console.log('🎉 FULL SYSTEM CAPABILITIES TOUR VIDEO COMPLETE!');
  console.log('================================================================');
})();
