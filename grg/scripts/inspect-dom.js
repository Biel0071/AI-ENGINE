const { chromium } = require('playwright');

(async () => {
  const loginRes = await fetch('http://127.0.0.1:4400/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });
  const { token } = await loginRes.json();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addCookies([{ name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  await page.addInitScript(tok => localStorage.setItem('grg_token', tok), token);
  await page.goto('http://127.0.0.1:4400/app#command', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const res = await page.evaluate(() => {
    const sidebars = [...document.querySelectorAll('nav, aside, [class*="sidebar"], [class*="nav"]')].map(el => ({
      tag: el.tagName,
      id: el.id,
      cls: el.className,
      rect: { x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }
    })).filter(x => x.rect.w > 20 && x.rect.h > 100);
    return sidebars;
  });

  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
