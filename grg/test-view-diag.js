const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4400';
const LOCAL_RESULTS_DIR = path.join(__dirname, 'qa-results', 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const token = fs.readFileSync('.session_token', 'utf8').trim();
  await context.addCookies([
    { name: 'token', value: token, domain: 'localhost', path: '/' },
    { name: 'fenix_session', value: encodeURIComponent(token), domain: 'localhost', path: '/' }
  ]);
  const page = await context.newPage();
  page.on('console', msg => console.log('[Browser]', msg.text()));

  console.log('Navigating to http://localhost:4400/app (stable command view)...');
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);

  // Helper
  async function saveShot(name) {
    const p = path.join(LOCAL_RESULTS_DIR, name);
    await page.screenshot({ path: p });
    console.log(`Saved ${name}`);
  }
  async function settle(ms = 1600) {
    await page.waitForTimeout(ms);
  }

  // Shot 1: Medium
  console.log('Taking shot 1: medium...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.unfollow();
    city.targetCamera.x = -32;
    city.targetCamera.y = 224;
    city.targetCamera.zoom = 1.65;
    city.updateZoomLabel?.();
  });
  await settle();
  await saveShot('test-all-1-medium.png');

  // Shot 2: Close
  console.log('Taking shot 2: close...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.unfollow();
    city.targetCamera.x = -120;
    city.targetCamera.y = 250;
    city.targetCamera.zoom = 2.5;
    city.updateZoomLabel?.();
  });
  await settle();
  await saveShot('test-all-2-close.png');

  // Shot 3: Agent
  console.log('Taking shot 3: agent...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    const targetId = '38515b10-48a4-4c9e-8c07-86d95326ed89';
    city.followAgent(targetId, 4.5);
    const agent = city.agents.get(targetId);
    if (agent?.sprite) {
      city.targetCamera.x = agent.sprite.x;
      city.targetCamera.y = agent.sprite.y - 18;
    } else {
      city.targetCamera.x = 0;
      city.targetCamera.y = 182;
    }
    city.targetCamera.zoom = 4.5;
    city.updateZoomLabel?.();
  });
  await settle();
  await saveShot('test-all-3-agent.png');

  // Shot 4: Building
  console.log('Taking shot 4: building...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.unfollow();
    city.targetCamera.x = 0;
    city.targetCamera.y = 100;
    city.targetCamera.zoom = 3.0;
    city.updateZoomLabel?.();
  });
  await settle();
  await saveShot('test-all-4-building.png');

  // Shot 5: Interior
  console.log('Taking shot 5: interior...');
  await page.evaluate(() => {
    if (window.fenixInterior) {
      window.fenixInterior.enter('dev-loft', 1);
      const b = window.BUILDING_INTERIORS && window.BUILDING_INTERIORS['dev-loft'];
      if (b) {
        window.fenixInterior.showRoomInspector(b.floors[1].rooms[0], b, b.floors[1]);
      }
    }
  });
  await settle(1500);
  await saveShot('test-all-5-interior.png');

  // Exit interior
  await page.evaluate(() => {
    if (window.BuildingInteriorSystem?.exitActive) {
      window.BuildingInteriorSystem.exitActive();
    }
  });
  await settle(1200);

  // Shot 6: Runtime
  console.log('Taking shot 6: runtime...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.unfollow();
    city.targetCamera.x = -48;
    city.targetCamera.y = 250;
    city.targetCamera.zoom = 1.85;
    city.updateZoomLabel?.();
  });
  await settle();
  await saveShot('test-all-6-runtime.png');

  // Shot 7: Photo mode
  console.log('Taking shot 7: photo mode...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.unfollow();
    city.targetCamera.x = -32;
    city.targetCamera.y = 224;
    city.targetCamera.zoom = 1.65;
    city.updateZoomLabel?.();
    city.togglePhotoMode(true);
  });
  await settle(1800);
  await saveShot('test-all-7-photo.png');

  await browser.close();
  console.log('ALL 7 TEST SHOTS COMPLETE!');
})();
