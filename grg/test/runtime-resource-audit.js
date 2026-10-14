/**
 * FÊNIX OS — RUNTIME RESOURCE & STABILIZATION AUDIT TEST
 * 
 * Verifies:
 * 1. Singleton Registry (Health Monitor, Polling Manager, EventSource, WebSocket, Three.js Loop, World Engine, Copilot, Selection Store)
 * 2. Request Deduplication (Inflight Map returns same promise)
 * 3. Concurrency Limiter (MAX_FETCH_INFLIGHT = 12 budget)
 * 4. AbortController View-Level Cancellation
 * 5. Exponential Backoff (5s -> 10s -> 20s -> 40s -> 60s max)
 * 6. Hydration Lock (no duplicate concurrent executions)
 * 7. WebGL Loop Throttling & Resource Cleanup on Dispose
 * 8. Static Invariant Checks on canonical files
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const RequestGuard = require('../public/fenix-request-guard.js');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
    failedTests++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
    failedTests++;
  }
}

async function runAudit() {
  console.log('=======================================================================');
  console.log('FÊNIX OS — RUNTIME RESOURCE & STABILIZATION AUDIT (V17.1)');
  console.log('=======================================================================\n');

  // --- 1. SINGLETON REGISTRY ENFORCEMENT ---
  console.log('--- 1. SINGLETON REGISTRY AUDIT ---');
  test('Singletons registry prevents duplicate instances', () => {
    RequestGuard.Singletons.clearAll();
    const instA = { id: 'health-1' };
    const instB = { id: 'health-2' };

    const first = RequestGuard.Singletons.register('healthMonitor', instA);
    assert.strictEqual(first, instA);
    assert.strictEqual(RequestGuard.Singletons.get('healthMonitor'), instA);

    // Attempt duplicate registration
    const second = RequestGuard.Singletons.register('healthMonitor', instB);
    assert.strictEqual(second, instA, 'Should return existing singleton and reject replacement');
    assert.strictEqual(RequestGuard.Singletons.get('healthMonitor'), instA);
  });

  test('Singletons registry tracks all canonical engine roles', () => {
    RequestGuard.Singletons.clearAll();
    const roles = [
      'healthMonitor',
      'pollingManager',
      'eventSource:/api/v2/events/stream',
      'webSocket',
      'threeRenderLoop',
      'worldEngine',
      'copilot',
      'globalSelectionStore'
    ];

    roles.forEach(role => {
      RequestGuard.Singletons.register(role, { role, initializedAt: Date.now() });
      assert.ok(RequestGuard.Singletons.has(role), `Role ${role} must be registered`);
    });

    const all = RequestGuard.Singletons.getAll();
    assert.strictEqual(Object.keys(all).length, 8, 'Must have exactly 8 canonical singleton roles');
  });

  // --- 2. REQUEST DEDUPLICATION ---
  console.log('\n--- 2. REQUEST DEDUPLICATION AUDIT ---');
  await asyncTest('Simultaneous idempotent GET requests return the exact same in-flight Promise', async () => {
    let rawFetchCalls = 0;
    globalThis.fetch = (url) => {
      rawFetchCalls++;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ status: 200, ok: true, json: async () => ({ endpoint: url }) });
        }, 50);
      });
    };

    const req1 = RequestGuard.request('/api/missions');
    const req2 = RequestGuard.request('/api/missions');
    const req3 = RequestGuard.request('/api/missions');

    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(rawFetchCalls, 1, 'Only 1 raw fetch call should have occurred for 3 parallel requests');
  });

  // --- 3. CONCURRENCY LIMITS & BUDGET ---
  console.log('\n--- 3. CONCURRENCY LIMITS AUDIT ---');
  await asyncTest('Rejects requests exceeding MAX_FETCH_INFLIGHT budget (12)', async () => {
    const resolvers = [];
    globalThis.fetch = () => new Promise(resolve => resolvers.push(resolve));

    const promises = [];
    for (let i = 0; i < 12; i++) {
      promises.push(RequestGuard.request(`/api/endpoint-${i}`));
    }

    assert.strictEqual(RequestGuard.getInflightCount(), 12, 'Inflight count should reach budget limit 12');

    // 13th call must be rejected
    let rejected = false;
    try {
      await RequestGuard.request('/api/endpoint-overflow');
    } catch (err) {
      rejected = true;
      assert.ok(err.message.includes('resource limit exceeded'), `Error message must cite resource limit: ${err.message}`);
    }
    assert.ok(rejected, 'Request 13 should have been rejected');

    // Clean up
    resolvers.forEach(r => r({ status: 200, ok: true }));
    await Promise.all(promises);
    assert.strictEqual(RequestGuard.getInflightCount(), 0, 'Inflight count should return to 0');
  });

  // --- 4. ABORTCONTROLLER VIEW-LEVEL CANCELLATION ---
  console.log('\n--- 4. ABORTCONTROLLER VIEW CANCELLATION AUDIT ---');
  await asyncTest('cancelViewRequests aborts all in-flight requests for a given view', async () => {
    let abortedCount = 0;
    globalThis.fetch = (url, opts) => new Promise((resolve, reject) => {
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => {
          abortedCount++;
          reject(new Error('AbortError: Request was cancelled'));
        });
      }
    });

    const p1 = RequestGuard.request('/api/heavy-1', {}, 'view-projects').catch(e => e);
    const p2 = RequestGuard.request('/api/heavy-2', {}, 'view-projects').catch(e => e);
    const p3 = RequestGuard.request('/api/heavy-3', {}, 'view-command').catch(e => e);

    assert.ok(RequestGuard.getActiveViewsWithRequests().includes('view-projects'));

    // Cancel view-projects
    RequestGuard.cancelViewRequests('view-projects');

    const [err1, err2] = await Promise.all([p1, p2]);
    assert.strictEqual(abortedCount, 2, '2 requests should have received abort signals');
    assert.ok(err1.message.includes('cancelled') || err1.name === 'AbortError');
    assert.ok(err2.message.includes('cancelled') || err2.name === 'AbortError');
  });

  // --- 5. EXPONENTIAL BACKOFF AUDIT ---
  console.log('\n--- 5. EXPONENTIAL BACKOFF AUDIT ---');
  test('Exponential backoff progresses correctly and clamps at maxMs', () => {
    const backoff = RequestGuard.createBackoff({ initialMs: 5000, maxMs: 60000, factor: 2 });
    assert.strictEqual(backoff.currentDelay, 5000);

    const d1 = backoff.nextDelay();
    assert.strictEqual(d1, 5000);
    assert.strictEqual(backoff.currentDelay, 10000);

    const d2 = backoff.nextDelay();
    assert.strictEqual(d2, 10000);
    assert.strictEqual(backoff.currentDelay, 20000);

    const d3 = backoff.nextDelay();
    assert.strictEqual(d3, 20000);
    assert.strictEqual(backoff.currentDelay, 40000);

    const d4 = backoff.nextDelay();
    assert.strictEqual(d4, 40000);
    assert.strictEqual(backoff.currentDelay, 60000);

    const d5 = backoff.nextDelay();
    assert.strictEqual(d5, 60000);
    assert.strictEqual(backoff.currentDelay, 60000, 'Should not exceed maxMs 60000');

    backoff.reset();
    assert.strictEqual(backoff.currentDelay, 5000, 'Reset should restore initialMs');
  });

  // --- 6. HYDRATION LOCK AUDIT ---
  console.log('\n--- 6. HYDRATION LOCK AUDIT ---');
  await asyncTest('Hydration lock prevents overlapping concurrent hydration cycles', async () => {
    let executions = 0;
    const task = async () => {
      executions++;
      await new Promise(r => setTimeout(r, 60));
      return 'done';
    };

    const call1 = RequestGuard.runLockedHydration('testHydrate', task);
    const call2 = RequestGuard.runLockedHydration('testHydrate', task);
    assert.strictEqual(call1, call2, 'Subsequent hydration call while locked must return existing promise');

    const res = await Promise.all([call1, call2]);
    assert.deepStrictEqual(res, ['done', 'done']);
    assert.strictEqual(executions, 1, 'Task should only execute once');
  });

  // --- 7. STATIC INVARIANT INSPECTION ---
  console.log('\n--- 7. CODEBASE REALITY & STABILIZATION INVARIANTS ---');
  test('index.html loads fenix-request-guard.js before application scripts', () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('fenix-request-guard.js'), 'index.html must load fenix-request-guard.js');
    const guardIndex = html.indexOf('fenix-request-guard.js');
    const appIndex = html.indexOf('unified-app.js');
    assert.ok(guardIndex < appIndex, 'fenix-request-guard.js must be loaded before unified-app.js');
  });

  test('runtime-cockpit.js does NOT execute 18 unconditional parallel loaders', () => {
    const cockpitPath = path.join(__dirname, '..', 'public', 'runtime-cockpit.js');
    const cockpit = fs.readFileSync(cockpitPath, 'utf8');
    // Ensure core vs lazy separation exists
    assert.ok(cockpit.includes('CORE ESSENTIAL LOADERS'), 'runtime-cockpit.js must feature Core vs Lazy separation');
    assert.ok(cockpit.includes('LAZY / SOB DEMANDA LOADERS'), 'runtime-cockpit.js must feature Lazy loaders');
    assert.ok(cockpit.includes('isHydrating'), 'runtime-cockpit.js must enforce isHydrating lock');
    assert.ok(cockpit.includes('hydrateFenixDomain'), 'runtime-cockpit.js must expose lazy domain hydration hook');
  });

  test('fenix-mascot-sidebar.js guards against duplicate copilot instances and stops unconditionally polling every 10s', () => {
    const sidebarPath = path.join(__dirname, '..', 'public', 'fenix-mascot-sidebar.js');
    const sidebar = fs.readFileSync(sidebarPath, 'utf8');
    assert.ok(sidebar.includes('window.__FENIX_COPILOT_INSTANCE__'), 'Must guard against duplicate copilot initialization');
    assert.ok(sidebar.includes('state.isOpen && !document.hidden'), 'Telemetry polling must be conditional on open & visible');
  });

  test('fenix-world-3d.js checks document.hidden & view-city in _animate() loop and implements dispose()', () => {
    const worldPath = path.join(__dirname, '..', 'public', 'fenix-world-3d.js');
    const world = fs.readFileSync(worldPath, 'utf8');
    assert.ok(world.includes('document.hidden || !isCityActive'), 'Render loop must pause when hidden or city inactive');
    assert.ok(world.includes('dispose() {'), 'fenix-world-3d.js must implement dispose()');
    assert.ok(world.includes('obj.geometry.dispose'), 'dispose() must clean up geometries');
    assert.ok(world.includes('mat.dispose'), 'dispose() must clean up materials');
  });

  console.log('\n=======================================================================');
  console.log(`RUNTIME RESOURCE AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed.`);
  console.log('=======================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit();
