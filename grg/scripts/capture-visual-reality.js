const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/rebuilt_screenshots';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const RESOLUTIONS = [
  { name: '1080p', width: 1920, height: 1080 },
  { name: '900p', width: 1440, height: 900 },
  { name: '800p', width: 1280, height: 800 }
];

const TARGET_VIEWS = ['command', 'agents', 'ide'];

async function runCapture() {
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
  const report = {
    capturedAt: new Date().toISOString(),
    views: {},
    networkErrors: []
  };

  for (const res of RESOLUTIONS) {
    console.log(`\n=== Capturing resolution: ${res.name} (${res.width}x${res.height}) ===`);
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
        report.networkErrors.push({ status, url, resolution: res.name });
      }
    });

    await page.addInitScript((tok) => {
      localStorage.setItem('grg_token', tok);
    }, token);

    await page.goto('http://127.0.0.1:4400/app#command', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    for (const viewId of TARGET_VIEWS) {
      try {
        console.log(`Switching to view: ${viewId} (${res.name})`);
        await page.evaluate((vid) => {
          if (typeof window.showView === 'function') {
            window.showView(vid);
          }
        }, viewId);

        // Give view time to render live data
        await page.waitForTimeout(1500);

        if (viewId === 'agents') {
          // Trigger fenixLoadAgents and wait for network/render
          await page.evaluate(async () => {
            if (typeof window.fenixLoadAgents === 'function') {
              try { await window.fenixLoadAgents(); } catch (e) {}
            }
          });
          await page.waitForTimeout(2000);
        }

        const shotPath = path.join(OUTPUT_DIR, `rebuilt_${res.name}_${viewId}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`  -> Captured: ${shotPath}`);

        if (res.name === '1080p') {
          const domStats = await page.evaluate((vid) => {
            const el = document.getElementById(`view-${vid}`);
            if (!el) return null;
            return {
              visible: window.getComputedStyle(el).display !== 'none',
              childCount: el.childElementCount,
              hasInspector: !!el.querySelector('.fenix-cockpit-inspector, [class*="inspector"]'),
              hasSquads: !!el.querySelector('.fenix-squad-group'),
              hasDockTray: !!el.querySelector('.fenix-ide-dock-tray'),
              deviceFrameBg: el.querySelector('#fenixDeviceFrame') ? window.getComputedStyle(el.querySelector('#fenixDeviceFrame')).backgroundColor : null
            };
          }, viewId);
          report.views[viewId] = domStats;
        }
      } catch (err) {
        console.error(`Error on ${viewId} at ${res.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, 'rebuilt_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nAudit completed successfully. Report saved to: ${reportPath}`);
}

runCapture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
