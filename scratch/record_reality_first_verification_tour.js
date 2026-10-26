const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const TARGET_URL = process.env.FENIX_URL || 'http://209.50.241.22:3000/';
const SCRATCH_VIDEO_DIR = path.resolve(__dirname, 'videos');
const BRAIN_VIDEO_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/a582ccfe-1cdd-4ed7-8383-aac20e932b0b/videos');
const CURRENT_BRAIN_VIDEO_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/c5457d41-7145-4559-a796-7750cb6e475a/videos');

(async () => {
  console.log('================================================================');
  console.log('🎬 RECORDING REALITY-FIRST ENGINEERING & PARITY TOUR');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Scratch Video Dir: ${SCRATCH_VIDEO_DIR}`);
  console.log(`Brain Video Dir: ${BRAIN_VIDEO_DIR}`);
  console.log('================================================================');

  for (const d of [SCRATCH_VIDEO_DIR, BRAIN_VIDEO_DIR, CURRENT_BRAIN_VIDEO_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: SCRATCH_VIDEO_DIR,
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
  // SCENE 1: COMMAND CENTER & FAST LANE REAL-TIME TELEMETRY
  // =========================================================================
  console.log('\n🎬 SCENE 1: Command Center & Real-Time Telemetry Ribbon...');
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('command');
  });
  await page.waitForTimeout(3500);

  // Demonstrate Fast Lane Operator prompt
  try {
    const chatInput = await page.$('#chatInput, #globalPromptInput, textarea');
    if (chatInput) {
      await chatInput.click();
      await chatInput.fill('Fênix, status operacional das missões e agentes autônomos');
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('Chat input skipped:', e.message);
  }
  await page.waitForTimeout(2500);

  // =========================================================================
  // SCENE 2: UNIFIED 3D LIVING CITY & AGENT WORKSTATIONS
  // =========================================================================
  console.log('\n🎬 SCENE 2: Unified 3D Living City & Workstations...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('city');
    await new Promise(r => setTimeout(r, 600));

    if (typeof window.fenixSetCityMode === 'function') {
      window.fenixSetCityMode('world3d');
    }

    const world = window.fenixWorld3D || window.fenixWorldEngine3D;
    if (world) {
      world.resize?.();
      world._resumeAnimationLoop?.();
      if (world.cameraState) {
        world.cameraState.targetAzimuth = Math.PI / 3.8;
        world.cameraState.targetElevation = 0.52;
        world.cameraState.targetDistance = 46;
      }
    }
  });
  await page.waitForTimeout(4000);

  // Focus Supervisor Agent & Demonstrate RTS Navigation
  console.log('Focusing Supervisor Agent & RTS Point-and-Click Movement...');
  await page.evaluate(() => {
    const world = window.fenixWorld3D || window.fenixWorldEngine3D;
    if (world && typeof world.focusAgent === 'function') {
      world.focusAgent('agent-camila');
    }
    if (world && typeof world.navigateAgent === 'function') {
      world.navigateAgent('agent-camila', { x: -3.5, y: 0.1, z: 2.0 });
    }
    const camila = world?.agents?.get?.('agent-camila') || { id: 'agent-camila', name: 'Camila (Supervisor)', role: 'Lead Architect', status: 'PATROLLING' };
    if (typeof window.fenixShowWorldAgentInspector === 'function') {
      window.fenixShowWorldAgentInspector(camila);
    }
  });
  await page.waitForTimeout(4500);

  // =========================================================================
  // SCENE 3: STITCH & MIRO SPATIAL SCREEN FLOW (SCREENS & CODE)
  // =========================================================================
  console.log('\n🎬 SCENE 3: Stitch & Miro Spatial Screen Flow...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('flowgraph');
    await new Promise(r => setTimeout(r, 600));

    if (typeof window.fenixSwitchFlowTab === 'function') {
      window.fenixSwitchFlowTab('screens');
    }
  });
  await page.waitForTimeout(4000);

  // Toggle Real Code Mode [💻 Código Real]
  console.log('Toggling to Real Code Mode [💻 Código Real]...');
  await page.evaluate(() => {
    const btnCode = document.getElementById('btnDisplayCode');
    if (btnCode) btnCode.click();
  });
  await page.waitForTimeout(3000);

  // Flip individual card back to screen view
  console.log('Flipping individual card back to Screen Mode...');
  await page.evaluate(() => {
    const flipBtn = document.querySelector('.ffg-btn-card-flip');
    if (flipBtn) flipBtn.click();
  });
  await page.waitForTimeout(2500);

  // =========================================================================
  // SCENE 4: LOVABLE SPLIT STUDIO & COMPONENT PREVIEW (WITH DIAGNOSE & REVERT)
  // =========================================================================
  console.log('\n🎬 SCENE 4: Lovable Split IDE Studio & Responsive Viewports...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('ide');
    await new Promise(r => setTimeout(r, 800));

    if (typeof window.fenixSetIdeMode === 'function') window.fenixSetIdeMode('split');
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('desktop');

    const file = document.querySelector('.fenix-ide-tree-file, .ide-file-item, .fpt-node-label');
    if (file) file.click();
  });
  await page.waitForTimeout(4000);

  // Demonstrate Device Frame Switching: Tablet & Mobile
  console.log('Switching IDE Preview to Tablet & Mobile Frames...');
  await page.evaluate(() => {
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('tablet');
  });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('mobile');
  });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    if (typeof window.fenixSetIdeViewport === 'function') window.fenixSetIdeViewport('desktop');
  });
  await page.waitForTimeout(2000);

  // Demonstrate Diagnose File Action
  console.log('Demonstrating Diagnosticar Action...');
  await page.evaluate(() => {
    if (typeof window.fenixDiagnoseCurrentFile === 'function') {
      window.fenixDiagnoseCurrentFile();
    }
  });
  await page.waitForTimeout(2500);

  // =========================================================================
  // SCENE 5: 3D NEURAL CONSTELLATION MEMORY BRAIN & ACTIVE MEMORY
  // =========================================================================
  console.log('\n🎬 SCENE 5: 3D Neural Constellation Memory Brain...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('memory');
    await new Promise(r => setTimeout(r, 800));

    const brain = window.fenixMemoryBrain;
    if (brain) {
      brain.resize?.();
      brain._resumeAnimationLoop?.();
      if (brain.cameraState) {
        brain.cameraState.targetAzimuth = Math.PI / 2.2;
        brain.cameraState.targetDistance = 42;
      }
    }
  });
  await page.waitForTimeout(4500);

  // =========================================================================
  // SCENE 6: CONCLUDE IN COMMAND CENTER
  // =========================================================================
  console.log('\n🎬 SCENE 6: Concluding Tour in Command Center...');
  await page.evaluate(async () => {
    if (typeof window.showView === 'function') window.showView('command');
  });
  await page.waitForTimeout(3000);

  // Finish Recording
  console.log('\nClosing browser and finalizing video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the generated webm file
  const videoFiles = fs.readdirSync(SCRATCH_VIDEO_DIR)
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ name: f, path: path.join(SCRATCH_VIDEO_DIR, f), time: fs.statSync(path.join(SCRATCH_VIDEO_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (videoFiles.length > 0) {
    const rawWebm = videoFiles[0].path;
    const finalWebm = path.join(SCRATCH_VIDEO_DIR, 'fenix_reality_first_tour.webm');
    const finalMp4 = path.join(SCRATCH_VIDEO_DIR, 'fenix_reality_first_tour.mp4');

    fs.copyFileSync(rawWebm, finalWebm);
    console.log(`✅ Recorded Raw WebM Video: ${finalWebm} (${(fs.statSync(finalWebm).size / (1024 * 1024)).toFixed(2)} MB)`);

    console.log('Transcoding to MP4 with FFmpeg for universal playback...');
    try {
      execSync(`ffmpeg -y -i "${finalWebm}" -c:v libx264 -pix_fmt yuv420p -movflags faststart "${finalMp4}"`, { stdio: 'inherit' });
      console.log(`🎉 Transcoded MP4 Video: ${finalMp4} (${(fs.statSync(finalMp4).size / (1024 * 1024)).toFixed(2)} MB)`);

      // Copy both webm and mp4 to Brain Video Dir
      fs.copyFileSync(finalWebm, path.join(BRAIN_VIDEO_DIR, 'fenix_reality_first_tour.webm'));
      fs.copyFileSync(finalMp4, path.join(BRAIN_VIDEO_DIR, 'fenix_reality_first_tour.mp4'));
      console.log(`✅ Copied to Brain Artifact Dir: ${BRAIN_VIDEO_DIR}`);

      fs.copyFileSync(finalWebm, path.join(CURRENT_BRAIN_VIDEO_DIR, 'fenix_reality_first_tour.webm'));
      fs.copyFileSync(finalMp4, path.join(CURRENT_BRAIN_VIDEO_DIR, 'fenix_reality_first_tour.mp4'));
      console.log(`✅ Copied to Current Brain Artifact Dir: ${CURRENT_BRAIN_VIDEO_DIR}`);
    } catch (ffmpegErr) {
      console.warn('⚠️ FFmpeg transcode warning:', ffmpegErr.message);
    }
  } else {
    console.error('❌ No video file recorded.');
  }

  console.log('================================================================');
  console.log('🎉 REALITY-FIRST TOUR VIDEO RECORDING COMPLETE!');
  console.log('================================================================');
})();
