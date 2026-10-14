const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[PAGE CONSOLE]:', msg.text()));
  await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'domcontentloaded' });
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin');
  await page.click('#f button[type="submit"], #loginButton');
  await page.waitForURL('**/app*', { waitUntil: 'domcontentloaded', timeout: 10000 });

  // Switch to city view
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
  });

  // Wait for iso-city to finish syncRealData
  console.log('Waiting for fenixCity agents to populate...');
  await page.waitForFunction(() => {
    return window.fenixCity && window.fenixCity.world && window.fenixCity.world.agents && window.fenixCity.world.agents.size > 0;
  }, { timeout: 15000 });

  const result = await page.evaluate(() => {
    const city = window.fenixCity;
    const camila = city.world.agents.get('agent-camila');
    return {
      agentsSize: city.world.agents.size,
      camila: camila ? {
        id: camila.id,
        name: camila.name,
        company: camila.company,
        role: camila.role,
        stationId: camila.stationId,
        coords: { x: camila.x, y: camila.y },
        status: camila.status
      } : null,
      vehiclesSize: city.world.vehicles?.size || city.world.vehicles?.length,
      constructionsSize: city.world.constructions?.size || city.world.constructions?.length
    };
  });

  console.log('FINAL SYNC RESULT:', JSON.stringify(result, null, 2));
  await browser.close();
})();
