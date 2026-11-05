import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:43877';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});
const results = [];

try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 792, height: 1117 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
    await page.goto(`${baseURL}/index.html#city`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.locator('#btnToggleCustomWorkspace').waitFor({ state: 'visible', timeout: 10000 });

    if (viewport.width > 820) {
      await page.locator('#btnToggleCustomWorkspace').click();
      const orderBefore = await page.locator('#fenixModularBottomDock > .city-panel-card').evaluateAll((cards) => cards.map((card) => card.id));
      await page.locator('#dockWindowAgents [data-panel-action="minimize"]').click();
      assert.ok((await page.locator('#dockWindowAgents').getAttribute('class')).includes('is-minimized'));
      await page.locator('#dockWindowAgents [data-panel-action="minimize"]').click();
      await page.locator('#dockWindowAgents [data-panel-action="maximize"]').click();
      assert.ok((await page.locator('#dockWindowAgents').getAttribute('class')).includes('is-maximized'));
      await page.locator('#dockWindowAgents [data-panel-action="maximize"]').click();
      assert.ok(!(await page.locator('#dockWindowAgents').getAttribute('class')).includes('is-maximized'));
      const handle = await page.locator('#dockWindowAgents .panel-resize-handle').boundingBox();
      assert.ok(handle, 'desktop resize handle should be visible in layout mode');
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x + 60, handle.y + 36, { steps: 4 });
      await page.mouse.up();
      assert.ok((await page.locator('#dockWindowAgents').getAttribute('class')).includes('is-floating'));
      const orderAfter = await page.locator('#fenixModularBottomDock > .city-panel-card').evaluateAll((cards) => cards.map((card) => card.id));
      assert.deepEqual(orderAfter, orderBefore.filter((id) => id !== 'dockWindowAgents'), 'floating a panel must keep remaining dock order');
      await page.locator('#spatialLayoutPresetSelect').selectOption('default');
      assert.equal(await page.locator('#dockWindowAgents').evaluate((card) => card.parentElement.id), 'fenixModularBottomDock');
      results.push({ ...viewport, mode: 'desktop', ok: true });
    } else {
      const bar = page.locator('#view-city.active .fenix-mobile-dock-bar');
      await bar.waitFor({ state: 'visible', timeout: 10000 });
      await bar.locator('[data-target="dockWindowAgents"]').click();
      assert.ok((await page.locator('#dockWindowAgents').getAttribute('class')).includes('mobile-drawer-open'));
      const drawer = await page.locator('#dockWindowAgents').boundingBox();
      const cityWidth = await page.locator('#fenixCityWorldArea').evaluate((area) => area.getBoundingClientRect().width);
      assert.ok(drawer && drawer.width >= cityWidth - 30, `mobile panel should fill the City workspace (${JSON.stringify({ drawer, cityWidth })})`);
      await bar.locator('[data-target="dockWindowAgents"]').click();
      assert.ok(!(await page.locator('#dockWindowAgents').getAttribute('class')).includes('mobile-drawer-open'));
      results.push({ ...viewport, mode: 'mobile-drawer', ok: true });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, viewports: results }, null, 2));
