'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-operational-os.js'), 'utf8');
const inspector = source.slice(source.indexOf('window.fenixInspectAgent = async function'), source.indexOf('// Agent capability execution'));
const workforce = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-v11-interactions.js'), 'utf8');
const worldInspector = fs.readFileSync(path.join(__dirname, '..', 'public', 'office-live.js'), 'utf8');
const worldAgentInspector = worldInspector.slice(worldInspector.indexOf('function _renderWorldAgentInspectorHTML'), worldInspector.indexOf('window.fenixShowWorldAgentInspector'));

test('agent Inspector fetches its canonical list with the authenticated runtime client', () => {
  assert.match(inspector, /window\.fenixAuthedFetch\('\/api\/v2\/living-city\/agents'/);
  assert.match(inspector, /ctx\.cachedAgents = rawList/);
});

test('agent Inspector renders a job record by its name or ID', () => {
  assert.match(inspector, /currentJobRecord\.name \|\| currentJobRecord\.id/);
  assert.match(inspector, /currentJobId = agent\.jobId \|\| currentJobRecord\?\.id/);
  assert.doesNotMatch(inspector, /esc\(agent\.currentJob\)/);
});

test('Workforce shares its authenticated agent snapshot with the Inspector', () => {
  assert.match(workforce, /window\.__fenixContext\) window\.__fenixContext\.cachedAgents = agents/);
});

test('world Agent Inspector does not claim unmeasured models or ZERO-MOCK status', () => {
  assert.doesNotMatch(worldAgentInspector, /agent\.model \|\| 'qwen2\.5:3b'/);
  assert.doesNotMatch(worldAgentInspector, /ZERO-MOCK/);
  assert.match(worldAgentInspector, /Não informado/);
});
