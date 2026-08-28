const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const start = Date.now();
  await page.goto('http://localhost:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pass', 'admin123');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('#fenix-unified-app');
  const domLoaded = Date.now();
  
  // wait for one of the main components to render its data, or wait a bit
  await page.waitForTimeout(2000); // give it time to load data
  const dataLoaded = Date.now();
  
  console.log(JSON.stringify({
    loginToDom: domLoaded - start,
    loginToData: dataLoaded - start,
    totalTime: dataLoaded - start
  }));
  
  await browser.close();
})();
