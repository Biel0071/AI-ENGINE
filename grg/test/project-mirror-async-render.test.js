const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

test('late runtime response cannot replace the most recently selected project screen', async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(4000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setContent('<div id="pmTitle"></div><div id="pmContent"></div>');
  await page.evaluate(() => {
    window.FENIX_READY = true;
    window.runtimeStatusResolve = null;
    let statusRequests = 0;
    window.FENIX = { api: (url) => {
      if (url === '/api/project-mirror/projects') return Promise.resolve({ projects: [] });
      if (url === '/api/project-mirror') return Promise.resolve({ path: '/fixture', screens: [], files: { total: 1 }, apis: [], services: [], workers: [], queues: [] });
      if (url === '/api/v2/system/status') {
        statusRequests += 1;
        if (statusRequests === 1) return Promise.resolve({ api: { ok: true } });
        return new Promise((resolve) => { window.runtimeStatusResolve = resolve; });
      }
      if (url.startsWith('/api/project-mirror/screen/home')) return Promise.resolve({ screen: { id: 'home', name: 'Home', route: '/', file: 'index.html', sourceFiles: [{ file: 'index.html', line: 1 }], components: [] }, relatedApis: [], projectPath: '/fixture', projectId: 'fixture' });
      if (url.startsWith('/api/project-mirror/source')) return Promise.resolve({ content: '<button id="hero-cta">Open dashboard</button>', bytes: 42, line: 1 });
      return Promise.resolve({});
    } };
  });
  await page.addScriptTag({ path: path.join(__dirname, '..', 'public', 'fenix-visual-ide.js') });
  await page.waitForTimeout(100);
  const init = await page.evaluate(() => ({ title: document.getElementById('pmTitle').textContent, ready: window.FENIX_READY, initialized: document.documentElement.dataset.fenixVisualIdeReady, render: typeof window.renderProjectSection, errors: window.__testErrors }));
  assert.equal(init.title, 'Project Overview', `project mirror did not initialize: ${JSON.stringify({ ...init, pageErrors })}`);
  await page.evaluate(() => window.renderProjectSection('runtime'));
  await page.waitForFunction(() => typeof window.runtimeStatusResolve === 'function');
  await page.evaluate(() => window.showScreenDetail('home'));
  assert.match(await page.locator('#pmContent').innerText(), /Visual Preview/);
  await page.evaluate(() => window.runtimeStatusResolve({ api: { ok: true }, runtime: { jobs: { waiting: 0 } } }));
  await page.waitForTimeout(20);
  assert.match(await page.locator('#pmContent').innerText(), /Visual Preview/);
  assert.doesNotMatch(await page.locator('#pmContent').innerText(), /Job Activity/);
});
