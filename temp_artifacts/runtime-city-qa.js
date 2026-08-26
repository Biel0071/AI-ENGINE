const { chromium } = require('@playwright/test');

(async () => {
  const login = await fetch('http://127.0.0.1:4400/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' })
  }).then((r) => r.json());

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`));

  await page.addInitScript((token) => localStorage.setItem('grg_token', token), login.token);
  await page.goto('http://127.0.0.1:4400/app', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.city-node-core', { timeout: 10000 });

  const initial = await page.evaluate(() => ({
    title: document.querySelector('#view-city h1')?.textContent,
    cityActive: document.querySelector('#view-city')?.classList.contains('active'),
    nodes: document.querySelectorAll('.city-node').length,
    agents: document.querySelectorAll('.agent-avatar').length,
    noAgents: !document.querySelector('#agentEmptyState')?.hidden,
    jobs: document.querySelectorAll('.job-dag-row').length,
    events: document.querySelectorAll('.event-row').length,
    ws: document.querySelector('#wsStatus')?.textContent,
    canvas: [
      document.querySelector('#runtimeCityCanvas')?.width || 0,
      document.querySelector('#runtimeCityCanvas')?.height || 0
    ]
  }));

  await page.click('.city-node-core');
  const coreOpen = await page.evaluate(() => document.querySelector('#runtimeInspector')?.open && document.querySelector('#runtimeInspectorTitle')?.textContent);
  await page.click('#runtimeInspectorClose');
  await page.click('[data-city-panel="skills"]');
  const skillsOpen = await page.evaluate(() => document.querySelector('#runtimeInspector')?.open && document.querySelector('#runtimeInspectorTitle')?.textContent);
  await page.click('#runtimeInspectorClose');
  await page.click('#openDevIdeBtn');
  await page.waitForTimeout(800);

  const ide = await page.evaluate(() => ({
    ideActive: document.querySelector('#view-ide')?.classList.contains('active'),
    cityVisible: getComputedStyle(document.querySelector('#view-city')).display,
    editor: !!document.querySelector('#editorNode'),
    preview: !!document.querySelector('#previewIframe'),
    terminal: !!document.querySelector('#terminalCmd')
  }));

  await page.screenshot({ path: 'C:/projetos/ai-engine-core/ai-engine/temp-runtime-city.png', fullPage: true });
  console.log(JSON.stringify({ initial, interactions: { coreOpen, skillsOpen }, ide, logs }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
