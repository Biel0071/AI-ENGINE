const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { handleLivingCityRoutes } = require('../src/api/living-city-routes');

test('REALITY AUDIT 1: Living City Events endpoint returns 200 and structured real events', async () => {
  const req = {
    method: 'GET',
    headers: {}
  };
  const url = new URL('http://localhost:4400/api/v2/living-city/events?category=ALL&limit=10');
  let statusCode = null;
  let responseData = null;
  const sendJson = (res, code, data) => {
    statusCode = code;
    responseData = data;
    return true;
  };

  const app = {
    controlPlane: { authorize: async () => true },
    jobs: { list: async () => [{ id: 'job-real-1', type: 'system.audit', status: 'COMPLETED', progress: 100 }] },
    store: { read: async () => ({ agents: [], agentProfiles: [] }) },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] }
  };
  const identity = { tenantId: 'grg', actorId: 'admin' };

  const handled = await handleLivingCityRoutes(req, {}, url, app, sendJson, identity);
  assert.equal(handled, true, 'living-city/events route must be handled');
  assert.equal(statusCode, 200, 'HTTP status must be 200');
  assert.equal(responseData.ok, true, 'Response must be ok: true');
  assert.ok(Array.isArray(responseData.events), 'Events must be an array');
  assert.equal(responseData.source, 'LivingCityEvents/EventBus', 'Source must be truthful EventBus');
});

test('REALITY AUDIT 2: Living City SSE Stream endpoint writes event-stream headers', async () => {
  let headersWritten = {};
  let statusWritten = null;
  let chunksWritten = [];
  const req = {
    method: 'GET',
    headers: {},
    on: (evt, cb) => {}
  };
  const res = {
    writeHead: (code, headers) => {
      statusWritten = code;
      headersWritten = headers;
    },
    write: (chunk) => {
      chunksWritten.push(chunk);
    },
    on: (evt, cb) => {}
  };
  const url = new URL('http://localhost:4400/api/v2/living-city/events/stream');
  const app = {};
  const sendJson = () => {};
  const identity = { tenantId: 'grg', actorId: 'admin' };

  const handled = await handleLivingCityRoutes(req, res, url, app, sendJson, identity);
  assert.equal(handled, true, 'SSE stream route must be handled');
  assert.equal(statusWritten, 200, 'SSE status must be 200');
  assert.match(headersWritten['Content-Type'], /text\/event-stream/, 'Must write text/event-stream header');
  assert.ok(chunksWritten.some(c => c.includes('connected')), 'Must write connected handshake');
});

test('REALITY AUDIT 3: Zero-Mock verification in fenix-v11-interactions.js', () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/fenix-v11-interactions.js'), 'utf-8');
  assert.ok(!code.includes("'368 nós integrados'"), 'Must NOT contain hardcoded "368 nós integrados"');
  assert.ok(!code.includes("'42 memórias ativas'"), 'Must NOT contain hardcoded "42 memórias ativas"');
  assert.ok(!code.includes("types.TASK || 23"), 'Must NOT contain hardcoded fallback types.TASK || 23');
  assert.ok(!code.includes("types.TEST || 33"), 'Must NOT contain hardcoded fallback types.TEST || 33');
  assert.ok(code.includes('window.__fenixLiveMemoryClusters'), 'Must use dynamic window.__fenixLiveMemoryClusters');
});

test('REALITY AUDIT 4: Zero-Mock verification in fenix-operational-os.js', () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/fenix-operational-os.js'), 'utf-8');
  assert.ok(!code.includes("cpuVal.textContent = '1.2%'"), 'Must NOT contain fake CPU fallback "1.2%"');
  assert.ok(!code.includes("ramVal.textContent = '24%'"), 'Must NOT contain fake RAM fallback "24%"');
  assert.ok(!code.includes("evtCount ? evtCount.textContent = '24'"), 'Must NOT contain fake 24 events');
  assert.ok(code.includes(": '—')"), 'Must provide honest absence fallback for unmeasured metrics');
});

test('REALITY AUDIT 5: Universal Fetch Interceptor & Canonical View Dispatch in index.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf-8');
  assert.ok(html.includes('window.fetch = function(input, init)'), 'Must contain global fetch interceptor');
  assert.ok(html.includes('Authorization') && html.includes('Bearer'), 'Interceptor must attach Bearer token');
  assert.ok(html.includes('window.fenixLoadAgents()'), 'Router must dispatch window.fenixLoadAgents');
  assert.ok(html.includes('window.loadLiveOperations()'), 'Router must dispatch window.loadLiveOperations');
  assert.ok(html.includes('window.loadIdeView()'), 'Router must dispatch window.loadIdeView');
});
