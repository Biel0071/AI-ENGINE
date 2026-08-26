const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  await page.goto('http://localhost:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin1010');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.click('button[type="submit"]')
  ]);
  
  const status = await page.evaluate(async () => {
    return new Promise(resolve => {
      let interval = setInterval(() => {
        const text = document.getElementById('statusText')?.textContent;
        console.log('STATUS TEXT IS NOW:', text);
        if (text === 'ONLINE' || text === 'DEGRADED') {
          clearInterval(interval);
          resolve(text);
        }
      }, 500);
      setTimeout(() => resolve('TIMEOUT'), 20000);
    });
  });
  console.log('FINAL STATUS:', status);
  
  await browser.close();
})();
