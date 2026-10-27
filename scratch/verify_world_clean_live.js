'use strict';

const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const SCREENSHOT_PATH = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\cd6d3967-5d56-4191-9635-645117fb32c7\\world_clean_space_verified.png';

(async () => {
  console.log('=== LIVE PLAYWRIGHT VERIFICATION: WORLD CLEAN SPACE ===');
  const token = fs.readFileSync('scratch/live-token.txt', 'utf8').trim();
  const targetUrl = 'http://209.50.241.22:3000/app#city';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  await context.addCookies([
    {
      name: 'fenix_session',
      value: encodeURIComponent(token),
      url: 'http://209.50.241.22:3000',
      httpOnly: true,
      sameSite: 'Lax'
    }
  ]);

  const page = await context.newPage();
  await page.addInitScript((val) => {
    localStorage.setItem('grg_token', val);
    localStorage.setItem('fenix_token', val);
    localStorage.setItem('fenix_sidebar_state', 'closed');
  }, token);

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#view-city', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => typeof window.initFenixWorld3D === 'function' || typeof window.FenixWorld3DEngine === 'function', { timeout: 20000 });

  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
    else if (typeof window.switchView === 'function') window.switchView('city');
  });

  await page.waitForTimeout(4500);

  const probe = await page.evaluate(() => {
    const areaRect = document.getElementById('fenixCityWorldArea')?.getBoundingClientRect();
    const isVisibleInArea = (el) => {
      if (!el || !areaRect) return false;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number.parseFloat(st.opacity) === 0 || el.hidden) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return r.bottom > areaRect.top && r.top < areaRect.bottom && r.right > areaRect.left && r.left < areaRect.right;
    };

    const modeBar = document.getElementById('fenixCityModeBar');
    const roster = document.getElementById('fenixCityAutonomousRoster');
    const roleInspector = document.getElementById('fenixCityRoleInspector');
    const universeHud = document.getElementById('fenixUniverseExplorerHUD');
    const fw3List = document.querySelector('.fw3-list');
    const fw3Refresh = document.querySelector('.fw3-refresh');
    const fw3Pulse = document.querySelector('.fw3-pulse');
    const footer = document.getElementById('fenixPresentationFooter');
    const tickerViewportRect = footer?.querySelector('.fenix-ticker-viewport')?.getBoundingClientRect();
    const tickerRamItemRect = document.getElementById('tickerRam')?.closest('.fenix-ticker-item')?.getBoundingClientRect();

    return {
      modeBarVisible: isVisibleInArea(modeBar),
      rosterVisible: isVisibleInArea(roster),
      roleInspectorVisible: isVisibleInArea(roleInspector),
      universeHudVisible: isVisibleInArea(universeHud),
      fw3ListVisible: isVisibleInArea(fw3List),
      fw3RefreshVisible: isVisibleInArea(fw3Refresh),
      fw3PulseVisible: isVisibleInArea(fw3Pulse),
      programmaticApis: {
        fenixSetCityMode: typeof window.fenixSetCityMode === 'function',
        fenixSetCityDensity: typeof window.fenixSetCityDensity === 'function',
        syncAutonomousCityState: typeof window.fenixWorld3D?.syncAutonomousCityState === 'function',
        inspectEngineeringRole: typeof window.fenixWorld3D?.inspectEngineeringRole === 'function',
      },
      outerFooterMetrics: {
        inFooter: Boolean(footer && footer.querySelector('#tickerProjects') && footer.querySelector('#tickerAgents') && footer.querySelector('#tickerJobs') && footer.querySelector('#tickerMachines')),
        projects: document.getElementById('tickerProjects')?.textContent?.trim(),
        agents: document.getElementById('tickerAgents')?.textContent?.trim(),
        jobs: document.getElementById('tickerJobs')?.textContent?.trim(),
        machines: document.getElementById('tickerMachines')?.textContent?.trim(),
        ramVisibleUnclipped: Boolean(tickerViewportRect && tickerRamItemRect && tickerRamItemRect.right <= tickerViewportRect.right),
      },
      canvas3dReady: Boolean(document.querySelector('#view-city .fw3-canvas')),
      districtLabelsCount: document.querySelectorAll('#view-city .fw3-district-label:not([hidden])').length,
    };
  });

  console.log('DOM Probe Results:', JSON.stringify(probe, null, 2));

  assert.equal(probe.modeBarVisible, false, '#fenixCityModeBar must not be visible inside 3D World');
  assert.equal(probe.rosterVisible, false, '#fenixCityAutonomousRoster must not be visible inside 3D World');
  assert.equal(probe.roleInspectorVisible, false, '#fenixCityRoleInspector must not clutter 3D World');
  assert.equal(probe.universeHudVisible, false, '#fenixUniverseExplorerHUD must not be visible inside 3D World');
  assert.equal(probe.fw3ListVisible, false, '.fw3-list must not be visible inside 3D World');
  assert.equal(probe.fw3RefreshVisible, false, '.fw3-refresh must not be visible inside 3D World');
  assert.equal(probe.fw3PulseVisible, false, '.fw3-pulse must not be visible inside 3D World');
  assert.equal(probe.outerFooterMetrics.inFooter, true, 'PROJETOS / AGENTES / JOBS ATIVOS / MÁQUINAS must be in outer footer');
  assert.equal(probe.outerFooterMetrics.ramVisibleUnclipped, true, 'Footer RAM item must not be clipped at 1920x1080');
  assert.equal(probe.programmaticApis.fenixSetCityMode, true);
  assert.equal(probe.programmaticApis.fenixSetCityDensity, true);
  assert.equal(probe.programmaticApis.syncAutonomousCityState, true);
  assert.equal(probe.programmaticApis.inspectEngineeringRole, true);

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log(`Saved verified live screenshot to: ${SCREENSHOT_PATH}`);

  // Also test Untested Edge Cases: building interior .fw3-back & programmatic role inspection
  const edgeCases = await page.evaluate(async () => {
    const areaRect = document.getElementById('fenixCityWorldArea')?.getBoundingClientRect();
    const isVisibleInArea = (el) => {
      if (!el || !areaRect) return false;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number.parseFloat(st.opacity) === 0 || el.hidden) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return r.bottom > areaRect.top && r.top < areaRect.bottom && r.right > areaRect.left && r.left < areaRect.right;
    };

    await window.fenixSyncCityAutonomousState?.();
    const roleData = window.fenixInspectCityRole?.('bug-hunter');
    const roleInspector = document.getElementById('fenixCityRoleInspector');
    const roleInspectorStillHiddenIn3D = !isVisibleInArea(roleInspector);

    const eng = window.fenixWorld3D;
    eng?.enterBuilding?.('bld-fenix-hq');
    const fw3Back = document.querySelector('.fw3-back');
    const fw3List = document.querySelector('.fw3-list');
    const fw3Refresh = document.querySelector('.fw3-refresh');
    const fw3Identity = document.querySelector('.fw3-identity');
    const interiorState = {
      level: eng?.state?.level,
      backVisible: isVisibleInArea(fw3Back),
      backText: fw3Back?.textContent?.trim(),
      listVisible: isVisibleInArea(fw3List),
      refreshVisible: isVisibleInArea(fw3Refresh),
      identityVisible: isVisibleInArea(fw3Identity),
    };
    eng?.back?.();
    eng?.back?.();
    return {
      roleInspectedLabel: roleData?.role || null,
      roleInspectorDomSet: Boolean(roleInspector && roleInspector.style.display !== 'none'),
      roleInspectorStillHiddenIn3D,
      interiorState,
      backHiddenAfterReturn: Boolean(fw3Back?.hidden),
    };
  });
  console.log('Edge Case Verification:', JSON.stringify(edgeCases, null, 2));
  assert.equal(edgeCases.roleInspectedLabel, 'Bug Hunter');
  assert.equal(edgeCases.roleInspectorDomSet, true);
  assert.equal(edgeCases.roleInspectorStillHiddenIn3D, true, '#fenixCityRoleInspector must stay hidden in 3D space even after inspectEngineeringRole');
  assert.equal(edgeCases.interiorState.level, 'interior');
  assert.equal(edgeCases.interiorState.backVisible, true, '.fw3-back must appear in interior view');
  assert.equal(edgeCases.interiorState.listVisible, false, '.fw3-list must stay hidden in interior view');
  assert.equal(edgeCases.interiorState.refreshVisible, false, '.fw3-refresh must stay hidden in interior view');
  assert.equal(edgeCases.interiorState.identityVisible, false, '.fw3-identity must stay hidden in interior view');
  assert.equal(edgeCases.backHiddenAfterReturn, true, '.fw3-back must hide after returning to world view');

  await browser.close();
})();
