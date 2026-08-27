const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('requestfailed', req => console.log('FAILED REQUEST:', req.url(), req.failure().errorText));
  page.on('response', res => console.log('RESPONSE:', res.url(), res.status()));

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
  
  // Type in the IDE cmdForm
  try {
    await page.fill('#prompt', 'Consolidar as coisas aqui', { timeout: 5000 });
    await page.click('#cmdForm button[type="submit"]');
    console.log('Mission submitted in IDE...');
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('Failed to type mission in IDE:', err.message);
  }

  await browser.close();
})();
