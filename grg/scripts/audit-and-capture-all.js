const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const CANONICAL_VIEWS = [
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

const VIEWPORTS = [
  { name: '1080p', width: 1920, height: 1080 },
  { name: 'laptop', width: 1440, height: 900 },
  { name: 'standard', width: 1366, height: 768 },
  { name: 'compact', width: 1280, height: 720 }
];

async function login(baseUrl) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      tenantId: 'grg',
      userId: 'grg-admin',
      password: 'admin'
    });
    const req = http.request(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runAudit(mode = 'baseline') {
  const baseUrl = process.env.FENIX_BASE_URL || 'http://127.0.0.1:4400';
  console.log(`[AUDIT] Starting Fênix OS Playwright Audit (${mode}) on ${baseUrl}...`);

  const loginRes = await login(baseUrl);
  const token = loginRes.token;
  if (!token) throw new Error('Failed to obtain auth token: ' + JSON.stringify(loginRes));
  console.log('[AUDIT] Authenticated successfully with token.');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const rootDocsDir = path.resolve(__dirname, '..', '..', '..', 'docs');
  const targetShotDir = path.join(rootDocsDir, 'screenshots', mode);
  const viewportDir = path.join(rootDocsDir, 'screenshots', 'viewports');
  fs.mkdirSync(targetShotDir, { recursive: true });
  fs.mkdirSync(viewportDir, { recursive: true });

  const auditReport = {
    timestamp: new Date().toISOString(),
    mode,
    baseUrl,
    views: {},
    consoleErrors: [],
    networkErrors: []
  };

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseUrl, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((val) => {
    localStorage.setItem('grg_token', val);
    localStorage.setItem('fenix_token', val);
  }, token);

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const entry = { type: 'console.error', text: msg.text(), location: msg.location() };
      auditReport.consoleErrors.push(entry);
      console.warn(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    const entry = { type: 'page.error', message: err.message, stack: err.stack };
    auditReport.consoleErrors.push(entry);
    console.error(`[PAGE CRASH] ${err.message}`);
  });

  page.on('requestfailed', req => {
    const errText = req.failure()?.errorText || 'unknown';
    if (errText === 'net::ERR_ABORTED') return;
    auditReport.networkErrors.push({ url: req.url(), error: errText });
  });

  console.log('[AUDIT] Loading initial app shell...');
  await page.goto(`${baseUrl}/app#command`, { waitUntil: 'commit', timeout: 15000 });
  await page.waitForTimeout(2500);

  // 1. Audit all 14 canonical views at 1440x900
  for (const viewId of CANONICAL_VIEWS) {
    console.log(`[AUDIT] Capturing view: ${viewId}...`);
    const viewStartTime = Date.now();

    await page.evaluate((id) => {
      if (typeof window.showView === 'function') {
        window.showView(id);
      }
    }, viewId);

    await page.waitForTimeout(1200);

    const shotFile = path.join(targetShotDir, `${viewId}-1440x900.png`);
    try {
      await page.screenshot({ path: shotFile, fullPage: false, timeout: 15000, animations: 'disabled' });
    } catch (shotErr) {
      console.warn(`[AUDIT] Screenshot timeout for ${viewId}: ${shotErr.message}`);
    }

    const viewState = await page.evaluate((id) => {
      const el = document.getElementById(`view-${id}`);
      if (!el) return { exists: false, visible: false, textLen: 0, childCount: 0 };
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none';
      return {
        exists: true,
        visible: isVisible,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        textLen: el.innerText ? el.innerText.trim().length : 0,
        childCount: el.children.length,
        hasErrorNotice: Boolean(el.querySelector('.fml-error-notice, .fenix-agent-load-error, .error, [role="alert"]')),
        hasLoadingNotice: Boolean(el.querySelector('.fenix-agent-loading, .loading, [role="status"]'))
      };
    }, viewId);

    auditReport.views[viewId] = {
      ...viewState,
      durationMs: Date.now() - viewStartTime,
      screenshot: shotFile
    };
  }

  // 2. Multi-viewport capture across the 4 required standard resolutions
  console.log('[AUDIT] Capturing multi-viewport matrix (1920x1080, 1440x900, 1366x768, 1280x720)...');
  for (const vp of VIEWPORTS) {
    console.log(`[AUDIT] Testing resolution: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);

    for (const viewId of ['city', 'command', 'memory', 'projects', 'agents', 'operations', 'runtime', 'browser']) {
      await page.evaluate((id) => window.showView(id), viewId);
      await page.waitForTimeout(600);
      const vpShot = path.join(viewportDir, `${viewId}-${vp.name}-${vp.width}x${vp.height}.png`);
      try {
        await page.screenshot({ path: vpShot, fullPage: false, timeout: 15000, animations: 'disabled' });
      } catch (shotErr) {
        console.warn(`[AUDIT] Viewport screenshot timeout for ${viewId} ${vp.name}: ${shotErr.message}`);
      }
    }
  }

  await browser.close();

  const reportPath = path.join(rootDocsDir, `audit-${mode}-report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
  console.log(`[AUDIT] Completed successfully! Report saved to ${reportPath}`);
  return auditReport;
}

const mode = process.argv[2] || 'baseline';
runAudit(mode).then(() => process.exit(0)).catch(err => {
  console.error('[AUDIT] Failed:', err);
  process.exit(1);
});
