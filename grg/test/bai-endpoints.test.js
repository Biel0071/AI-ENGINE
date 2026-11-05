'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleBaiInstanceRoutes, computeGovernanceStats } = require('../src/api/bai-instance-routes');

function mockSendJson(captured) {
  return (res, status, data) => {
    captured.status = status;
    captured.data = data;
    return true;
  };
}

test('BAI readiness measures running instances and stays unknown when no profiles exist', () => {
  const profiles = Array.from({ length: 3 }, (_, index) => ({
    id: `profile-${index}`,
    state: index === 0 ? 'running' : 'stopped',
    config: { cookies: 'saved' }
  }));

  assert.equal(computeGovernanceStats(profiles).healthRate, 33);
  assert.equal(computeGovernanceStats([]).healthRate, null);
});

test('BAI Endpoints: GET /api/v2/browser/instance/status returns status and local instances', async () => {
  const captured = {};
  const req = { method: 'GET' };
  const res = {};
  const url = new URL('http://localhost:3000/api/v2/browser/instance/status');

  const handled = await handleBaiInstanceRoutes(req, res, url, mockSendJson(captured));
  assert.equal(handled, true);
  assert.equal(captured.status, 200);
  assert.ok(captured.data.localInstances);
  assert.equal(typeof captured.data.localInstances.totalInstances, 'number');
});

test('BAI Endpoints: GET /api/v2/browser/instances returns list and governance stats', async () => {
  const captured = {};
  const req = { method: 'GET' };
  const res = {};
  const url = new URL('http://localhost:3000/api/v2/browser/instances');

  const handled = await handleBaiInstanceRoutes(req, res, url, mockSendJson(captured));
  assert.equal(handled, true);
  assert.equal(captured.status, 200);
  assert.equal(captured.data.ok, true);
  assert.ok(Array.isArray(captured.data.instances));
  assert.ok(captured.data.instances.length > 0);
  assert.ok(captured.data.stats);
});

test('BAI Endpoints: GET /api/v2/browser/stats returns account governance metrics', async () => {
  const captured = {};
  const req = { method: 'GET' };
  const res = {};
  const url = new URL('http://localhost:3000/api/v2/browser/stats');

  const handled = await handleBaiInstanceRoutes(req, res, url, mockSendJson(captured));
  assert.equal(handled, true);
  assert.equal(captured.status, 200);
  assert.equal(captured.data.ok, true);
  assert.equal(typeof captured.data.connectedAccounts, 'number');
  assert.ok(captured.data.healthRate === null || typeof captured.data.healthRate === 'number');
});

test('BAI Endpoints: instance actions do not claim to run without an executor', async () => {
  const instancesCaptured = {};
  await handleBaiInstanceRoutes({ method: 'GET' }, {}, new URL('http://localhost:3000/api/v2/browser/instances'), mockSendJson(instancesCaptured));
  const testId = instancesCaptured.data.instances[0].id;
  const originalState = instancesCaptured.data.instances[0].state;
  const originalPid = instancesCaptured.data.instances[0].pid;

  const startCaptured = {};
  const startReq = { method: 'POST' };
  const startUrl = new URL('http://localhost:3000/api/v2/browser/instance/action');
  const readJson = async () => ({ instanceId: testId, action: 'start' });

  const handledStart = await handleBaiInstanceRoutes(startReq, {}, startUrl, mockSendJson(startCaptured), readJson);
  assert.equal(handledStart, true);
  assert.equal(startCaptured.status, 501);
  assert.equal(startCaptured.data.code, 'BAI_EXECUTOR_UNAVAILABLE');

  const afterAction = {};
  await handleBaiInstanceRoutes({ method: 'GET' }, {}, new URL('http://localhost:3000/api/v2/browser/instances'), mockSendJson(afterAction));
  assert.equal(afterAction.data.instances[0].state, originalState);
  assert.equal(afterAction.data.instances[0].pid, originalPid);
});

test('BAI Endpoints: GET /api/v2/browser/flows and POST /api/v2/browser/flow/run executes steps', async () => {
  const flowsCaptured = {};
  const flowsReq = { method: 'GET' };
  const flowsUrl = new URL('http://localhost:3000/api/v2/browser/flows');
  await handleBaiInstanceRoutes(flowsReq, {}, flowsUrl, mockSendJson(flowsCaptured));
  assert.equal(flowsCaptured.status, 200);
  assert.ok(Array.isArray(flowsCaptured.data.flows));
  assert.ok(flowsCaptured.data.flows.length > 0);

  const runCaptured = {};
  const runReq = { method: 'POST' };
  const runUrl = new URL('http://localhost:3000/api/v2/browser/flow/run');
  const readRunJson = async () => ({ flowId: flowsCaptured.data.flows[0].id });

  const handledRun = await handleBaiInstanceRoutes(runReq, {}, runUrl, mockSendJson(runCaptured), readRunJson);
  assert.equal(handledRun, true);
  assert.equal(runCaptured.status, 200);
  assert.equal(runCaptured.data.status, 'SUCCESS');
  assert.ok(runCaptured.data.timeline.length > 0);
});

test('BAI Endpoints: POST /api/v2/browser/navigate navigates and measures latency', async () => {
  const navCaptured = {};
  const navReq = { method: 'POST' };
  const navUrl = new URL('http://localhost:3000/api/v2/browser/navigate');
  const readNavJson = async () => ({ url: 'http://127.0.0.1:3000/app' });

  const handledNav = await handleBaiInstanceRoutes(navReq, {}, navUrl, mockSendJson(navCaptured), readNavJson);
  assert.equal(handledNav, true);
  assert.equal(navCaptured.status, 200);
  assert.equal(navCaptured.data.ok, true);
  assert.equal(typeof navCaptured.data.latencyMs, 'number');
});
