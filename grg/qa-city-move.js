const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to FENIX OS...');
  await page.goto('http://127.0.0.1:4400/login.html');
  await page.waitForLoadState('networkidle');
  
  // Fill login
  try {
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('No login form found, proceeding...');
  }
  
  await page.goto('http://127.0.0.1:4400/app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot of default tab (CITY)
  await page.screenshot({ path: 'screenshot_city_idle.png' });
  console.log('Screenshot IDLE saved.');

  // Click LIVE DEV tab
  const liveTab = await page.$('button[data-view="live"]');
  if (liveTab) {
    await liveTab.click();
    await page.waitForTimeout(1000);
  }

  // Type mission
  try {
    await page.fill('#masterCommandInput', 'Adicione uma nova animacao de idle na cidade', { timeout: 5000 });
    await page.click('#masterCommandBtn');
    console.log('Mission submitted...');
    await page.waitForTimeout(2000); 
  } catch (err) {
    console.error('Failed to type mission:', err.message);
  }
  
  // Go back to CITY tab to see them moving!
  const cityTab = await page.$('button[data-view="city"]');
  if (cityTab) {
    await cityTab.click();
    await page.waitForTimeout(1000);
  }

  // They should be moving now
  await page.screenshot({ path: 'screenshot_city_moving.png' });
  console.log('Screenshot MOVING saved.');

  // Wait 10s for mission to progress
  await page.waitForTimeout(10000);
  
  await page.screenshot({ path: 'screenshot_city_working.png' });
  console.log('Screenshot WORKING saved.');

  await browser.close();
})();
