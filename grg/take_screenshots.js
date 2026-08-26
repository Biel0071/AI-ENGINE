const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:4400/app');
  
  console.log('Typing credentials...');
  await page.waitForSelector('#tenantId');
  await page.type('#tenantId', 'grg');
  await page.type('#userId', 'grg-admin');
  await page.type('#password', 'grg-admin');
  await page.click('#loginBtn');
  
  console.log('Waiting for load...');
  await page.waitForTimeout(3000);
  
  console.log('Taking City Level screenshot...');
  await page.screenshot({ path: 'screenshots/01_city_level.png' });
  
  // zoom in
  console.log('Zooming in...');
  await page.evaluate(() => {
    // try to dispatch a wheel event or call setZoom
    state.camera.zoom = 0.8;
    applyCamera();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/02_building_level.png' });
  
  await page.evaluate(() => {
    state.camera.zoom = 1.3;
    applyCamera();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/03_floor_level.png' });
  
  await page.evaluate(() => {
    state.camera.zoom = 2.0;
    applyCamera();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/04_agent_level.png' });
  
  await browser.close();
  console.log('Screenshots captured.');
})();
