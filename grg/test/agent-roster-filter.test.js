'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { filterAgentRoster, summarizeAgentRoster } = require('../public/agent-roster-filter');

const agents = [
  { id: 'agent-api', name: 'Alex', role: 'API Operations', squad: 'Principal', status: 'WORKING', currentTask: 'Validar gateway' },
  { id: 'agent-camila', name: 'Camila', role: 'Operações', squad: 'WMS', status: 'AVAILABLE' },
  { id: 'agent-unknown', name: 'Sem estado', role: 'Especialista', status: 'PAUSED' }
];

test('agent roster search covers identity, role and squad and status filters share runtime classification', () => {
  assert.deepEqual(filterAgentRoster(agents, { query: 'gateway', status: 'all' }).map((agent) => agent.id), ['agent-api']);
  assert.deepEqual(filterAgentRoster(agents, { query: 'wms', status: 'AVAILABLE' }).map((agent) => agent.id), ['agent-camila']);
  assert.deepEqual(filterAgentRoster(agents, { query: '', status: 'WORKING' }).map((agent) => agent.id), ['agent-api']);
  assert.deepEqual(filterAgentRoster(agents, { query: '', status: 'other' }).map((agent) => agent.id), ['agent-unknown']);
});

test('agent roster metrics do not count unknown states as available', () => {
  assert.deepEqual(summarizeAgentRoster(agents), { registered: 3, working: 1, available: 1, other: 1 });
  assert.deepEqual(summarizeAgentRoster([]), { registered: 0, working: 0, available: 0, other: 0 });
});

test('canonical Agents screen loads the filter helper and begins with an unverified fleet state', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
  const interactions = fs.readFileSync(path.resolve(__dirname, '../public/fenix-v11-interactions.js'), 'utf8');
  const filterScript = html.indexOf('/agent-roster-filter.js');
  const interactionsScript = html.indexOf('/fenix-v11-interactions.js');
  assert.ok(filterScript >= 0 && interactionsScript > filterScript);
  assert.match(html, /id="fenixAgentFleetStatus"[^>]*>AGUARDANDO/);
  assert.match(html, /id="fenixAgentSearch"/);
  assert.match(html, /id="fenixAgentStatusFilter"/);
  assert.match(interactions, /helper\.filterAgentRoster\(records, \{ query, status \}\)/);
  assert.match(interactions, /fleetStatus\.textContent = source === 'API' \? \(agents\.length \? 'ONLINE' : 'SEM AGENTES'\) : source/);
});

test('agent roster failure clears measured counts and labels the snapshot time unavailable', () => {
  const interactions = fs.readFileSync(path.resolve(__dirname, '../public/fenix-v11-interactions.js'), 'utf8');
  const failureHandler = interactions.slice(interactions.indexOf("} catch (e) {", interactions.indexOf('window.fenixLoadAgents = async')));
  assert.match(failureHandler, /loadStatus\.textContent = 'Leitura indisponível'/);
  assert.match(failureHandler, /fenixAgentRegisteredCount[\s\S]*?fenixAgentFailedJobsCount/);
  assert.match(failureHandler, /element\.textContent = '—'/);
  assert.match(failureHandler, /measuredAt\.textContent = 'Sem leitura atual'/);
  assert.match(failureHandler, /tab\.textContent = 'Visão \(—\)'/);
});
