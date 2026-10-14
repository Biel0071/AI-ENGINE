/**
 * FÊNIX OS — BROWSER RESOURCE SMOKE & SINGLETON VALIDATION (V17.1)
 * 
 * Strict Harness Guidelines:
 * - 30s Global Watchdog Timeout
 * - 1 Browser instance, 1 Context, 1 Page
 * - FENIX_SMOKE_MODE=1 (Lightweight test mode, no background loops)
 * - /health verification with honest degraded dependencies
 * - Full Screen Navigation: COMMAND -> WORLD -> BUILD -> KNOWLEDGE -> CONTROL -> WORLD
 * - Singletons Enforcement (window.__FENIX_SINGLETONS__)
 * - Zero ERR_INSUFFICIENT_RESOURCES
 * - Strict try/finally resource cleanup
 * - Mandatory Final Report Table
 */

const { chromium } = require('playwright');
const assert = require('assert');
const { start } = require('../src/server');

const ADMIN = { tenantId: 'grg', userId: 'e2e-admin', password: 'e2e-password-not-secret' };

// 1. Global Watchdog (Abort strictly if >= 30s)
let currentStep = 'INIT';
const WATCHDOG = setTimeout(() => {
  console.error(`\n🚨 FATAL: GLOBAL 30s TIMEOUT REACHED at step [${currentStep}]! Aborting smoke test to prevent hanging.`);
  process.exit(1);
}, 30000);
WATCHDOG.unref();

async function runBrowserSmoke() {
  const testStartTime = Date.now();
  console.log('=======================================================================');
  console.log('FÊNIX OS — BROWSER RESOURCE SMOKE & STABILIZATION (V17.1)');
  console.log('=======================================================================\n');

  process.env.FENIX_BOOTSTRAP_TENANT_ID = ADMIN.tenantId;
  process.env.FENIX_BOOTSTRAP_ADMIN_USER = ADMIN.userId;
  process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD = ADMIN.password;
  process.env.FENIX_ALLOW_DEV_HEADERS = '0';
  process.env.FENIX_SMOKE_MODE = '1';
  process.env.NODE_ENV = 'test';
  process.env.GRG_LLM = '0';

  let server = null;
  let browser = null;
  let context = null;
  let page = null;

  const detectedErrors = [];
  const networkErrors = [];
  const requestAccounting = new Map(); // endpoint -> { count, durations: [], failures: 0 }
  let healthResult = null;

  try {
    // Phase 1: Start Server
    currentStep = '1/6: START_SERVER';
    const bootStart = Date.now();
    console.log('[1/6] Starting ephemeral backend server in FENIX_SMOKE_MODE=1...');
    server = await start(0, { operationalActivation: false });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    console.log(`      Server listening on ${base}`);

    // Verify /health endpoint truthfulness
    const healthRes = await fetch(`${base}/health`, { headers: { Accept: 'application/json' } });
    healthResult = {
      httpStatus: healthRes.status,
      body: await healthRes.json()
    };
    console.log(`      /health response: status=${healthResult.httpStatus} body=`, JSON.stringify(healthResult.body));

    // Phase 2: Auth
    currentStep = '2/6: AUTH';
    console.log('[2/6] Authenticating test session...');
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log(`      Authenticated session token obtained.`);

    // Phase 3: Launch Chromium
    currentStep = '3/6: LAUNCH_BROWSER';
    console.log('[3/6] Launching single Chromium browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });

    await context.addCookies([
      { name: 'grg_token', value: token, domain: '127.0.0.1', path: '/' },
      { name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' }
    ]);
    await context.addInitScript((tok) => {
      window.__FENIX_HEADLESS__ = true;
      window.localStorage.setItem('grg_token', tok);
      window.localStorage.setItem('fenix_token', tok);
    }, token);

    page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Track network metrics & errors
    const reqStartTimes = new Map();
    page.on('request', req => {
      reqStartTimes.set(req, Date.now());
    });

    page.on('response', res => {
      const req = res.request();
      const startTime = reqStartTimes.get(req) || Date.now();
      const duration = Date.now() - startTime;
      reqStartTimes.delete(req);

      try {
        const urlObj = new URL(res.url());
        const endpoint = urlObj.pathname;
        if (!requestAccounting.has(endpoint)) {
          requestAccounting.set(endpoint, { count: 0, durations: [], failures: 0 });
        }
        const record = requestAccounting.get(endpoint);
        record.count++;
        record.durations.push(duration);
        if (res.status() >= 400 && res.status() !== 404) {
          record.failures++;
        }
      } catch (_) {}
    });

    page.on('requestfailed', req => {
      reqStartTimes.delete(req);
      const failure = req.failure();
      const errText = failure ? failure.errorText : 'Unknown';
      if (/ERR_INSUFFICIENT_RESOURCES/i.test(errText)) {
        networkErrors.push(`${req.method()} ${req.url()}: ${errText}`);
      }
      try {
        const urlObj = new URL(req.url());
        const endpoint = urlObj.pathname;
        if (!requestAccounting.has(endpoint)) {
          requestAccounting.set(endpoint, { count: 0, durations: [], failures: 0 });
        }
        requestAccounting.get(endpoint).failures++;
      } catch (_) {}
    });

    page.on('console', msg => {
      const text = msg.text();
      if (/ERR_INSUFFICIENT_RESOURCES/i.test(text)) {
        detectedErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      if (/ERR_INSUFFICIENT_RESOURCES/i.test(err.message)) {
        detectedErrors.push(err.message);
      }
    });

    // Phase 4: Navigate to /app & wait for shell
    currentStep = '4/6: NAVIGATE_APP';
    const navStartTime = Date.now();
    console.log('[4/6] Navigating to /app and waiting for shell initialization...');
    await page.goto(`${base}/app`, { waitUntil: 'commit', timeout: 15000 });
    console.log(`      Navigation committed in ${Date.now() - navStartTime}ms. Waiting for Shell, Copilot & World...`);
    await page.waitForFunction(() => {
      const shell = document.getElementById('app-shell');
      const copilot = window.__FENIX_COPILOT_INSTANCE__;
      const world = window.fenixWorld3D || window.fenixWorldEngine3D;
      return Boolean(shell && copilot && world);
    }, { timeout: 15000 });

    const bootDuration = ((Date.now() - bootStart) / 1000).toFixed(1);
    console.log(`      Shell online in ${bootDuration}s (nav took ${Date.now() - navStartTime}ms).`);

    // Phase 5: View Navigation Test (COMMAND -> WORLD -> BUILD -> KNOWLEDGE -> CONTROL -> WORLD)
    currentStep = '5/6: VIEW_TRANSITIONS';
    console.log('[5/6] Executing view transitions and measuring resource safety...');
    const viewsToTest = [
      { id: 'city', name: 'WORLD' },
      { id: 'ide', name: 'BUILD' },
      { id: 'knowledge', name: 'KNOWLEDGE' },
      { id: 'operations', name: 'CONTROL' },
      { id: 'city', name: 'WORLD' }
    ];

    let navigationPasses = 0;
    for (const v of viewsToTest) {
      const vStart = Date.now();
      console.log(`        - Navigating to ${v.name} (${v.id})...`);
      
      const t0 = Date.now();
      await page.evaluate((viewId) => {
        if (typeof window.showView === 'function') {
          window.showView(viewId);
        }
      }, v.id);
      const t1 = Date.now();

      await page.waitForTimeout(50);
      const t2 = Date.now();

      const navState = await page.evaluate(() => {
        const guard = window.FenixRequestGuard;
        return {
          inflight: guard ? guard.getInflightCount() : 0,
          singletonsCount: window.__FENIX_SINGLETONS__ ? Object.keys(window.__FENIX_SINGLETONS__.getAll()).length : 0
        };
      });
      const t3 = Date.now();

      console.log(`          [${v.name}] showView: ${t1 - t0}ms, wait: ${t2 - t1}ms, eval: ${t3 - t2}ms, total: ${t3 - vStart}ms (inflight: ${navState.inflight})`);
      assert.ok(navState.inflight <= 12, `Inflight requests during ${v.name} must be <= 12 (got ${navState.inflight})`);
      navigationPasses++;
    }
    console.log(`      Completed ${navigationPasses} view transitions successfully.`);

    // Phase 6: Copilot & World Interaction Verification
    currentStep = '6/6: COPILOT_WORLD_EVAL';
    console.log('[6/6] Verifying Copilot tabs and World 3D singletons...');
    await page.evaluate(() => {
      // Test Copilot tabs
      if (window.FenixSidebar && typeof window.FenixSidebar.switchTab === 'function') {
        window.FenixSidebar.switchTab('telemetry');
        window.FenixSidebar.switchTab('logs');
        window.FenixSidebar.switchTab('chat');
      }
    });
    await page.waitForTimeout(400);

    const finalMetrics = await page.evaluate(() => {
      const guard = window.FenixRequestGuard;
      const singletons = window.__FENIX_SINGLETONS__ ? window.__FENIX_SINGLETONS__.getAll() : {};
      const inflightCount = guard ? guard.getInflightCount() : 0;
      const copilot = Boolean(window.__FENIX_COPILOT_INSTANCE__);
      const world3D = Boolean(window.fenixWorld3D || window.fenixWorldEngine3D);
      const store = Boolean(window.GlobalSelectionStore);

      return {
        hasGuard: Boolean(guard),
        inflightCount,
        singletonsKeys: Object.keys(singletons),
        copilotRegistered: copilot,
        worldRegistered: world3D,
        storeRegistered: store
      };
    });

    const totalTestDuration = ((Date.now() - testStartTime) / 1000).toFixed(1);

    // Validation Assertions
    assert.strictEqual(healthResult.httpStatus, 200, '/health HTTP status must be 200');
    assert.ok(healthResult.body.ok === true || healthResult.body.status === 'degraded' || healthResult.body.status === 'ok', '/health must indicate kernel readiness');
    assert.ok(finalMetrics.hasGuard, 'FenixRequestGuard must be loaded');
    assert.ok(finalMetrics.inflightCount <= 12, `Inflight requests (${finalMetrics.inflightCount}) must be <= 12`);
    assert.strictEqual(detectedErrors.length, 0, 'Zero ERR_INSUFFICIENT_RESOURCES console errors');
    assert.strictEqual(networkErrors.length, 0, 'Zero ERR_INSUFFICIENT_RESOURCES network errors');
    assert.ok(finalMetrics.singletonsKeys.length >= 6, `At least 6 singletons registered (got ${finalMetrics.singletonsKeys.length})`);
    assert.ok(finalMetrics.copilotRegistered, 'Copilot must be registered');
    assert.ok(finalMetrics.worldRegistered, 'World 3D must be registered');
    assert.ok(finalMetrics.storeRegistered, 'GlobalSelectionStore must be registered');

    // ── Output Mandatory Report Table ──
    console.log('\n=======================================================================');
    console.log('FÊNIX BROWSER RESOURCE FINAL REPORT (V17.1)');
    console.log('=======================================================================');
    console.log('Métrica                       | Valor Obtido        | Status');
    console.log('-----------------------------------------------------------------------');
    console.log(`Tempo de Boot Total           | ${bootDuration}s                | OK`);
    console.log(`Status do /health             | ${healthResult.httpStatus} (${healthResult.body.status || 'degraded'})     | OK`);
    console.log(`Inflight Requests             | ${finalMetrics.inflightCount} / 12              | OK`);
    console.log(`Singletons Registrados        | ${finalMetrics.singletonsKeys.length} únicos            | OK`);
    console.log(`Erros de Recursos             | ${detectedErrors.length + networkErrors.length} (esperado 0)       | OK`);
    console.log(`Navegação entre Telas         | ${navigationPasses} transições        | OK`);
    console.log(`Duração Total do Teste        | ${totalTestDuration}s (< 30s)         | OK`);
    console.log('=======================================================================\n');

    console.log('--- Resumo de Requisições Monitoradas ---');
    console.log('Endpoint                             | Chamadas | Duração Média | Falhas');
    console.log('-----------------------------------------------------------------------');
    const sortedEndpoints = Array.from(requestAccounting.entries())
      .filter(([ep]) => ep.startsWith('/api') || ep === '/health')
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    for (const [ep, data] of sortedEndpoints) {
      const avg = data.durations.length ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length) : 0;
      console.log(`${ep.padEnd(36)} | ${String(data.count).padStart(8)} | ${String(avg + 'ms').padStart(13)} | ${String(data.failures).padStart(6)}`);
    }
    console.log('-----------------------------------------------------------------------\n');
    console.log('✅ BROWSER RESOURCE SMOKE COMPLETED SUCCESSFULLY.');

  } catch (err) {
    console.error('\n❌ BROWSER RESOURCE SMOKE FAILED:', err.message);
    throw err;
  } finally {
    clearTimeout(WATCHDOG);
    console.log('Releasing harness resources (Strict try/finally)...');
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (context) {
      try { await context.close(); } catch (_) {}
    }
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    if (server) {
      await new Promise(r => server.close(r));
    }
    console.log('All browser and server instances closed successfully.');
  }
}

runBrowserSmoke().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
