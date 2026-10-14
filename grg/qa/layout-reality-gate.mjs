import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const entryPath = process.env.FENIX_QA_PATH || '/app?qa=layout#command';
const token = process.env.FENIX_QA_TOKEN || (fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');
const defaultViewports = [[320, 640], [390, 844], [768, 1024], [896, 968], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]];
const requestedViewports = process.env.FENIX_QA_VIEWPORTS?.split(',').map((entry) => entry.trim()).filter(Boolean);
const viewports = requestedViewports?.length
  ? requestedViewports.map((entry) => entry.split('x').map(Number)).filter(([width, height]) => Number.isFinite(width) && Number.isFinite(height))
  : defaultViewports;
const views = ['command', 'operations', 'agents', 'projects', 'ide', 'memory', 'knowledge', 'runtime', 'observability', 'mcp', 'project', 'city', 'browser', 'terminal'];
const out = { generatedAt: new Date().toISOString(), viewports, views, results: [] };
const browser = await chromium.launch({ headless: true });

for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height } });
  if (token) await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  if (token) await page.addInitScript((value) => { localStorage.setItem('grg_token', value); localStorage.setItem('fenix_token', value); }, token);
  await page.addInitScript(() => {
    localStorage.setItem('fenix_sidebar_state', 'open');
    localStorage.setItem('fenix_sidebar_labels', '1');
  });
  const entryURL = new URL(entryPath, `${baseURL.replace(/\/$/, '')}/`);
  await page.goto(entryURL.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (const view of views) {
    const button = page.locator(`[data-nav="${view}"], [data-view="${view}"]`).first();
    if (await button.count()) await button.click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((viewName) => document.querySelector(`#view-${viewName}.active`), view, { timeout: 5000 }).catch(() => {});
    if (!await page.evaluate((viewName) => Boolean(document.querySelector(`#view-${viewName}.active`)), view)) {
      await page.evaluate((viewName) => window.showView?.(viewName), view);
      await page.waitForFunction((viewName) => document.querySelector(`#view-${viewName}.active`), view, { timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(120);
    const measurement = await page.evaluate(({ width: viewportWidth, height: viewportHeight, viewName }) => {
      const activeRoute = document.querySelector(`#view-${viewName}.active`);
      const active = activeRoute || document.querySelector('.view.active') || document.querySelector(`#view-${viewName}`);
      const nodes = [...(active || document).querySelectorAll('*')];
      const outside = [], interactiveOutside = [], belowViewport = [], invalid = [];
      const hasHiddenAncestor = (node) => {
        for (let current = node; current && current !== document.documentElement; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (current.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.contentVisibility === 'hidden') return true;
        }
        return false;
      };
      const isClippedByScrollContainer = (node, rect) => {
        for (let current = node.parentElement; current && current !== document.documentElement; current = current.parentElement) {
          const style = getComputedStyle(current), parentRect = current.getBoundingClientRect();
          const clipsX = ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX) && (rect.left < parentRect.left - 2 || rect.right > parentRect.right + 2);
          const clipsY = ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY) && (rect.top < parentRect.top - 2 || rect.bottom > parentRect.bottom + 2);
          if (clipsX || clipsY) return true;
        }
        return false;
      };
      for (const node of nodes) {
        if (hasHiddenAncestor(node)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const id = node.id || node.className?.toString?.().split(' ').slice(0, 2).join('.') || node.tagName;
        const item = { id, rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) } };
        const beyondViewport = rect.left < -2 || rect.right > viewportWidth + 2 || rect.top < -2;
        if (beyondViewport) outside.push(item);
        const isInteractive = node.matches('button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
        const isParkedOffscreen = rect.right < -viewportWidth || rect.left > viewportWidth * 2 || rect.top > viewportHeight * 2 || rect.bottom < -viewportHeight;
        if (beyondViewport && isInteractive && !isParkedOffscreen && !isClippedByScrollContainer(node, rect)) interactiveOutside.push(item);
        else if (rect.bottom > viewportHeight + 2) belowViewport.push(item);
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) invalid.push(id);
      }
      const structural = ['.sidebar-nav', '.global-topbar', '.views-container', '.orch-center-area', '.orch-right-column'].map((selector) => {
        const node = document.querySelector(selector); if (!node) return null; const rect = node.getBoundingClientRect(); return { selector, rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } };
      }).filter(Boolean);
      const overlaps = [];
      for (let i = 0; i < structural.length; i += 1) for (let j = i + 1; j < structural.length; j += 1) {
        const a = structural[i], b = structural[j];
        const intersects = a.rect.left < b.rect.right && a.rect.right > b.rect.left && a.rect.top < b.rect.bottom && a.rect.bottom > b.rect.top;
        const contains = (x, y) => x.left <= y.left && x.right >= y.right && x.top <= y.top && x.bottom >= y.bottom;
        const selectors = new Set([a.selector, b.selector]);
        const expectedOverlay = selectors.has('.orch-right-column') && selectors.has('.orch-center-area');
        const expectedNested = selectors.has('.views-container') && selectors.has('.orch-center-area');
        const responsiveNavOverlay = selectors.has('.sidebar-nav') && selectors.has('.views-container') && viewportWidth > 760 && (document.body.classList.contains('sidebar-labels-visible') || document.body.classList.contains('menu-open'));
        if (intersects && !contains(a.rect, b.rect) && !contains(b.rect, a.rect) && !expectedOverlay && !expectedNested && !responsiveNavOverlay) overlaps.push({ a: a.selector, b: b.selector });
      }
      const cityMinimap = viewName === 'city' ? document.querySelector('#fenixWorldMinimap') : null;
      const cityMinimapRect = cityMinimap?.getBoundingClientRect();
      const cityMinimapVisible = cityMinimap && getComputedStyle(cityMinimap).display !== 'none' && cityMinimapRect?.width > 0 && cityMinimapRect?.height > 0;
      const cityOverlaps = [], cityLabelOverlaps = [], cityLabelOverlayOverlaps = [];
      if (cityMinimapVisible) {
        for (const [name, selector] of [['sidebar', '#mainSidebarNav'], ['copilot', '#fenix-right-sidebar'], ['navigation', '#fenixCityNavPill']]) {
          const node = document.querySelector(selector);
          const rect = node?.getBoundingClientRect();
          if (!node || !rect || getComputedStyle(node).display === 'none' || rect.width <= 0 || rect.height <= 0) continue;
          const intersects = cityMinimapRect.left < rect.right && cityMinimapRect.right > rect.left && cityMinimapRect.top < rect.bottom && cityMinimapRect.bottom > rect.top;
          if (intersects) cityOverlaps.push(name);
        }
      }
      if (viewName === 'city') {
        const labels = [...document.querySelectorAll('#view-city .fw3-label:not([hidden])')].map((node) => ({ name: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 60), rect: node.getBoundingClientRect() }));
        const obstacles = ['.fw3-control-hint', '.fw3-identity', '.fw3-nav', '.fw3-context', '.fw3-pulse', '#fenixWorldMinimap', '#fenixCityNavPill', '#fenixProviderOrbit'].map((selector) => {
          const node = document.querySelector(selector), rect = node?.getBoundingClientRect();
          return node && rect && rect.width > 0 && rect.height > 0 && getComputedStyle(node).display !== 'none'
            ? { name: selector, rect }
            : null;
        }).filter(Boolean);
        for (let i = 0; i < labels.length; i += 1) for (let j = i + 1; j < labels.length; j += 1) {
          const a = labels[i].rect, b = labels[j].rect;
          if (a.left < b.right + 3 && a.right > b.left - 3 && a.top < b.bottom + 3 && a.bottom > b.top - 3) cityLabelOverlaps.push([labels[i].name, labels[j].name]);
        }
        for (const label of labels) for (const obstacle of obstacles) {
          const a = label.rect, b = obstacle.rect;
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) cityLabelOverlayOverlaps.push([label.name, obstacle.name]);
        }
      }
      return { view: viewName, viewport: { width: viewportWidth, height: viewportHeight }, routeMissing: !activeRoute, cityMinimapMissing: viewName === 'city' && !cityMinimap, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 2, outside: outside.slice(0, 30), outsideCount: outside.length, interactiveOutside: interactiveOutside.slice(0, 30), interactiveOutsideCount: interactiveOutside.length, belowViewportCount: belowViewport.length, belowViewport: belowViewport.slice(0, 10), invalid, overlaps, overlapCount: overlaps.length, cityOverlaps, cityLabelOverlaps, cityLabelOverlayOverlaps, structural };
    }, { width, height, viewName: view });
    out.results.push(measurement);
  }
  await context.close();
}
await browser.close();
fs.mkdirSync('qa-results', { recursive: true });
fs.writeFileSync('qa-results/layout-reality-gate.json', JSON.stringify(out, null, 2));
const failures = out.results.filter((item) => item.routeMissing || item.cityMinimapMissing || item.horizontalOverflow || item.invalid.length || item.interactiveOutsideCount > 0 || item.overlapCount > 0 || item.cityOverlaps?.length > 0 || item.cityLabelOverlaps?.length > 0 || item.cityLabelOverlayOverlaps?.length > 0);
console.log(JSON.stringify({ ok: failures.length === 0, screens: out.results.length, failures: failures.length, routeMissing: out.results.filter((item) => item.routeMissing).length, cityMinimapMissing: out.results.filter((item) => item.cityMinimapMissing).length, interactiveOutside: out.results.filter((item) => item.interactiveOutsideCount > 0).length, cityOverlaps: out.results.filter((item) => item.cityOverlaps?.length).length, cityLabelOverlaps: out.results.filter((item) => item.cityLabelOverlaps?.length).length, cityLabelOverlayOverlaps: out.results.filter((item) => item.cityLabelOverlayOverlaps?.length).length, report: 'qa-results/layout-reality-gate.json' }));
if (failures.length) process.exitCode = 1;
