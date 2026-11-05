'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');

test('HIG interaction accent stays aligned with the Fênix cyan and green identity', () => {
  const css = fs.readFileSync(path.join(publicDir, 'fenix-hig-system.css'), 'utf8');
  assert.match(css, /--fenix-ui-accent:\s*#22d3ee/i);
  assert.doesNotMatch(css, /#0a84ff|rgba\(10,\s*132,\s*255/);
  const sendColor = css.match(/\.fsb-send-btn\s*\{\s*background:\s*(#[0-9a-f]{6})/i)?.[1];
  const luminance = (hex) => {
    const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset + 1, offset + 3), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  assert.ok(sendColor, 'send action must have an explicit Fênix primary color');
  assert.ok(1.05 / (luminance(sendColor) + 0.05) >= 4.5, 'white send icon needs WCAG AA contrast');
});

test('shared topbar and KPI actions follow the calm HIG system at supported widths', async (t) => {
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
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage();

  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--fnx-viewport-width') === `${window.innerWidth}px`);
    const ui = await page.evaluate(() => {
      const topbar = document.querySelector('.global-topbar');
      const topbarStyle = getComputedStyle(topbar);
      const activeNav = document.querySelector('#mainSidebarNav .nav-item.active');
      const cluster = document.querySelector('.fnx-topbar-kpis-cluster');
      const clusterStyle = getComputedStyle(cluster);
      const capsules = [...document.querySelectorAll('.fnx-kpi-capsule')];
      return {
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        accent: getComputedStyle(document.documentElement).getPropertyValue('--fenix-ui-accent').trim(),
        activeNavBackground: activeNav && getComputedStyle(activeNav).backgroundColor,
        topbar: {
          background: topbarStyle.backgroundColor,
          backdrop: topbarStyle.backdropFilter,
          shadow: topbarStyle.boxShadow,
          scrollWidth: topbar.scrollWidth,
          clientWidth: topbar.clientWidth,
          items: [...topbar.children].filter((node) => node.getBoundingClientRect().width > 0).map((node) => ({
            className: node.className,
            left: node.getBoundingClientRect().left,
            right: node.getBoundingClientRect().right,
            width: node.getBoundingClientRect().width,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
          })),
        },
        cluster: {
          clientWidth: cluster.clientWidth,
          scrollWidth: cluster.scrollWidth,
          overflowX: clusterStyle.overflowX,
          scrollbar: getComputedStyle(cluster, '::-webkit-scrollbar').display,
        },
        kpis: capsules.map((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return {
            tag: button.tagName,
            label: button.getAttribute('aria-label'),
            visibleLabel: button.querySelector('.fnx-kpi-label')?.textContent.trim(),
            value: button.querySelector('.fnx-kpi-value')?.textContent.trim(),
            valueDisplay: getComputedStyle(button.querySelector('.fnx-kpi-value')).display,
            valueBorder: getComputedStyle(button.querySelector('.fnx-kpi-value')).borderColor,
            iconColor: getComputedStyle(button.querySelector('.fnx-kpi-icon')).color,
            title: button.title,
            width: rect.width,
            height: rect.height,
            background: style.backgroundColor,
            shadow: style.boxShadow,
            transform: style.transform,
          };
        }),
        search: (() => {
          const search = document.querySelector('.fnx-search-pill');
          return {
            role: search.getAttribute('role'), tabIndex: search.tabIndex, label: search.getAttribute('aria-label'), opens: Boolean(document.getElementById('cmdDialog')),
            inputDisplay: getComputedStyle(search.querySelector('input')).display,
            shortcutDisplay: getComputedStyle(search.querySelector('kbd')).display,
            width: search.getBoundingClientRect().width,
          };
        })(),
      };
    });

    assert.ok(ui.documentWidth <= viewport.width + 1, `document overflows at ${viewport.width}px: ${JSON.stringify(ui)}`);
    assert.equal(ui.accent, '#22d3ee', 'focus and selection use Fênix cyan');
    assert.equal(ui.activeNavBackground, 'rgba(34, 211, 238, 0.12)', `selected navigation should use the Fênix accent at ${viewport.width}px`);
    assert.equal(ui.topbar.background, 'rgba(17, 18, 21, 0.96)', `topbar surface is inconsistent at ${viewport.width}px`);
    assert.equal(ui.topbar.backdrop, 'none', `topbar should not rely on blur at ${viewport.width}px`);
    assert.ok(ui.topbar.scrollWidth <= ui.topbar.clientWidth + 1, `topbar content overflows at ${viewport.width}px: ${JSON.stringify(ui.topbar.items)}`);
    assert.equal(ui.kpis.length, 4, 'all four KPI actions remain available');
    assert.equal(ui.search.role, 'button');
    assert.equal(ui.search.tabIndex, 0);
    assert.equal(ui.search.label, 'Abrir pesquisa global');
    assert.equal(ui.search.opens, true);
    if (viewport.width >= 1181 && viewport.width <= 1360) {
      assert.equal(ui.search.inputDisplay, 'none', 'tablet desktop search must not show a clipped placeholder');
      assert.equal(ui.search.shortcutDisplay, 'none', 'tablet desktop search icon must not compete with a shortcut label');
      assert.ok(ui.search.width >= 36, 'tablet desktop search icon needs a visible action target');
    }
    if (viewport.width >= 1361) assert.notEqual(ui.search.inputDisplay, 'none', 'wide desktop retains the full search field');
    if (viewport.width <= 600) {
      assert.equal(ui.cluster.overflowX, 'auto', 'mobile KPI strip must expose horizontal scrolling');
      assert.ok(ui.cluster.scrollWidth > ui.cluster.clientWidth, 'all KPI actions must remain reachable by scrolling');
      assert.equal(ui.cluster.scrollbar, 'block', 'a thin scroll indicator must reveal extra mobile KPIs');
    } else {
      assert.ok(ui.cluster.scrollWidth <= ui.cluster.clientWidth + 1, `KPI cards should fit without scrolling at ${viewport.width}px: ${JSON.stringify(ui.cluster)}`);
    }
    if (viewport.width >= 1181 && viewport.width <= 1360) {
      assert.deepEqual(ui.kpis.map((kpi) => kpi.visibleLabel), ['Online', 'Missões', 'Jobs', 'Sistema']);
    }
    if (viewport.width <= 1180) {
      for (const [index, kpi] of ui.kpis.slice(0, 3).entries()) {
        assert.notEqual(kpi.valueDisplay, 'none', `primary numeric KPI ${index + 1} must remain visible at ${viewport.width}px`);
        assert.equal(kpi.valueBorder, kpi.iconColor, `primary numeric KPI ${index + 1} must retain its category color at ${viewport.width}px`);
      }
    }
    for (const [index, kpi] of ui.kpis.entries()) {
      assert.equal(kpi.tag, 'BUTTON', `KPI ${index + 1} must support keyboard activation`);
      assert.ok(kpi.label, `KPI ${index + 1} must have an accessible name`);
      assert.notEqual(kpi.value, 'UNAVAILABLE', 'unavailable status should use the Portuguese UI label');
      assert.ok(kpi.width >= 40, `KPI ${index + 1} target is too narrow at ${viewport.width}px`);
      assert.equal(kpi.background, 'rgb(29, 30, 35)', `KPI ${index + 1} should use the shared neutral surface`);
      assert.equal(kpi.shadow, 'none', `KPI ${index + 1} should not use a decorative glow`);
      assert.equal(kpi.transform, 'none', `KPI ${index + 1} should not jump on hover`);
      assert.ok(kpi.height >= 40, `KPI ${index + 1} action is too short at ${viewport.width}px`);
    }

    await page.evaluate(() => {
      window.__topbarKpiActivation = null;
      window.__originalKpiDrawer = window.fnxToggleKpiDrawer;
      window.fnxToggleKpiDrawer = (key) => { window.__topbarKpiActivation = key; };
    });
    await page.locator('.fnx-kpi-capsule').nth(3).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__topbarKpiActivation), 'system', `keyboard activation must work at ${viewport.width}px`);
    await page.locator('.fnx-search-pill').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#cmdDialog').evaluate((dialog) => dialog.open), true, `keyboard search activation must open the dialog at ${viewport.width}px`);
    await page.locator('#cmdDialog').evaluate((dialog) => dialog.close());
    await page.evaluate(() => { window.fnxToggleKpiDrawer = window.__originalKpiDrawer; });
    if (viewport.width === 1280) {
      const missionUi = await page.evaluate(() => {
        window.state.data.missions = { missions: [
          { id: 'mission-review-1', title: 'Revisão em aprovação', status: 'AWAITING_APPROVAL' },
          { id: 'mission-done-1', title: 'Concluída', status: 'SUCCEEDED' },
        ] };
        window.fnxToggleKpiDrawer('missions');
        return {
          rendered: document.getElementById('fnxKpiDdBody')?.innerHTML,
          title: document.getElementById('fnxKpiDdTitle')?.textContent,
          data: window.state.data.missions,
          helper: typeof window.fenixIsMissionOpen,
        };
      });
      assert.match(missionUi.rendered || '', /Revisão em aprovação/, JSON.stringify(missionUi));
      assert.match(missionUi.rendered || '', /mission-review-1/);
      assert.match(missionUi.rendered || '', /AWAITING_APPROVAL/);
      assert.doesNotMatch(missionUi.rendered || '', /Concluída|mission-done-1/);
      await page.screenshot({ path: path.join(os.tmpdir(), 'grg-topbar-1280-hig-after.png') });
    }
  }
});
