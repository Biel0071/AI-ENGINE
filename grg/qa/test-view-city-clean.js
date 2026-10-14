const { chromium } = require('playwright');
const fs = require('fs');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const token = fs.readFileSync('.session_token', 'utf8').trim();
  await page.context().addCookies([
    { name: 'token', value: token, domain: 'localhost', path: '/' },
    { name: 'fenix_session', value: encodeURIComponent(token), domain: 'localhost', path: '/' }
  ]);
  await page.goto('http://localhost:4400/app#city', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    // Deactivate command view, activate city view
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
    });
    const viewCity = document.getElementById('view-city');
    if (viewCity) {
      viewCity.classList.add('active');
      viewCity.style.display = 'flex';
      viewCity.style.width = '100%';
      viewCity.style.height = '100%';
    }
    const host = document.getElementById('cityCanvasHost') || viewCity;
    const city = window.fenixCity;
    if (city && host) {
      city.reparent(host);
      city.setCamera(-32, 224, 1.65);
      city.resize();
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa-results/playwright/test-view-city-clean.png' });
  console.log('Saved test-view-city-clean.png!');
  await browser.close();
}
test().catch(console.error);
