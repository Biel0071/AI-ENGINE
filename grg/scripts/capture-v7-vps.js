const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/12499c1a-b03b-423c-a3fb-668d5dad77fa';
const VPS_BASE = 'http://209.50.241.22:3000';

async function capture() {
  console.log('Launching browser to capture V7 VPS verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Dashboard View
  console.log('Navigating to', `${VPS_BASE}/app#command`);
  await page.goto(`${VPS_BASE}/app#command`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const dashPath = path.join(ARTIFACTS_DIR, 'v7-vps-dashboard.png');
  await page.screenshot({ path: dashPath });
  console.log('Saved', dashPath);

  // 2. City View
  console.log('Switching to City view...');
  const cityNav = page.locator('[data-nav="city"], [data-view="city"]').first();
  if (await cityNav.count()) {
    await cityNav.click();
    await page.waitForTimeout(3000);
  }
  const cityPath = path.join(ARTIFACTS_DIR, 'v7-vps-city.png');
  await page.screenshot({ path: cityPath });
  console.log('Saved', cityPath);

  // 3. Projects View
  console.log('Switching to Projects view...');
  const projNav = page.locator('[data-nav="projects"], [data-view="projects"]').first();
  if (await projNav.count()) {
    await projNav.click();
    await page.waitForTimeout(2000);
  }
  const projPath = path.join(ARTIFACTS_DIR, 'v7-vps-projects.png');
  await page.screenshot({ path: projPath });
  console.log('Saved', projPath);

  await browser.close();
  console.log('All V7 Playwright captures completed successfully!');
}

capture().catch(err => {
  console.error('CAPTURE ERROR:', err);
  process.exit(1);
});
