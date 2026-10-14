const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/unified-app.js'), 'utf8');
const functionSource = source.match(/window\.updateSidebarCounters\s*=\s*function\(snapshot\)\s*\{[\s\S]*?^\};/m)?.[0];
assert.ok(functionSource, 'updateSidebarCounters must exist');

function renderCounters({ jobs, snapshotJobs, snapshot } = {}) {
  const elements = new Map();
  const document = { getElementById: (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: '' });
    return elements.get(id);
  } };
  const window = {
    state: { jobs, data: snapshotJobs === undefined ? {} : { jobs: snapshotJobs } },
    FENIX: {},
    renderSidebarCompanies() {},
  };
  vm.runInNewContext(functionSource, { window, document });
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
  assert.equal(values.topbarStatSystem, 'UNAVAILABLE');
  assert.equal(values.topKpiAgentsVal, '—');
  assert.equal(values.topKpiMissionsVal, '—');
  assert.equal(values.topKpiSystemVal, 'UNAVAILABLE');
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
