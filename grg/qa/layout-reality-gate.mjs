import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const token = process.env.FENIX_QA_TOKEN || '';
const viewports = [[1366, 768], [1440, 900], [1920, 1080]];
const views = ['command', 'operations', 'agents', 'projects', 'ide', 'memory', 'knowledge', 'runtime', 'observability', 'mcp', 'project', 'city', 'browser', 'terminal'];
const out = { generatedAt: new Date().toISOString(), viewports, views, results: [] };
const browser = await chromium.launch({ headless: true });

for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height } });
  if (token) await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  if (token) await page.addInitScript((value) => { localStorage.setItem('grg_token', value); localStorage.setItem('fenix_token', value); }, token);
  await page.goto(`${baseURL}/app?qa=layout#command`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (const view of views) {
    const button = page.locator(`[data-nav="${view}"], [data-view="${view}"]`).first();
    if (await button.count()) await button.click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((viewName) => document.querySelector(`#view-${viewName}.active`), view, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(120);
    const measurement = await page.evaluate(({ width: viewportWidth, height: viewportHeight, viewName }) => {
      const active = document.querySelector('.view.active') || document.querySelector(`#view-${viewName}`);
      const nodes = [...(active || document).querySelectorAll('*')].filter((node) => {
        const style = getComputedStyle(node); return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const outside = [], belowViewport = [], invalid = [];
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const id = node.id || node.className?.toString?.().split(' ').slice(0, 2).join('.') || node.tagName;
        const item = { id, rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) } };
        if (rect.left < -2 || rect.right > viewportWidth + 2 || rect.top < -2) outside.push(item);
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
        if (intersects && !contains(a.rect, b.rect) && !contains(b.rect, a.rect) && !expectedOverlay && !expectedNested) overlaps.push({ a: a.selector, b: b.selector });
      }
      return { view: viewName, viewport: { width: viewportWidth, height: viewportHeight }, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 2, outside: outside.slice(0, 30), outsideCount: outside.length, belowViewportCount: belowViewport.length, belowViewport: belowViewport.slice(0, 10), invalid, overlaps, overlapCount: overlaps.length, structural };
    }, { width, height, viewName: view });
    out.results.push(measurement);
  }
  await context.close();
}
await browser.close();
fs.mkdirSync('qa-results', { recursive: true });
fs.writeFileSync('qa-results/layout-reality-gate.json', JSON.stringify(out, null, 2));
const failures = out.results.filter((item) => item.horizontalOverflow || item.invalid.length || item.outsideCount > 0 || item.overlapCount > 0);
console.log(JSON.stringify({ ok: failures.length === 0, screens: out.results.length, failures: failures.length, report: 'qa-results/layout-reality-gate.json' }));
if (failures.length) process.exitCode = 1;
