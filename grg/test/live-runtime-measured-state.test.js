const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/live-runtime.js'), 'utf8');

function extractFunction(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`\n  function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `${name} source should exist`);
  return source.slice(start, end);
}

function makeSandbox() {
  const emitted = [];
  const live = { status: 'OFFLINE', jobs: [], agents: [], missions: [], projects: [], events: [], eventsMeasured: false, queue: {} };
  const sandbox = {
    window: { FENIX: { live } },
    WebSocket: { OPEN: 1 },
    ws: null,
    emit: (type, payload) => emitted.push({ type, payload }),
    updateStatus() {},
    updateQueueMetrics() {},
    ensureJob() {},
    updateJob() {},
    updateAgent() {},
    updateMission() {},
    Math,
    Date,
    Set,
    String
  };
  return { sandbox, live, emitted };
}

test('an empty snapshot is measured only when the API explicitly returns its collections', () => {
  const { sandbox, live } = makeSandbox();
  vm.runInNewContext(`${extractFunction('applySnapshot', 'applyEvent')}\nglobalThis.applySnapshot = applySnapshot;`, sandbox);

  sandbox.applySnapshot({});
  assert.equal(live.snapshotMeasured, false);
  assert.equal(live.agentsMeasured, false);
  assert.equal(live.eventsMeasured, false);

  sandbox.applySnapshot({ payload: { agents: [], missions: [], projects: [], jobs: [], events: [] } });
  assert.equal(live.snapshotMeasured, true);
  assert.equal(live.agentsMeasured, true);
  assert.equal(live.eventsMeasured, true);
});

test('heartbeats stay out of event history while runtime events carry a real source marker', () => {
  const { sandbox, live, emitted } = makeSandbox();
  vm.runInNewContext(`${extractFunction('applyEvent', 'ensureJob')}\nglobalThis.applyEvent = applyEvent;`, sandbox);

  sandbox.applyEvent({ type: 'runtime.heartbeat', at: '2026-10-13T00:00:00.000Z', payload: {} });
  assert.equal(live.eventsMeasured, false);
  assert.equal(live.events.length, 0);

  sandbox.applyEvent({ id: 'evt-1', type: 'project.updated', at: '2026-10-13T00:00:01.000Z', payload: { projectId: 'fenix' } });
  assert.equal(live.eventsMeasured, true);
  assert.equal(live.events[0].source, 'runtime-event');
  assert.equal(emitted.at(-1).payload.source, 'runtime-event');
});

test('concurrent runtime snapshot requests share one HTTP request', async () => {
  let resolveFetch;
  let fetchCalls = 0;
  const { sandbox } = makeSandbox();
  sandbox.snapshotInFlight = null;
  sandbox.snapshotRetryAt = 0;
  sandbox.snapshotFailureCount = 0;
  sandbox.getLiveToken = () => '';
  sandbox.fetch = () => {
    fetchCalls += 1;
    return new Promise((resolve) => { resolveFetch = resolve; });
  };
  sandbox.AbortSignal = { timeout: () => ({}) };
  sandbox.applySnapshot = () => {};
  vm.runInNewContext(`${extractFunction('requestSnapshot', 'startPing')}\nglobalThis.requestSnapshot = requestSnapshot;`, sandbox);

  const first = sandbox.requestSnapshot();
  const second = sandbox.requestSnapshot();
  assert.strictEqual(second, first);
  assert.equal(fetchCalls, 1);

  resolveFetch({ ok: true, json: async () => ({ agents: [] }) });
  await first;
});

test('unauthorized snapshot failures back off instead of hitting the API on each reconnect', async () => {
  let now = 1000;
  let fetchCalls = 0;
  const { sandbox } = makeSandbox();
  sandbox.snapshotInFlight = null;
  sandbox.snapshotRetryAt = 0;
  sandbox.snapshotFailureCount = 0;
  sandbox.Date = { now: () => now };
  sandbox.getLiveToken = () => '';
  sandbox.fetch = async () => {
    fetchCalls += 1;
    return { ok: false, status: 401, headers: { get: () => null } };
  };
  sandbox.AbortSignal = { timeout: () => ({}) };
  sandbox.applySnapshot = () => {};
  vm.runInNewContext(`${extractFunction('requestSnapshot', 'startPing')}\nglobalThis.requestSnapshot = requestSnapshot;`, sandbox);

  await sandbox.requestSnapshot();
  await sandbox.requestSnapshot();
  assert.equal(fetchCalls, 1);

  now += 60000;
  await sandbox.requestSnapshot();
  assert.equal(fetchCalls, 2);
});

test('closed runtime sockets release stale global and request-guard registrations', () => {
  const { sandbox } = makeSandbox();
  const socket = {};
  const registered = new Map([['webSocket', socket]]);
  sandbox.window.__FENIX_WS__ = socket;
  sandbox.window.FENIX.ws = socket;
  sandbox.window.__FENIX_SINGLETONS__ = {
    get: (key) => registered.get(key) || null,
    remove: (key, instance) => registered.get(key) === instance && registered.delete(key)
  };
  vm.runInNewContext(`${extractFunction('releaseWebSocket', 'requestSnapshot')}\nglobalThis.releaseWebSocket = releaseWebSocket;`, sandbox);

  sandbox.releaseWebSocket(socket);

  assert.equal(sandbox.window.__FENIX_WS__, null);
  assert.equal(sandbox.window.FENIX.ws, null);
  assert.equal(registered.has('webSocket'), false);
});
