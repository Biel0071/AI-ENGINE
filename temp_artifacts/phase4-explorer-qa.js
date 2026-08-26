const { chromium } = require('playwright');

(async () => {
  const base = 'http://127.0.0.1:4400';
  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' })
  });
  const auth = await login.json();
  const token = auth.token || auth.accessToken || auth.access_token;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(({ tokenValue }) => {
    localStorage.setItem('grg_token', tokenValue);
    localStorage.setItem('grg_user', 'grg-admin');
  }, { tokenValue: token });
  const page = await context.newPage();
  await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#openDevIdeBtn', { timeout: 30000 });
  await page.click('#openDevIdeBtn');
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const pathInput = document.getElementById('fsPath');
    if (pathInput && !pathInput.value) pathInput.value = 'C:/projetos/ai-engine-core/ai-engine';
    if (window.loadFs) await window.loadFs(pathInput?.value || 'C:/projetos/ai-engine-core/ai-engine');
  });
  await page.waitForSelector('#fsBreadcrumb', { timeout: 20000 });
  const evidence = await page.evaluate(() => ({
    breadcrumb: Array.from(document.querySelectorAll('#fsBreadcrumb button')).map((el) => el.textContent.trim()),
    groups: Array.from(document.querySelectorAll('.fs-group-heading')).map((el) => el.textContent.trim()),
    items: document.querySelectorAll('.fs-item').length
  }));
  if (!evidence.breadcrumb.length) throw new Error('Explorer breadcrumb missing');
  if (!evidence.groups.length && evidence.items > 18) throw new Error('Explorer grouping missing for large directory');
  await browser.close();
  console.log(JSON.stringify({ ok: true, evidence }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
