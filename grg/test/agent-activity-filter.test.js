'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { filterAgentActivity, buildActivityFilterOptions } = require('../public/agent-activity-filter');

const now = Date.parse('2026-10-19T15:00:00.000Z');
const events = [
  { id: '1', type: 'mission.step.started', source: 'mission-kernel', subject: 'mission:alpha', occurredAt: '2026-10-19T14:30:00.000Z', data: { agentId: 'agent-api', missionId: 'alpha', jobId: 'job-7', severity: 'INFO' } },
  { id: '2', type: 'job.failed', source: 'job-engine', subject: 'job:job-8', occurredAt: '2026-10-18T10:00:00.000Z', data: { agent: { id: 'agent-camila' }, jobId: 'job-8', level: 'ERROR' } },
  { id: '3', type: 'agent.status', source: 'runtime', data: { agentId: 'agent-api' } }
];

test('activity filters match real agent, mission/job identifiers, explicit level and time window', () => {
  assert.deepEqual(filterAgentActivity(events, { agentId: 'agent-api', period: '24h' }, now).map((event) => event.id), ['1']);
  assert.deepEqual(filterAgentActivity(events, { relation: 'job-8', level: 'ERROR' }, now).map((event) => event.id), ['2']);
  assert.deepEqual(filterAgentActivity(events, { level: 'UNDECLARED' }, now).map((event) => event.id), ['3']);
  assert.deepEqual(filterAgentActivity(events, { period: '24h' }, now).map((event) => event.id), ['1']);
});

test('activity filter options are discovered from actual event fields', () => {
  assert.deepEqual(buildActivityFilterOptions(events), {
    agents: ['agent-api', 'agent-camila'],
    relations: ['alpha', 'job-7', 'job-8'],
    levels: ['ERROR', 'INFO']
  });
});

test('canonical Agents screen contains the activity filters and history API wiring', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
  const interactions = fs.readFileSync(path.resolve(__dirname, '../public/fenix-v11-interactions.js'), 'utf8');
  const worldInspector = fs.readFileSync(path.resolve(__dirname, '../public/office-live.js'), 'utf8');
  assert.match(html, /id="fenixAgentActivity"/);
  assert.match(html, /id="fenixAgentActivityAgent"/);
  assert.match(html, /id="fenixAgentActivityRelation"/);
  assert.match(html, /id="fenixAgentActivityLevel"/);
  assert.match(html, /id="fenixAgentActivityPeriod"/);
  assert.match(interactions, /\/api\/v2\/events\/history\?limit=100/);
  assert.match(interactions, /FenixAgentActivityFilter/);
  assert.match(interactions, /fenixOpenAgentActivity/);
  assert.match(worldInspector, /fenixOpenAgentActivity\?\./);
});
