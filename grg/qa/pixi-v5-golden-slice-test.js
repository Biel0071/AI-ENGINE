/**
 * FÊNIX CITY V5 — GOLDEN SLICE ART PRODUCTION TEST
 * 
 * Captures the 7 Golden Slice screenshots at 1440x900 validating the V5 Art Production overhaul:
 * 1. v5-golden-city-medium.png: Development District & Central Plaza overview (~1.65 zoom, intentional props, clean nameplates)
 * 2. v5-golden-city-close.png: Close-up on ZapAI CRM Dev Loft, outdoor Café Kiosk, street curbs, crosswalk (~2.5 zoom)
 * 3. v5-golden-agent.png: High-fidelity character silhouette, layered hair, facial expression, outfit, clean nameplate (~4.2 zoom)
 * 4. v5-golden-building.png: Architectural close-up on Fênix HQ landmark (grand stairs, glass lobby, helipad, cast shadow, ~2.8 zoom)
 * 5. v5-golden-interior.png: Floor 2 (Backend & Database) interior with rich workstations, dual monitors, Kanban board, servers, seated agents
 * 6. v5-golden-runtime.png: Live runtime showing operational agents and ambient NPCs circulating in the Development District (~1.85 zoom)
 * 7. v5-golden-city.png: Pure 2.5D Game World (Photo Mode: ZERO HUD, sidebar, headers, breadcrumbs, UUIDs, menus)
 * 
 * Saves to qa-results/playwright/ and mirrors to the brain artifact directory.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4400';
const LOCAL_RESULTS_DIR = path.join(__dirname, '..', 'qa-results', 'playwright');
const ARTIFACT_DIRS = [
  'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\cd95b95c-6f3c-4863-a1c6-254f8c214a04',
  'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\12499c1a-b03b-423c-a3fb-668d5dad77fa',
  'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\cd24efc9-de14-42a8-82d1-5f329505a043'
];

async function run() {
  if (!fs.existsSync(LOCAL_RESULTS_DIR)) fs.mkdirSync(LOCAL_RESULTS_DIR, { recursive: true });
  for (const dir of ARTIFACT_DIRS) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log('=== FÊNIX CITY V5 — GOLDEN SLICE ART PRODUCTION CAPTURE ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Authenticate with session token
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
    const txt = msg.text();
    if (txt.includes('PixiCity') || txt.includes('CityIntegration') || msg.type() === 'error') {
      console.log('[Browser]', txt);
    }
  });

  async function saveShot(filename, locatorOrPage = p) {
    const localPath = path.join(LOCAL_RESULTS_DIR, filename);
    await locatorOrPage.screenshot({ path: localPath });
    for (const dir of ARTIFACT_DIRS) {
      try {
        const dest = path.join(dir, filename);
        fs.copyFileSync(localPath, dest);
      } catch (e) {
        console.warn('Copy to artifact failed:', e.message);
      }
    }
    console.log(`📸 Saved: ${filename} (Local & Artifacts)`);
  }

  async function settleCamera(ms = 1500) {
    await p.waitForTimeout(ms);
  }

  async function ensureCityView() {
    await p.evaluate(() => {
      // Ensure view-city is active and displayed
      document.querySelectorAll('.view').forEach(v => {
        const isCity = (v.id === 'view-city');
        v.classList.toggle('active', isCity);
        v.style.display = isCity ? 'flex' : 'none';
        if (isCity) {
          v.style.width = '100%';
          v.style.height = '100%';
        }
      });
      // Mark nav-item as active
      document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === 'city');
      });
      const host = document.getElementById('cityCanvasHost') || document.getElementById('view-city');
      const city = window.fenixCity;
      if (city && host) {
        city.reparent(host);
        city.resize();
      }
      const legacy = document.getElementById('cityCanvas');
      if (legacy) {
        legacy.style.setProperty('display', 'none', 'important');
        legacy.style.setProperty('opacity', '0', 'important');
      }
    });
    await p.waitForTimeout(300);
  }

  // 2. Navigate to /app#city
  console.log('Navigating to http://localhost:4400/app#city...');
  await p.goto(`${BASE}/app#city`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await p.waitForFunction(() => window.fenixCity && window.fenixCity.isReady, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2000);

  await ensureCityView();

  // -------------------------------------------------------------
  // 1. v5-golden-city-medium.png (Development District & Central Plaza ~1.65)
  // -------------------------------------------------------------
  console.log('\n[1/7] Capturing v5-golden-city-medium.png...');
  await ensureCityView();
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      city.setCamera(-32, 224, 1.65);
    }
  });
  await settleCamera(1600);
  await saveShot('v5-golden-city-medium.png');

  // -------------------------------------------------------------
  // 2. v5-golden-city-close.png (ZapAI CRM Dev Loft & Café Kiosk ~2.5)
  // -------------------------------------------------------------
  console.log('\n[2/7] Capturing v5-golden-city-close.png...');
  await ensureCityView();
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      city.setCamera(-144, 240, 2.5);
    }
  });
  await settleCamera(1600);
  await saveShot('v5-golden-city-close.png');

  // -------------------------------------------------------------
  // 3. v5-golden-agent.png (Close-up of 2.5D RPG Character ~4.4)
  // -------------------------------------------------------------
  console.log('\n[3/7] Capturing v5-golden-agent.png...');
  await ensureCityView();
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      let targetId = '38515b10-48a4-4c9e-8c07-86d95326ed89';
      const agent = city.agents.get(targetId);
      if (agent?.sprite) {
        city.setCamera(agent.sprite.x, agent.sprite.y - 12, 4.4);
      } else {
        city.setCamera(0, 188, 4.4);
      }
    }
  });
  await settleCamera(1600);
  await saveShot('v5-golden-agent.png');

  // -------------------------------------------------------------
  // 4. v5-golden-building.png (Fênix HQ Landmark Exterior with Escadaria ~2.8)
  // -------------------------------------------------------------
  console.log('\n[4/7] Capturing v5-golden-building.png...');
  await ensureCityView();
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      const b = city.buildings?.get('fenix-hq');
      if (b && b.sprite) {
        city.setCamera(b.sprite.x, b.sprite.y - 100, 2.8);
      } else {
        city.setCamera(0, 100, 2.8);
      }
    }
  });
  await settleCamera(1600);
  await saveShot('v5-golden-building.png');

  // -------------------------------------------------------------
  // 5. v5-golden-interior.png (Floor 2: Backend & Database)
  // -------------------------------------------------------------
  console.log('\n[5/7] Capturing v5-golden-interior.png...');
  await ensureCityView();
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
  await p.waitForTimeout(1400);
  await saveShot('v5-golden-interior.png');

  // Exit Interior back to city
  await p.evaluate(() => {
    if (window.BuildingInteriorSystem?.exitActive) {
      window.BuildingInteriorSystem.exitActive();
    }
  });
  await p.waitForTimeout(1200);

  // -------------------------------------------------------------
  // 6. v5-golden-runtime.png (Live Runtime Operating District ~1.85)
  // -------------------------------------------------------------
  console.log('\n[6/7] Capturing v5-golden-runtime.png...');
  await ensureCityView();
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      city.setCamera(-48, 250, 1.85);
    }
  });
  await settleCamera(1600);
  await saveShot('v5-golden-runtime.png');

  // -------------------------------------------------------------
  // 7. v5-golden-city.png (Pure 2.5D Game World, Zero HUD - Photo Mode)
  // -------------------------------------------------------------
  console.log('\n[7/7] Capturing v5-golden-city.png (Photo Mode 1440x900)...');
  await ensureCityView();
  await p.evaluate(() => {
    const city = window.fenixCity;
    if (city) {
      city.unfollow();
      city.setCamera(-32, 224, 1.65);
      city.togglePhotoMode(true);
      const legacy = document.getElementById('cityCanvas');
      if (legacy) {
        legacy.style.setProperty('display', 'none', 'important');
        legacy.style.setProperty('opacity', '0', 'important');
      }
    }
  });
  await settleCamera(2000);
  await saveShot('v5-golden-city.png');

  // Restore HUD
  await p.evaluate(() => {
    if (window.fenixCity) {
      window.fenixCity.togglePhotoMode(false);
    }
  });
  await p.waitForTimeout(600);

  await browser.close();
  console.log('\n=== ALL 7 V5 GOLDEN SLICE SCREENSHOTS CAPTURED AND SAVED! ===');
}

run().catch(err => {
  console.error('Golden Slice Capture Failed:', err);
  process.exit(1);
});
