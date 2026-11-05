const { chromium } = require('playwright');
const path = require('path');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const loginRes = await fetch('http://127.0.0.1:4400/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
    });
    const { token } = await loginRes.json();

    await context.addCookies([
      { name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' },
      { name: 'fenix_token', value: token, domain: '127.0.0.1', path: '/' }
    ]);

    await context.addInitScript((t) => {
      localStorage.setItem('grg_token', t);
      localStorage.setItem('fenix_token', t);
    }, token);

    const page = await context.newPage();

    console.log('Navigating to /app#city...');
    await page.goto('http://127.0.0.1:4400/app#city', { waitUntil: 'commit', timeout: 30000 });

    console.log('Waiting for window.fnxToggleKpiDrawer...');
    await page.waitForFunction(() => typeof window.fnxToggleKpiDrawer === 'function', { timeout: 30000 });
    console.log('window.fnxToggleKpiDrawer is ready!');

    // Call fnxToggleKpiDrawer('agents')
    const opened = await page.evaluate(() => {
      window.fnxToggleKpiDrawer('agents');
      const drawer = document.getElementById('fnxKpiDropdownDrawer');
      return {
        display: drawer ? drawer.style.display : null,
        opacity: drawer ? window.getComputedStyle(drawer).opacity : null,
        title: document.getElementById('fnxKpiDdTitle')?.textContent,
        itemsCount: drawer?.querySelectorAll('.fnx-kpi-item').length
      };
    });
    console.log('Drawer status:', JSON.stringify(opened, null, 2));

    await page.waitForTimeout(500);

    const ARTIFACT_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/5a8b783d-495b-4b26-a497-12249128a581';
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_image4_kpi_drawer.png'), animations: 'disabled', timeout: 10000 });
    console.log('✅ Screenshot successfully captured: verified_image4_kpi_drawer.png');
  } catch (err) {
    console.error('Error during capture:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
