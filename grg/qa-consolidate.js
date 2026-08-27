const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to FENIX OS...');
  await page.goto('http://127.0.0.1:4400/login.html');
  await page.waitForLoadState('networkidle');
  
  try {
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  } catch (e) { }
  
  await page.goto('http://127.0.0.1:4400/app#ide');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'screenshot_ide_before.png' });
  console.log('Screenshot IDE BEFORE saved.');

  // Type in the IDE cmdForm
  try {
    await page.fill('#prompt', 'Consolidar as coisas aqui', { timeout: 5000 });
    await page.click('#cmdForm button[type="submit"]');
    console.log('Mission submitted in IDE...');
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('Failed to type mission in IDE:', err.message);
  }

  await page.screenshot({ path: 'screenshot_ide_after.png' });
  console.log('Screenshot IDE AFTER saved.');

  // Go to CITY view
  const cityTab = await page.$('button[data-view="city"]');
  if (cityTab) {
    await cityTab.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'screenshot_city_consolidated.png' });
  console.log('Screenshot CITY CONSOLIDATED saved.');

  await browser.close();
})();
