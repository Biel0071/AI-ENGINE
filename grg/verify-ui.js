const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate
  await page.goto('http://localhost:4400');
  await page.waitForTimeout(2000);
  
  // Wait for network/UI
  await page.waitForLoadState('networkidle');
  
  const token = await page.evaluate(() => localStorage.getItem('grg_token'));
  console.log('Token:', token);
  
  // Fill the chat to create a mission
  try {
    await page.fill('#masterPrompt', 'criar missão analisar o projeto');
    await page.click('#masterCmdForm button[type="submit"]');
    await page.waitForTimeout(3000); // give it some time for UI update
  } catch(e) {
    console.log('Could not find chat box or button:', e.message);
  }

  await page.screenshot({ path: 'frontend-test.png', fullPage: true });
  console.log('Screenshot saved to frontend-test.png');
  
  await browser.close();
})();
