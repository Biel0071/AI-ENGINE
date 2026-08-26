const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];

  page.on('console', msg => {
    if (msg.type() === 'error') logs.push(`[ERROR] ${msg.text()}`);
    else logs.push(`[LOG] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    logs.push(`[EXCEPTION] ${err.message}`);
  });

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
  await page.waitForTimeout(2000);

  // Click LIVE DEV tab
  const liveTab = await page.$('button[data-view="live"]');
  if (liveTab) {
    await liveTab.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'screenshot_live_start.png' });

  // Type mission
  try {
    await page.fill('#masterCommandInput', 'Adicione // Melhoria Segura Fenix 2.0 no começo do arquivo', { timeout: 5000 });
    await page.click('#masterCommandBtn');
    console.log('Waiting for mission to process (10s)...');
    await page.waitForTimeout(10000); // give time to answer
    await page.screenshot({ path: 'screenshot_live.png' });
  } catch (err) {
    console.error('Failed to type mission:', err.message);
  }

  console.log('Console Logs:');
  logs.forEach(l => console.log(l));

  const title = await page.title();
  console.log('Title:', title);

  await browser.close();
  console.log('QA script finished');
})();
