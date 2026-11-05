'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = process.env.FENIX_QA_CHROMIUM_PATH || (fs.existsSync(edgePath) ? edgePath : undefined);
const browserAvailable = Boolean(executablePath || fs.existsSync(chromium.executablePath()));

test('Copilot compact control collapses to 64px and restores at mobile, tablet, and desktop widths', { skip: !browserAvailable }, async (t) => {
  const app = express();
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });

  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1).*/, route => route.abort());
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.FenixSidebar && document.getElementById('fsbCompactBtn')));
    await page.evaluate(() => window.FenixSidebar.open());
    await page.locator('#fsbCompactBtn').click();
    await page.locator('#fenix-right-sidebar.state-compact').waitFor();
    const compactInfo = await page.locator('#fenix-right-sidebar').evaluate(node => { const sheet = [...document.styleSheets].find(item => item.href?.includes('fenix-mascot-sidebar.css')); const rules = [...(sheet?.cssRules || [])].flatMap(rule => rule.cssRules ? [...rule.cssRules] : [rule]).filter(rule => rule.selectorText?.includes('#fenix-right-sidebar') && rule.style?.width).map(rule => `${rule.selectorText}=${rule.style.width}`); return { width: node.getBoundingClientRect().width, className: node.className, cssWidth: getComputedStyle(node).width, inlineStyle: node.getAttribute('style'), viewport: innerWidth, media: matchMedia('(max-width: 900px)').matches, rules }; });
    assert.ok(compactInfo.width <= 70, `compact sidebar did not resize at ${width}px: ${JSON.stringify(compactInfo)}`);
    await page.locator('#fsbCompactBtn').click();
    await page.locator('#fenix-right-sidebar.open:not(.state-compact)').waitFor();
  }
});

test('chat window opens as a dedicated resizable view without persisting sidebar state into the main app', { skip: !browserAvailable }, async (t) => {
  const source = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');
  const styles = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');
  assert.match(source, /assistantWindow/);
  assert.match(source, /fsbUndockBtn/);
  assert.match(source, /rightCopilotHeight/);
  assert.match(styles, /body\.fenix-chat-window #fenix-right-sidebar/);

  const app = express();
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });
  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 480, height: 820 } });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1).*/, route => route.abort());
  const appPage = await context.newPage();
  await appPage.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
  await appPage.waitForFunction(() => Boolean(window.FenixSidebar && document.getElementById('fsbUndockBtn')));
  await appPage.evaluate(() => window.FenixSidebar.open());
  const popupPromise = context.waitForEvent('page');
  await appPage.locator('#fsbUndockBtn').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForFunction(() => document.body.classList.contains('fenix-chat-window') && document.getElementById('fenix-right-sidebar')?.classList.contains('open'));
  assert.equal(await popup.locator('#app-shell').evaluate(el => getComputedStyle(el).display), 'contents');
  assert.equal(await popup.locator('#view-city').evaluate(el => el.getClientRects().length), 0);
  assert.equal(await appPage.evaluate(() => localStorage.getItem('fenix_sidebar_state')), 'open');
  const popupWidth = await popup.locator('#fenix-right-sidebar').evaluate(el => Math.round(el.getBoundingClientRect().width));
  assert.ok(popupWidth >= 440 && popupWidth <= 480, `detached chat width is ${popupWidth}px`);
});
