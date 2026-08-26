const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') logs.push(msg.text());
  });
  page.on('pageerror', (error) => logs.push(error.message));

  await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'domcontentloaded' });
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'grg-admin');
  await Promise.all([
    page.waitForURL('**/app*', { timeout: 15000, waitUntil: 'domcontentloaded' }),
    page.click('#loginButton')
  ]);

  await page.waitForSelector('#view-city.runtime-city-view', { timeout: 15000 });
  await page.waitForSelector('#cityJobDag .job-dag-row', { timeout: 15000 });
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => ({
    title: document.querySelector('#view-city h1')?.textContent || '',
    cityActive: document.querySelector('#view-city')?.classList.contains('active') || false,
    jobRows: document.querySelectorAll('#cityJobDag .job-dag-row').length,
    missionVisible: document.body.textContent.includes('devmission-38865e68-9c24-48cd-a431-212b0e20fe48'),
    completedVisible: document.body.textContent.includes('COMPLETED'),
    noActiveAgents: !document.getElementById('agentEmptyState')?.hidden
  }));
  await page.screenshot({ path: 'temp_artifacts/phase2-cockpit.png', fullPage: true });
  await browser.close();
  console.log(JSON.stringify({ result, logs }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
