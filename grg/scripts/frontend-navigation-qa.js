/* Real frontend navigation smoke audit.
 * No mocks, no mission submission. Read-only browser QA; auth is supplied only
 * through environment variables and is never persisted by this script.
 * Usage: FENIX_URL=http://host:4400/app node scripts/frontend-navigation-qa.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.FENIX_URL || 'http://127.0.0.1:4400/app';
const outDir = path.resolve(process.env.FENIX_QA_OUT || 'qa-results');
const fastMode = process.argv.includes('--fast');
const actionTimeout = Number(process.env.FENIX_QA_TIMEOUT || (fastMode ? 600 : 1500));
const maxControlsPerScreen = Number(process.env.FENIX_QA_MAX_CONTROLS || (fastMode ? 4 : 8));
const navigationTimeout = Number(process.env.FENIX_QA_NAV_TIMEOUT || 8_000);
const screenManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'qa', 'frontend-screen-manifest.json'), 'utf8'));
const domainByScreen = Object.fromEntries(Object.entries(screenManifest.domains).flatMap(([domain, screens]) => screens.map(screen => [screen, domain])));
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  if (process.env.FENIX_TOKEN) {
    await page.addInitScript((token) => {
      localStorage.setItem('grg_token', token);
      localStorage.setItem('fenix_token', token);
    }, process.env.FENIX_TOKEN);
  }
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', error => consoleErrors.push({ type: 'pageerror', message: error.message }));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ type: 'console', message: msg.text() }); });
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || 'unknown' }));

  const result = { url: baseUrl, startedAt: new Date().toISOString(), navigation: [], controls: [], consoleErrors, failedRequests };
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
  // Some Chromium profiles reject storage writes from an init script when the
  // initial document is redirected. Re-assert the same ephemeral token after
  // the origin is available; no token is written to disk by this process.
  if (process.env.FENIX_TOKEN && new URL(baseUrl).origin === new URL(page.url()).origin) {
    await page.evaluate((token) => {
      localStorage.setItem('grg_token', token);
      localStorage.setItem('fenix_token', token);
    }, process.env.FENIX_TOKEN);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: navigationTimeout });
  }
  await page.waitForTimeout(1200);
  // Standalone Chromium has no in-app session. Login is opt-in through env vars;
  // never embed or guess credentials in the QA script.
  if (await page.locator('#user').count() && process.env.FENIX_USER && process.env.FENIX_PASSWORD) {
    await page.fill('#user', process.env.FENIX_USER);
    await page.fill('#pw', process.env.FENIX_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1200);
    if (page.url().includes('GRG-login')) {
      result.blocked = { component: 'authentication', error: 'login did not reach application', cause: 'credentials rejected or auth unavailable' };
    }
  }
  if ((page.url().includes('GRG-login') || await page.locator('#user').count()) && !(process.env.FENIX_USER && process.env.FENIX_PASSWORD)) {
    result.blocked = { component: 'authentication', error: 'application redirected to GRG-login', cause: 'standalone QA has no authenticated session; credentials are intentionally not embedded in the script' };
    result.title = await page.title();
    result.finishedAt = new Date().toISOString();
    const expectedAuthErrors = consoleErrors.filter(item => /Nenhuma identidade|Backend não respondeu/i.test(item.message)).length;
    result.summary = { navTotal: 0, navPass: 0, controlTotal: 0, controlClicked: 0, controlSkipped: 0, consoleErrors: consoleErrors.length, expectedAuthErrors, fatalConsoleErrors: consoleErrors.length - expectedAuthErrors, failedRequests: failedRequests.length };
    fs.writeFileSync(path.join(outDir, 'frontend-navigation-qa.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result.summary, null, 2));
    console.log(`Evidence: ${path.join(outDir, 'frontend-navigation-qa.json')}`);
    await browser.close();
    process.exitCode = 2;
    return;
  }
  result.title = await page.title();
  result.initial = await page.evaluate(() => ({
    hash: location.hash,
    fenix: typeof window.FENIX,
    runChat: typeof window.runChat,
    views: [...document.querySelectorAll('.view')].map(v => v.id).filter(Boolean),
    nav: [...document.querySelectorAll('[data-view], [data-nav]')].map(b => ({ text: (b.innerText || '').trim(), view: b.dataset.view || b.dataset.nav }))
  }));

  const navs = [...new Set(Object.values(manifestScreens()).flat())];
  for (const view of navs) {
    const button = page.locator(`[data-view="${view}"], [data-nav="${view}"]`).first();
    const item = { view, domain: domainByScreen[view] || 'unmapped', ok: false, before: await page.url() };
    try {
      await button.scrollIntoViewIfNeeded();
      await button.click({ timeout: actionTimeout });
      await page.waitForTimeout(100);
      item.after = await page.url();
      item.visibleViews = await page.locator('.view').evaluateAll(els => els.filter(el => getComputedStyle(el).display !== 'none').map(el => el.id));
      item.activeNav = await page.locator('[data-view].active, [data-nav].active').evaluateAll(els => els.map(el => el.dataset.view || el.dataset.nav));
      item.ok = item.visibleViews.includes(`view-${view}`) || item.activeNav.includes(view);
      await page.screenshot({ path: path.join(outDir, `${String(view).replace(/[^a-z0-9_-]/gi, '_')}.png`), fullPage: false });
      const visibleButtons = page.locator(`.view[style*="display: flex"] button:visible, #view-${view} button:visible`);
      const count = Math.min(await visibleButtons.count(), maxControlsPerScreen);
      for (let i = 0; i < count; i++) {
        const b = visibleButtons.nth(i);
        const label = ((await b.innerText().catch(() => '')) || await b.getAttribute('aria-label').catch(() => '') || '').trim();
        if (!label) continue;
        // Read-only classification: click only controls with no submit/form mutation semantics.
        const meta = await b.evaluate(el => ({ type: el.type || '', form: !!el.form, disabled: el.disabled, text: el.innerText }));
        const control = { view, label, skipped: meta.disabled || meta.form || /salvar|enviar|executar|criar|clonar|commit|deploy|mutat|aplicar/i.test(label) };
        if (!control.skipped) {
          try { await b.click({ timeout: actionTimeout }); await page.waitForTimeout(50); control.clicked = true; }
          catch (e) { control.clicked = false; control.error = e.message; }
        }
        result.controls.push(control);
      }
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(80);
      item.scrollTest = true;
    } catch (e) { item.error = e.message; }
    result.navigation.push(item);
  }
  result.consoleErrors = consoleErrors;
  result.failedRequests = failedRequests;
  result.finishedAt = new Date().toISOString();
  result.summary = {
    navTotal: result.navigation.length,
    navPass: result.navigation.filter(x => x.ok).length,
    controlTotal: result.controls.length,
    controlClicked: result.controls.filter(x => x.clicked).length,
    controlSkipped: result.controls.filter(x => x.skipped).length,
    consoleErrors: consoleErrors.length,
    failedRequests: failedRequests.length,
    domains: Object.fromEntries(Object.keys(screenManifest.domains).map(domain => {
      const items = result.navigation.filter(item => item.domain === domain);
      return [domain, { total: items.length, pass: items.filter(item => item.ok).length }];
    }))
  };
  fs.writeFileSync(path.join(outDir, 'frontend-navigation-qa.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Evidence: ${path.join(outDir, 'frontend-navigation-qa.json')}`);
  await browser.close();
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

function manifestScreens() {
  const file = path.join(__dirname, '..', 'qa', 'frontend-screen-manifest.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).domains;
}
