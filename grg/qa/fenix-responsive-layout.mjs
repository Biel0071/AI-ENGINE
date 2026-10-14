import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:8890';
const baseOrigin = new URL(baseURL).origin;
const viewports = [[1920, 1080], [1440, 900], [1076, 1190], [768, 1024], [390, 844]];
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/*', (route) => new URL(route.request().url()).origin === baseOrigin ? route.continue() : route.abort());
    await page.goto(`${baseURL}/index.html#city`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(300);
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      };
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        topbar: rect('.global-topbar'),
        topbarItems: [...document.querySelectorAll('.global-topbar > .v10-topbar-left, .global-topbar > .fnx-topbar-kpis-cluster, .global-topbar > .fnx-topbar-right')]
          .filter((element) => getComputedStyle(element).display !== 'none')
          .map((element) => {
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right };
          }),
        nav: rect('#mainSidebarNav'),
        main: rect('.main-body'),
        footer: rect('#fenixPresentationFooter'),
        viewIds: [...document.querySelectorAll('.views-container > .view')].map((element) => element.id),
      };
    });

    assert.ok(layout.documentWidth <= width, `${width}px: document has horizontal overflow`);
    assert.ok(layout.topbarItems.every((item) => item.left >= -1 && item.right <= width + 1), `${width}px: topbar content exceeds viewport`);
    assert.ok(layout.nav.right <= width + 1, `${width}px: navigation exceeds viewport`);
    assert.ok(layout.main.bottom <= layout.footer.top + 1, `${width}px: main content overlaps the fixed telemetry footer`);
    for (const id of layout.viewIds) {
      const active = await page.evaluate((targetId) => {
        const views = [...document.querySelectorAll('.views-container > .view')];
        for (const view of views) {
          const current = view.id === targetId;
          view.classList.toggle('active', current);
          view.style.setProperty('display', current ? 'flex' : 'none', 'important');
        }
        const element = document.getElementById(targetId);
        const box = element.getBoundingClientRect();
        return { id: element.id, left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      }, id);
      assert.ok(active.width > 100, `${width}px / ${id}: view collapsed`);
      assert.ok(active.left >= -1 && active.right <= width + 1, `${width}px / ${id}: view exceeds horizontal viewport`);
      assert.ok(active.top >= layout.topbar.bottom - 1 && active.bottom <= layout.footer.top + 4, `${width}px / ${id}: view overlaps app chrome`);
      assert.ok(active.scrollWidth <= active.clientWidth + 10, `${width}px / ${id}: content overflows horizontally by ${active.scrollWidth - active.clientWidth}px`);
      if (id === 'view-city') {
        const canvas = await page.locator('#view-city .fenix-city-canvas-area').evaluate((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
        });
        assert.ok(canvas.width > 100, `${width}px: city canvas collapsed to zero width`);
        assert.ok(canvas.left >= active.left - 1 && canvas.right <= active.right + 1, `${width}px: city canvas exceeds its view`);
        assert.ok(canvas.bottom <= active.bottom + 1, `${width}px: city canvas exceeds its view height`);
      }
    }
    const toggle = page.locator('#sidebarCollapseBtn');
    await toggle.click();
    const menuState = await page.evaluate(() => ({
      body: [...document.body.classList],
      collapsed: document.getElementById('mainSidebarNav')?.classList.contains('collapsed'),
      navDisplay: getComputedStyle(document.getElementById('mainSidebarNav')).display,
      labelDisplay: getComputedStyle(document.querySelector('#mainSidebarNav .fnx-nav-label-box')).display,
      expanded: document.getElementById('sidebarCollapseBtn')?.getAttribute('aria-expanded'),
    }));
    if (width > 1180) {
      assert.equal(menuState.collapsed, true, `${width}px: menu toggle should switch to icon-only mode`);
    } else if (width > 900) {
      assert.ok(menuState.body.includes('sidebar-labels-visible'), `${width}px: menu toggle should reveal labels`);
      assert.notEqual(menuState.labelDisplay, 'none', `${width}px: menu labels remain hidden`);
    } else if (width > 760) {
      assert.ok(menuState.body.includes('menu-open'), `${width}px: tablet menu should open as a labeled drawer`);
      assert.notEqual(menuState.navDisplay, 'none', `${width}px: tablet navigation drawer remains hidden`);
    } else {
      assert.ok(menuState.body.includes('sidebar-labels-visible'), `${width}px: mobile toggle should reveal labels`);
      assert.notEqual(menuState.labelDisplay, 'none', `${width}px: mobile menu labels remain hidden`);
    }
    await toggle.click();

    if (width === 1076) {
      await page.evaluate(() => window.FenixMascotSidebar?.MascotController?.setCopilotState('open'));
      await page.waitForTimeout(80);
      const handle = page.locator('#fsbResizeHandle');
      const before = await page.locator('#fenix-right-sidebar').evaluate((element) => element.getBoundingClientRect().width);
      const handleBox = await handle.boundingBox();
      assert.ok(handleBox, '1076px: resizable chat handle must be visible');
      await page.mouse.move(handleBox.x + 7, handleBox.y + 35);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 33, handleBox.y + 35, { steps: 4 });
      await page.mouse.up();
      const after = await page.locator('#fenix-right-sidebar').evaluate((element) => element.getBoundingClientRect().width);
      assert.ok(after > before + 20, `1076px: dragging chat handle should increase width (${before}px -> ${after}px)`);
    }
    results.push({ width, height, routes: layout.viewIds.length, ok: true });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, viewports: results }, null, 2));
