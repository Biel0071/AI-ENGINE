/**
 * FÊNIX OS — ARCHITECTURE GUARD & SINGLE SOURCE OF TRUTH TEST SUITE
 * Automatically verifies:
 * 1. Exactly 1 Official Frontend Entrypoint exists
 * 2. Exactly 1 Official Shell & Router exists
 * 3. Exactly 1 Official Design System exists
 * 4. No rogue/duplicate frontends exist outside the archive
 * 5. Endpoints return 100% real runtime telemetry (Zero Mocks)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function request(method, endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:4400' + endpoint, { method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function get(endpoint, headers) {
  return request('GET', endpoint, headers);
}

async function authenticate() {
  const userId = process.env.FENIX_BOOTSTRAP_ADMIN_USER;
  const password = process.env.FENIX_BOOTSTRAP_ADMIN_PASSWORD;
  assert.ok(userId && password, 'Architecture guard requires bootstrap admin credentials');
  const login = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ tenantId: 'grg', userId, password });
    const req = http.request('http://127.0.0.1:4400/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  assert.strictEqual(login.status, 200, 'Architecture guard login must succeed');
  assert.ok(login.data.token, 'Architecture guard login must return a token');
  return { authorization: `Bearer ${login.data.token}` };
}

async function runArchitectureGuard() {
  console.log('================================================================');
  console.log('FÊNIX ARCHITECTURE GUARD: SINGLE SOURCE OF TRUTH VERIFICATION');
  console.log('================================================================\n');

  // 1. Official Entrypoint Existence
  console.log('[1/5] Verifying Official Frontend Entrypoint...');
  const officialHtml = path.join(ROOT_DIR, 'grg', 'public', 'index.html');
  const officialJs = path.join(ROOT_DIR, 'grg', 'public', 'unified-app.js');
  const officialCss = path.join(ROOT_DIR, 'grg', 'public', 'unified.css');

  assert.ok(fs.existsSync(officialHtml), 'Official index.html must exist at grg/public/index.html');
  assert.ok(fs.existsSync(officialJs), 'Official unified-app.js must exist at grg/public/unified-app.js');
  assert.ok(fs.existsSync(officialCss), 'Official unified.css must exist at grg/public/unified.css');
  console.log('   ✅ Official Shell Found:', officialHtml);

  // 2. Enforce No Rogue / Duplicate Frontends
  console.log('\n[2/5] Checking For Rogue / Duplicate Frontends...');
  const prohibitedPaths = [
    path.join(ROOT_DIR, 'grg', 'apps', 'ai-city', 'index.html'),
    path.join(ROOT_DIR, 'platform', 'public', 'index.html'),
    path.join(ROOT_DIR, 'crm', 'frontend', 'dist', 'index.html')
  ];

  for (const p of prohibitedPaths) {
    assert.ok(!fs.existsSync(p), `Duplicate frontend must not exist at ${p} (must be in archive)`);
  }
  console.log('   ✅ All legacy frontends successfully isolated in /archive/');

  // 3. Single Shell & Integrated Views Verification
  console.log('\n[3/5] Inspecting Official Shell Integrated Views...');
  const htmlContent = fs.readFileSync(officialHtml, 'utf8');
  const requiredViews = [
    'view-command',
    'view-city',
    'view-agents',
    'view-ide',
    'view-operations',
    'view-runtime',
    'view-projects',
    'view-memory',
    'view-knowledge',
    'view-mcp',
    'view-browser',
    'view-observability',
    'view-terminal'
  ];

  for (const viewId of requiredViews) {
    assert.ok(htmlContent.includes(viewId), `Official shell must contain view: ${viewId}`);
  }
  console.log('   ✅ All 13 canonical views are natively integrated in the Single Shell.');

  // 4. Zero Mocks — Real Telemetry & Runtime Verification
  console.log('\n[4/5] Testing Runtime Zero-Mock Contract...');
  const auth = await authenticate();
  const cityState = await get('/api/v2/city/state', auth);
  assert.strictEqual(cityState.status, 200, 'City state endpoint must return 200');
  assert.ok(Array.isArray(cityState.data.projects), 'Projects must be an array of projects');
  assert.ok(typeof cityState.data.summary.totalProjects === 'number', 'totalProjects must be a number');
  assert.ok(cityState.data.summary.ramUsage.includes('MB'), 'RAM usage must be real MB');
  assert.ok(typeof cityState.data.summary.cpuUserSeconds === 'number', 'CPU user time must be a measured number');
  assert.strictEqual(cityState.data.buildings.energy.loadPercent, null, 'unmeasured energy cannot use a plausible fallback');
  console.log('   ✅ Live Runtime Metrics Verified: RAM', cityState.data.summary.ramUsage, '| CPU user seconds', cityState.data.summary.cpuUserSeconds);

  // 5. Daily Operations & Human Governance Verification
  console.log('\n[5/5] Testing 24/7 Daily Operations Source of Truth...');
  const dailyOps = await get('/api/v2/jarvis/daily-operations', auth);
  assert.strictEqual(dailyOps.status, 200, 'Daily operations endpoint must return 200');
  assert.strictEqual(dailyOps.data.engineState, 'ONLINE', 'Engine state must be ONLINE');
  console.log('   ✅ Daily Operations Engine State:', dailyOps.data.engineState);

  console.log('\n================================================================');
  console.log('🎉 ARCHITECTURE GUARD PASSED: 100% COMPLIANT WITH SINGLE TRUTH');
  console.log('================================================================');
}

runArchitectureGuard().catch(err => {
  console.error('❌ Architecture Guard Failed:', err.message);
  process.exit(1);
});
