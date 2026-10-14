/**
 * FÊNIX CITY V4.5 — ART DIRECTOR VISUAL VALIDATION TEST
 * 
 * Captures 7 high-fidelity screenshots validating the 2.5D Pixel Art RPG overhaul:
 * 1. v45-city-far.png: Overall city layout, roads, districts, density, foliage (zoom ~0.85)
 * 2. v45-city-medium.png: Development District & Central Plaza with fountain, props, agents (zoom ~1.6)
 * 3. v45-city-close.png: Close-up on ZapAI CRM & Master Orchestrator (zoom ~2.4)
 * 4. v45-building.png: Architectural close-up on building exterior (Fênix HQ Cyber Skyscraper)
 * 5. v45-room.png: Interior of Floor 2 (Backend & Database, workstations, parquet, cutaway walls)
 * 6. v45-agent.png: Close-up of 2.5D character silhouette, outfit, hair, animation, clean nameplate
 * 7. v45-photo-mode.png: Pure 2.5D game screenshot without any HUD or UI elements
 * 
 * Saves to qa-results/playwright/ and mirrors to the brain artifact directory.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4400';
const LOCAL_RESULTS_DIR = path.join(__dirname, '..', 'qa-results', 'playwright');
const ARTIFACT_DIR = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\12499c1a-b03b-423c-a3fb-668d5dad77fa';

async function run() {
  if (!fs.existsSync(LOCAL_RESULTS_DIR)) fs.mkdirSync(LOCAL_RESULTS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  console.log('=== FÊNIX CITY V4.5 — ART DIRECTOR SCREENSHOT CAPTURE ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Authenticate with local session token
  const page = await context.newPage();
  let token = '';
  if (fs.existsSync('.session_token')) {
    token = fs.readFileSync('.session_token', 'utf8').trim();
  }
  if (!token) {
    const loginRes = await page.request.post(`${BASE}/api/login`, {
      data: { tenantId: 'grg', userId: 'grg-admin', password: 'admin123' }
    });
    const data = await loginRes.json();
    token = data.token;
  }

  await context.addCookies([
    { name: 'token', value: token, domain: 'localhost', path: '/' },
    { name: 'fenix_session', value: encodeURIComponent(token), domain: 'localhost', path: '/' }
  ]);
  await context.addInitScript((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('fenix_token', t);
    localStorage.setItem('grg_token', t);
  }, token);
  await page.close();

  const p = await context.newPage();
  p.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text());
  });

  // Helper to save screenshot both locally and to artifact directory
  async function saveShot(filename, locatorOrPage = p) {
    const localPath = path.join(LOCAL_RESULTS_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    await locatorOrPage.screenshot({ path: localPath });
    try {
      fs.copyFileSync(localPath, artifactPath);
    } catch (e) {
      console.warn('Copy to artifact failed:', e.message);
    }
    console.log(`📸 Saved: ${filename} (Local & Artifact)`);
  }

  // Helper to let camera ease in
  async function settleCamera(ms = 1200) {
    await p.waitForTimeout(ms);
  }

  // 2. Navigate to /app#city
  console.log('Navigating to http://localhost:4400/app#city...');
  await p.goto(`${BASE}/app#city`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await p.waitForTimeout(3500);

  // Switch to City view if needed
  try {
    const cityBtn = p.locator('.nav-item[data-view="city"]');
    if (await cityBtn.count() > 0) {
      await cityBtn.click();
      await p.waitForTimeout(2000);
    }
  } catch (e) {}

  await p.waitForTimeout(2000);

  // -------------------------------------------------------------
  // 1. v45-city-far.png (Overview / Far Zoom ~0.85)
  // -------------------------------------------------------------
  console.log('\n[1/7] Capturing v45-city-far.png...');
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      city.targetCamera.x = 0;
      city.targetCamera.y = 288;
      city.targetCamera.zoom = 0.82;
      city.updateZoomLabel?.();
    }
  });
  await settleCamera(1500);
  await saveShot('v45-city-far.png');

  // -------------------------------------------------------------
  // 2. v45-city-medium.png (Development District & Central Plaza ~1.6)
  // -------------------------------------------------------------
  console.log('\n[2/7] Capturing v45-city-medium.png...');
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      // Center on Central Plaza fountain (13, 11)
      const tw = 64, th = 32;
      const c = 13, r = 13;
      city.targetCamera.x = (c - r) * (tw / 2);
      city.targetCamera.y = (c + r) * (th / 2);
      city.targetCamera.zoom = 1.6;
      city.updateZoomLabel?.();
    }
  });
  await settleCamera(1500);
  await saveShot('v45-city-medium.png');

  // -------------------------------------------------------------
  // 3. v45-city-close.png (ZapAI CRM & Master Orchestrator ~2.4)
  // -------------------------------------------------------------
  console.log('\n[3/7] Capturing v45-city-close.png...');
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      const b = city.buildings?.get('dev-loft');
      if (b && b.sprite) {
        city.targetCamera.x = b.sprite.x;
        city.targetCamera.y = b.sprite.y - 60;
      } else {
        const c = 14, r = 19;
        city.targetCamera.x = (c - r) * 32;
        city.targetCamera.y = (c + r) * 16 - 60;
      }
      city.targetCamera.zoom = 2.4;
      city.updateZoomLabel?.();
    }
  });
  await settleCamera(1500);
  await saveShot('v45-city-close.png');

  // -------------------------------------------------------------
  // 4. v45-building.png (Fênix HQ Architectural Exterior Close-up)
  // -------------------------------------------------------------
  console.log('\n[4/7] Capturing v45-building.png...');
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      const b = city.buildings?.get('fenix-hq');
      if (b && b.sprite) {
        city.targetCamera.x = b.sprite.x;
        city.targetCamera.y = b.sprite.y - 100;
      } else {
        const c = 10, r = 9;
        city.targetCamera.x = (c - r) * 32;
        city.targetCamera.y = (c + r) * 16 - 100;
      }
      city.targetCamera.zoom = 2.6;
      city.updateZoomLabel?.();
    }
  });
  await settleCamera(1500);
  await saveShot('v45-building.png');

  // -------------------------------------------------------------
  // 5. v45-room.png (Floor 2: Backend & Database, API & Microservices)
  // -------------------------------------------------------------
  console.log('\n[5/7] Capturing v45-room.png...');
  await p.evaluate(() => {
    if (window.fenixInterior) {
      window.fenixInterior.enter('dev-loft', 1);
    }
  });
  await p.waitForTimeout(1000);

  // Inspect the room to show room inspector card and highlights
  await p.evaluate(() => {
    const interior = window.fenixInterior;
    if (interior && window.BUILDING_INTERIORS && window.BUILDING_INTERIORS['dev-loft']) {
      const b = window.BUILDING_INTERIORS['dev-loft'];
      const f = b.floors[1];
      const r = f.rooms[0];
      interior.showRoomInspector(r, b, f);
    }
  });
  await p.waitForTimeout(1200);
  await saveShot('v45-room.png');

  // Exit Interior back to city
  await p.evaluate(() => {
    if (window.BuildingInteriorSystem?.exitActive) {
      window.BuildingInteriorSystem.exitActive();
    }
  });
  await p.waitForTimeout(1200);

  // -------------------------------------------------------------
  // 6. v45-agent.png (Close-up of 2.5D RPG Agent Character)
  // -------------------------------------------------------------
  console.log('\n[6/7] Capturing v45-agent.png...');
  const followResult = await p.evaluate(() => {
    const city = window.fenixCity;
    if (!city || city.agents.size === 0) return false;
    const firstAgentId = city.agents.keys().next().value;
    city.followAgent(firstAgentId);
    city.targetCamera.zoom = 4.5;
    city.updateZoomLabel?.();
    return true;
  });

  if (followResult) {
    await settleCamera(1500);
    await saveShot('v45-agent.png');
  } else {
    console.warn('⚠️ Could not follow agent; taking close-up fallback');
    await saveShot('v45-agent.png');
  }

  // -------------------------------------------------------------
  // 7. v45-photo-mode.png (Pure 2.5D Game World, Zero HUD)
  // -------------------------------------------------------------
  console.log('\n[7/7] Capturing v45-photo-mode.png...');
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      // Center over Central Plaza & Dev Loft
      const c = 12, r = 12;
      city.targetCamera.x = (c - r) * 32;
      city.targetCamera.y = (c + r) * 16;
      city.targetCamera.zoom = 1.7;
      city.updateZoomLabel?.();
      city.togglePhotoMode(true);
    }
  });
  await settleCamera(1500);
  await saveShot('v45-photo-mode.png');

  // Restore HUD
  await p.evaluate(() => {
    if (window.fenixCity) {
      window.fenixCity.togglePhotoMode(false);
    }
  });
  await p.waitForTimeout(500);

  await browser.close();
  console.log('\n=== ALL 7 ART DIRECTOR SCREENSHOTS CAPTURED AND SAVED! ===');
}

run().catch(err => {
  console.error('Art Director Capture Failed:', err);
  process.exit(1);
});
