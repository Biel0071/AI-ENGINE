const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/unified-app.js'), 'utf8');
const missionHelperSource = source.match(/const OPEN_MISSION_STATUSES\s*=\s*new Set\([\s\S]*?window\.fenixIsMissionOpen\s*=\s*function\(mission\)\s*\{[\s\S]*?^\};/m)?.[0];
const functionSource = source.match(/window\.updateSidebarCounters\s*=\s*function\(snapshot\)\s*\{[\s\S]*?^\};/m)?.[0];
assert.ok(missionHelperSource, 'shared open mission status helper must exist');
assert.ok(functionSource, 'updateSidebarCounters must exist');

function renderCounters({ jobs, snapshotJobs, snapshot, cityAgents } = {}) {
  const elements = new Map();
  const document = { getElementById: (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: '', closest: () => null });
    return elements.get(id);
  } };
  const window = {
    state: { jobs, data: snapshotJobs === undefined ? {} : { jobs: snapshotJobs } },
    FENIX: cityAgents ? { cityWorld: { snapshot: { agents: cityAgents } } } : {},
    renderSidebarCompanies() {},
  };
  vm.runInNewContext(`${missionHelperSource}\n${functionSource}`, { window, document });
  window.updateSidebarCounters(snapshot === undefined ? { jobs: snapshotJobs } : snapshot);
  return Object.fromEntries([
    'sidebarCountAgents', 'sidebarCountMissions', 'sidebarCountProjects', 'sidebarCountEvents', 'sidebarCountCompanies',
    'topbarStatSystem', 'topKpiAgentsVal', 'topKpiMissionsVal', 'topKpiJobsVal', 'topKpiSystemVal',
  ].map((id) => [id, elements.get(id).textContent]));
}

test('jobs KPI counts only jobs currently executing', () => {
  const value = renderCounters({ jobs: [
    { status: 'RUNNING' },
    { status: 'ACTIVE' },
    { status: 'DISPATCHED' },
    { status: 'SUCCEEDED' },
    { status: 'FAILED' },
  ], snapshotJobs: { jobs: [] } });
  assert.equal(value.topKpiJobsVal, '3');
});

test('jobs KPI shows an unavailable marker before a jobs source is loaded', () => {
  assert.equal(renderCounters().topKpiJobsVal, '—');
});

test('unloaded telemetry remains unavailable instead of showing zero or healthy', () => {
  const values = renderCounters();
  assert.equal(values.sidebarCountAgents, '—');
  assert.equal(values.sidebarCountMissions, '—');
  assert.equal(values.sidebarCountProjects, '—');
  assert.equal(values.sidebarCountEvents, '—');
  assert.equal(values.sidebarCountCompanies, '—');
  assert.equal(values.topbarStatSystem, 'Indisponível');
  assert.equal(values.topKpiAgentsVal, '—');
  assert.equal(values.topKpiMissionsVal, '—');
  assert.equal(values.topKpiSystemVal, 'Indisponível');
});

test('a real empty snapshot remains zero rather than unavailable', () => {
  const values = renderCounters({ snapshot: {
    agents: [], missions: [], projects: [], events: [], companies: [], jobs: [], health: { status: 'degraded' },
  } });
  assert.equal(values.sidebarCountAgents, '0');
  assert.equal(values.sidebarCountMissions, '0');
  assert.equal(values.sidebarCountProjects, '0');
  assert.equal(values.sidebarCountEvents, '0');
  assert.equal(values.sidebarCountCompanies, '(0)');
  assert.equal(values.topKpiAgentsVal, '0');
  assert.equal(values.topKpiMissionsVal, '0');
  assert.equal(values.topKpiJobsVal, '0');
  assert.equal(values.topKpiSystemVal, 'DEGRADED');
});

test('online agent KPI uses City runtime presence when the registry only has enrollment status', () => {
  const values = renderCounters({
    snapshot: { agents: [{ id: 'a-1', status: 'ACTIVE' }, { id: 'a-2', status: 'ACTIVE' }] },
    cityAgents: [{ id: 'c-1', status: 'AVAILABLE' }, { id: 'c-2', status: 'WORKING' }, { id: 'c-3', status: 'OFFLINE' }],
  });
  assert.equal(values.topKpiAgentsVal, '2', 'ACTIVE is enrollment, not presence; runtime AVAILABLE/WORKING are online');
});

test('online agent KPI stays unavailable when roster has no measured presence state', () => {
  const values = renderCounters({ snapshot: {
    agents: [{ id: 'a-1', name: 'Agent A' }, { id: 'a-2', name: 'Agent B' }],
  } });
  assert.equal(values.sidebarCountAgents, '2');
  assert.equal(values.topKpiAgentsVal, '—');
});

test('online agent KPI counts measured online and offline states only', () => {
  const values = renderCounters({ snapshot: {
    agents: [{ id: 'a-1', status: 'ONLINE' }, { id: 'a-2', status: 'OFFLINE' }],
  } });
  assert.equal(values.sidebarCountAgents, '2');
  assert.equal(values.topKpiAgentsVal, '1');
});

test('awaiting-approval missions are counted as active work', () => {
  const values = renderCounters({ snapshot: {
    missions: [{ id: 'mission-1', status: 'AWAITING_APPROVAL' }, { id: 'mission-2', status: 'SUCCEEDED' }],
  } });
  assert.equal(values.topKpiMissionsVal, '1');
});
