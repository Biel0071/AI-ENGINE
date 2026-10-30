'use strict';

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const TARGET_URL = 'http://209.50.241.22:3000/';
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7');
const VIDEO_DIR = path.join(__dirname, 'videos_living_world_v4');

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

(async () => {
  console.log('===========================================================');
  console.log('🎥 CAPTURING LIVING WORLD V4 PROOFS & VIDEO ON PRODUCTION VPS');
  console.log(`Target: ${TARGET_URL}`);
  console.log('===========================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  console.log('1. Navigating to production app...');
  await page.goto(`${TARGET_URL}app`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(4000);

  // Handle Login if needed
  if (page.url().includes('login') || (await page.$('#loginButton'))) {
    console.log('Logging in...');
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'grg-admin');
    await page.click('#loginButton');
    await page.waitForTimeout(4000);
  }

  // Navigate to #city view
  console.log('2. Navigating to City View...');
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
    if (typeof window.fenixSetCityMode === 'function') window.fenixSetCityMode('world3d');
  });

  // Wait for 3D world WebGL compile & initial stabilization
  await page.waitForTimeout(6000);

  // 1. Proof: Full City-Wide View (Cyber-Obsidian Atmosphere, Golden Phoenix, Marina, Modern Tech Architecture)
  console.log('3. Capturing proof_v4_city_wide_cyber_obsidian.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && engine.cameraState) {
      engine.cameraState.targetDistance = 115;
      engine.cameraState.targetAzimuth = 0.785; // 45 degrees
      engine.cameraState.targetElevation = 0.55;
      engine.cameraState.targetLookAt.set(0, 0, 0);
    }
  });
  await page.waitForTimeout(3500);

  const shot1 = path.join(ARTIFACT_DIR, 'proof_v4_city_wide_cyber_obsidian.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('   Saved:', shot1);

  // 2. Proof: Marina, Boardwalk & Golden Phoenix Monument Focus
  console.log('4. Capturing proof_v4_marina_and_central_plaza.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && engine.cameraState) {
      engine.cameraState.targetDistance = 65;
      engine.cameraState.targetAzimuth = 1.15;
      engine.cameraState.targetElevation = 0.45;
      engine.cameraState.targetLookAt.set(32, 0, 15);
    }
  });
  await page.waitForTimeout(3500);

  const shot2 = path.join(ARTIFACT_DIR, 'proof_v4_marina_and_central_plaza.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('   Saved:', shot2);

  // 3. Proof: API Platform Exterior Hero Tower & Boulevard Traffic
  console.log('5. Capturing proof_v4_api_platform_exterior.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && engine.cameraState) {
      engine.cameraState.targetDistance = 42;
      engine.cameraState.targetAzimuth = 0.85;
      engine.cameraState.targetElevation = 0.42;
      engine.cameraState.targetLookAt.set(-18, 6.0, 2);
    }
  });
  await page.waitForTimeout(3500);

  const shot3 = path.join(ARTIFACT_DIR, 'proof_v4_api_platform_exterior.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('   Saved:', shot3);

  // 4. Proof: Interior Cutaway with Left Elevator, Teleport Portal Pad & Workstations
  console.log('6. Capturing proof_v4_interior_cutaway_teleport_portal.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') {
        engine.focusFloor(2); // Keep all 3 floors 0, 1, 2 visible
      }
      if (engine.apiRoofGroup) engine.apiRoofGroup.visible = false;
      const t = engine.cameraState.targetLookAt;
      t.set(-15, 5.0, 2);
      engine.cameraState.targetDistance = 16.5;
      engine.cameraState.targetAzimuth = 1.30;
      engine.cameraState.targetElevation = 0.28;
    }
  });
  await page.waitForTimeout(4000);

  const shot4 = path.join(ARTIFACT_DIR, 'proof_v4_interior_cutaway_teleport_portal.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log('   Saved:', shot4);

  // 5. Living Tour Video Walkthrough: Transition between floors and city viewpoints
  console.log('7. Recording Living World Tour transitions...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.focusFloor === 'function') {
      engine.focusFloor(1); // Floor 1 Mezzanine
    }
  });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.focusFloor === 'function') {
      engine.focusFloor(2); // Floor 2 Data Center & Analytics
    }
  });
  await page.waitForTimeout(3000);

  // Return to full city view and orbit smoothly
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.focusFloor === 'function') {
      engine.focusFloor(null);
    }
    if (engine && engine.cameraState) {
      engine.cameraState.targetDistance = 95;
      engine.cameraState.targetAzimuth = 0.0;
      engine.cameraState.targetElevation = 0.48;
      engine.cameraState.targetLookAt.set(0, 0, 0);
    }
  });
  await page.waitForTimeout(4000);

  // Slow orbit around the Phoenix monument and marina
  for (let step = 0; step < 6; step++) {
    await page.evaluate((s) => {
      const engine = window.fenixWorld3D;
      if (engine && engine.cameraState) {
        engine.cameraState.targetAzimuth += 0.35;
      }
    }, step);
    await page.waitForTimeout(1000);
  }

  console.log('8. Finalizing video recording...');
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const recordedPath = await video.path();
    console.log('Video recorded at:', recordedPath);
    const destVideo = path.join(ARTIFACT_DIR, 'video_living_world_v4_tour.webm');
    fs.copyFileSync(recordedPath, destVideo);
    console.log('✅ Video copied to artifact directory:', destVideo);
  }

  console.log('===========================================================');
  console.log('🎉 ALL LIVING WORLD V4 VISUAL EVIDENCE CAPTURED SUCCESSFULLY!');
  console.log('===========================================================');
})();
