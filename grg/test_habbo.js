const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  
  await page.goto('http://localhost:4400/GRG-login');
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin1010');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.click('button[type="submit"]')
  ]);
  
  await page.evaluate(() => {
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const start = Date.now();
      try {
        const res = await origFetch.apply(this, args);
        console.log('FETCH DONE: ' + args[0] + ' in ' + (Date.now() - start) + 'ms');
        return res;
      } catch (e) {
        throw e;
      }
    };
  });
  
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
