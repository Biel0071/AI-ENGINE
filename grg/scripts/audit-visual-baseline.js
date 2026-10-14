const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/baseline_screenshots';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const RESOLUTIONS = [
  { name: '1080p', width: 1920, height: 1080 },
  { name: '900p', width: 1440, height: 900 },
  { name: '800p', width: 1280, height: 800 }
];

const VIEWS = [
  'command',
  'city',
  'agents',
  'ide',
  'operations',
  'runtime',
  'projects',
  'memory',
  'knowledge',
  'mcp',
  'browser',
  'observability',
  'terminal',
  'flowgraph'
];

async function runAudit() {
  console.log('Authenticating with Fênix backend...');
  const loginRes = await fetch('http://127.0.0.1:4400/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Logged in successfully, token:', token.substring(0, 10) + '...');

  const browser = await chromium.launch({ headless: true });
  const networkErrors = [];
  const consoleMessages = [];
  const viewMetrics = {};

  // First capture login screen at 1080p
  const unauthContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const unauthPage = await unauthContext.newPage();
  await unauthPage.goto('http://127.0.0.1:4400/', { waitUntil: 'domcontentloaded' });
  await unauthPage.waitForTimeout(1000);
  await unauthPage.screenshot({ path: path.join(OUTPUT_DIR, 'baseline_1080p_login.png') });
  await unauthContext.close();
  console.log('Captured baseline_1080p_login.png');

  for (const res of RESOLUTIONS) {
    console.log(`\n=== Auditing resolution: ${res.name} (${res.width}x${res.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1
    });

    await context.addCookies([
      { name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' }
    ]);

    const page = await context.newPage();

    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      if (status >= 400) {
        networkErrors.push({ status, url, resolution: res.name });
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push({ text: msg.text(), location: msg.location(), resolution: res.name });
      }
    });

    await page.addInitScript((tok) => {
      localStorage.setItem('grg_token', tok);
    }, token);

    await page.goto('http://127.0.0.1:4400/app#command', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    for (const viewId of VIEWS) {
      try {
        console.log(`Switching to view: ${viewId} (${res.name})`);
        await page.evaluate((vid) => {
          if (typeof window.showView === 'function') {
            window.showView(vid);
          } else {
            const btn = document.querySelector(`[data-view="${vid}"], [data-nav="${vid}"]`);
            if (btn) btn.click();
          }
        }, viewId);

        await page.waitForTimeout(1200);

        const currentActive = await page.evaluate(() => document.querySelector('.view.active')?.id);
        const shotPath = path.join(OUTPUT_DIR, `baseline_${res.name}_${viewId}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`  -> Active: ${currentActive} | Saved: ${shotPath}`);

        if (res.name === '1080p') {
          // Collect DOM metrics for this view
          const metrics = await page.evaluate((vid) => {
            const viewEl = document.getElementById(`view-${vid}`);
            if (!viewEl) return { found: false };
            const cardCount = viewEl.querySelectorAll('[class*="card"], [class*="kpi"], [class*="tile"], [class*="box"]').length;
            const inlineStyles = viewEl.querySelectorAll('[style]').length;
            const buttons = viewEl.querySelectorAll('button').length;
            const tablesOrGrids = viewEl.querySelectorAll('table, [class*="grid"], [class*="table"]').length;
            const timelineOrStream = viewEl.querySelectorAll('[class*="timeline"], [class*="stream"], [class*="pulse"], [class*="feed"], [class*="log"]').length;
            const inspector = viewEl.querySelectorAll('[class*="inspector"], [class*="drawer"], [class*="panel-right"]').length;
            return {
              found: true,
              cardCount,
              inlineStyles,
              buttons,
              tablesOrGrids,
              timelineOrStream,
              inspector,
              innerTextLength: viewEl.innerText.length
            };
          }, viewId);
          viewMetrics[viewId] = metrics;
        }
      } catch (err) {
        console.error(`Failed to capture view ${viewId} at ${res.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();

  // Save report
  const reportPath = path.join(OUTPUT_DIR, 'baseline_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    networkErrorsCount: networkErrors.length,
    networkErrors: networkErrors.slice(0, 100),
    consoleErrorsCount: consoleMessages.length,
    consoleMessages: consoleMessages.slice(0, 100),
    viewMetrics
  }, null, 2));

  console.log(`\nAudit complete!`);
  console.log(`Total 4xx/5xx network errors detected: ${networkErrors.length}`);
  console.log(`Total console errors: ${consoleMessages.length}`);
  console.log(`Report saved to: ${reportPath}`);
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
