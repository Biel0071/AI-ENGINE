const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: '1920x1080_FHD', width: 1920, height: 1080 },
  { name: '1600x900_HDPlus', width: 1600, height: 900 },
  { name: '1366x768_Laptop', width: 1366, height: 768 },
  { name: '1280x720_HD', width: 1280, height: 720 },
  { name: '1024x768_TabletLand', width: 1024, height: 768 },
  { name: '768x1024_TabletPort', width: 768, height: 1024 },
  { name: '390x844_Mobile', width: 390, height: 844 }
];

const OUTPUT_DIR = path.join(__dirname, 'multires_qa');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runMultiResQA() {
  console.log('=== MULTI-RESOLUTION RESPONSIVENESS & UI VERIFICATION ===\n');

  let serverInstance = null;
  let baseUrl = process.env.TARGET_URL;

  if (!baseUrl) {
    console.log('No TARGET_URL specified. Spawning ephemeral local server...');
    const { start } = require('../grg/src/server');
    process.env.NODE_ENV = 'test';
    process.env.GRG_LLM = '0';
    serverInstance = await start(0, { operationalActivation: false });
    const port = serverInstance.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Ephemeral server listening on ${baseUrl}\n`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log(`1. Loading application at ${baseUrl}/app#city ...`);
  await page.goto(`${baseUrl}/app#city`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(4000);

  console.log('2. Activating City view...');
  await page.evaluate(() => {
    if (typeof window.showView === 'function') {
      window.showView('city');
    }
  });
  await page.waitForTimeout(3000);

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1200);

    const metrics = await page.evaluate(() => {
      const docWidth = document.documentElement?.scrollWidth || 0;
      const bodyWidth = document.body?.scrollWidth || 0;
      const winWidth = window.innerWidth;
      const hasHorizontalScroll = bodyWidth > winWidth || docWidth > winWidth;

      const bottomDock = document.getElementById('fenixModularBottomDock');
      const dockRect = bottomDock ? bottomDock.getBoundingClientRect() : null;

      const controls = document.getElementById('fenixMiroSpatialHud');
      const controlsRect = controls ? controls.getBoundingClientRect() : null;

      const mascot = document.getElementById('fenix-floating-mascot');
      const mascotRect = mascot ? mascot.getBoundingClientRect() : null;

      const rightToolbar = document.getElementById('fenixCityRightToolbar');
      const toolbarRect = rightToolbar ? rightToolbar.getBoundingClientRect() : null;

      const providerOrbit = document.getElementById('fnxProviderOrbit');
      const orbitRect = providerOrbit ? providerOrbit.getBoundingClientRect() : null;

      // Overlap detection helper
      function isOverlapping(r1, r2) {
        if (!r1 || !r2) return false;
        if (r1.width === 0 || r1.height === 0 || r2.width === 0 || r2.height === 0) return false;
        return !(r1.right <= r2.left ||
                 r1.left >= r2.right ||
                 r1.bottom <= r2.top ||
                 r1.top >= r2.bottom);
      }

      const overlapControlsMascot = isOverlapping(controlsRect, mascotRect);
      const overlapDockControls = isOverlapping(dockRect, controlsRect);
      const overlapDockMascot = isOverlapping(dockRect, mascotRect);
      const overlapToolbarOrbit = isOverlapping(toolbarRect, orbitRect);
      const overlapToolbarMascot = isOverlapping(toolbarRect, mascotRect);

      const agentCards = document.querySelectorAll('#dockCardAgentsList .dock-featured-agent-card').length;
      const eventItems = document.querySelectorAll('#dockCardMissionsList .dock-event-item').length;
      const minimapStatusText = document.getElementById('fenixMinimapStatus')?.textContent?.trim() || '';

      return {
        winWidth,
        bodyWidth,
        docWidth,
        hasHorizontalScroll,
        dockVisible: Boolean(bottomDock && getComputedStyle(bottomDock).display !== 'none'),
        dockHeight: dockRect ? Math.round(dockRect.height) : 0,
        controlsVisible: Boolean(controls && getComputedStyle(controls).display !== 'none'),
        mascotVisible: Boolean(mascot && getComputedStyle(mascot).display !== 'none'),
        rightToolbarVisible: Boolean(rightToolbar && getComputedStyle(rightToolbar).display !== 'none'),
        providerOrbitVisible: Boolean(providerOrbit && getComputedStyle(providerOrbit).display !== 'none'),
        overlapControlsMascot,
        overlapDockControls,
        overlapDockMascot,
        overlapToolbarOrbit,
        overlapToolbarMascot,
        agentCards,
        eventItems,
        minimapStatusText
      };
    });

    const shotPath = path.join(OUTPUT_DIR, `shot_${vp.name}.png`);
    try {
      await page.screenshot({ path: shotPath, animations: 'disabled', timeout: 5000 });
    } catch (shotErr) {
      console.warn(`  (screenshot fallback: ${shotErr.message})`);
    }

    const checkPassed = !metrics.hasHorizontalScroll && 
      !metrics.overlapDockControls && 
      !metrics.overlapDockMascot && 
      !metrics.overlapControlsMascot && 
      !metrics.overlapToolbarOrbit &&
      !metrics.overlapToolbarMascot;

    console.log(`  -> Horizontal scroll: ${metrics.hasHorizontalScroll ? 'FAIL (Scrollbar detected: body=' + metrics.bodyWidth + ', win=' + metrics.winWidth + ')' : 'PASS (Zero scroll: ' + metrics.bodyWidth + '<=' + metrics.winWidth + ')'}`);
    console.log(`  -> Bottom Dock visible: ${metrics.dockVisible} (H: ${metrics.dockHeight}px)`);
    console.log(`  -> Right Toolbar suppressed: ${!metrics.rightToolbarVisible} (visible: ${metrics.rightToolbarVisible})`);
    console.log(`  -> Overlaps: Controls/Mascot=${metrics.overlapControlsMascot}, Dock/Controls=${metrics.overlapDockControls}, Dock/Mascot=${metrics.overlapDockMascot}, Toolbar/Mascot=${metrics.overlapToolbarMascot}`);
    console.log(`  -> Live Dock telemetry: Agents=${metrics.agentCards}, Events=${metrics.eventItems}, MinimapStatus="${metrics.minimapStatusText}"`);
    console.log(`  -> Result: ${checkPassed ? '✅ ALL CHECKS PASSED' : '⚠️ ISSUE DETECTED'}`);

    results.push({
      viewport: vp.name,
      resolution: `${vp.width}x${vp.height}`,
      passed: checkPassed,
      metrics,
      screenshot: shotPath
    });
  }

  await browser.close();
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
    console.log('Ephemeral server stopped.');
  }

  const summaryFile = path.join(OUTPUT_DIR, 'multires_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n=== Multi-Resolution Verification Completed. Results in ${summaryFile} ===`);

  const allPassed = results.every(r => r.passed);
  if (!allPassed) {
    console.error('FAILED: One or more viewports had issues.');
    process.exitCode = 1;
  } else {
    console.log('SUCCESS: All 7 viewports passed 100% of checks with zero regressions!');
  }
}

runMultiResQA().catch((err) => {
  console.error('Fatal error in QA script:', err);
  process.exit(1);
});
