'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-operational-os.js'), 'utf8');
const start = source.indexOf('window.fenixInspectBuilding =');
const end = source.indexOf('\n  // 9. CONTEXT PRESERVATION', start);
assert.ok(start >= 0 && end > start, 'building inspector source block must have valid delimiters');
const inspectorSource = source.slice(start, end);

function createInspectorFixture(responses) {
  const requests = [];
  const inspectors = [];
  const context = {
    window: {
      safeFetchJson: async (url) => {
        requests.push(url);
        return responses[url] || { ok: false, status: 503 };
      },
      fenixOpenInspector: (...args) => inspectors.push(args),
      fenixRenderState: (type, message) => `<state type="${type}">${message}</state>`,
      fenixNavigateWithContext() {},
      fenixCloseInspector() {},
    },
    ctx: { navigationStack: [] },
    esc: (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])),
    encodeURIComponent,
  };
  vm.createContext(context);
  vm.runInContext(inspectorSource, context);
  return { inspect: context.window.fenixInspectBuilding, requests, inspectors };
}

test('building inspector renders health and agents from the canonical runtime records', async () => {
  const building = { id: 'bld-fenix-hq', name: 'QG Fênix', status: 'DEGRADED', health: 87, projectId: 'fenix-os' };
  const agent = { id: 'agent-runtime-1', name: 'Agente Real', buildingId: 'bld-fenix-hq', status: 'WORKING' };
  const fixture = createInspectorFixture({
    '/api/v2/living-city/building/bld-fenix-hq': { ok: true, data: { ok: true, building } },
    '/api/v2/living-city/agents': { ok: true, data: { agents: [agent, { id: 'other', buildingId: 'bld-dev-loft' }] } },
  });

  await fixture.inspect({ id: 'bld-fenix-hq', name: 'QG Fênix' });

  assert.deepEqual(fixture.requests, [
    '/api/v2/living-city/building/bld-fenix-hq',
    '/api/v2/living-city/agents',
  ]);
  const body = fixture.inspectors.at(-1)[2];
  assert.match(body, /DEGRADED/);
  assert.match(body, /87%/);
  assert.match(body, /Agente Real/);
  assert.doesNotMatch(body, /agent-orchestrator|agent-planner|100%/);
});

test('building inspector shows unavailable telemetry without inventing online health', async () => {
  const fixture = createInspectorFixture({
    '/api/v2/living-city/building/unknown-building': { ok: false, status: 404 },
    '/api/v2/living-city/agents': { ok: true, data: { agents: [] } },
  });

  await fixture.inspect({ id: 'unknown-building', name: 'Prédio desconhecido' });

  const body = fixture.inspectors.at(-1)[2];
  assert.match(body, /Indisponível/);
  assert.match(body, /Não medida/);
  assert.doesNotMatch(body, /ONLINE|HEALTHY|100%|agent-orchestrator|agent-planner/);
});

test('building inspector includes agents assigned by district when no building id was published', async () => {
  const building = { id: 'bld-ai-nexus', name: 'AI Nexus R&D', district: 'ai-district' };
  const fixture = createInspectorFixture({
    '/api/v2/living-city/building/bld-ai-nexus': { ok: true, data: { ok: true, building } },
    '/api/v2/living-city/agents': { ok: true, data: { agents: [
      { id: 'agent-ai-runtime', name: 'Agente de IA', district: 'ai-district', status: 'WORKING' },
      { id: 'agent-other', name: 'Outro agente', district: 'dev-district', status: 'AVAILABLE' },
    ] } },
  });

  await fixture.inspect({ id: 'bld-ai-nexus', name: 'AI Nexus' });

  const body = fixture.inspectors.at(-1)[2];
  assert.match(body, /Agente de IA/);
  assert.doesNotMatch(body, /Outro agente/);
});

test('building inspector exposes only registered rooms and lets the operator focus a real floor', async () => {
  const building = {
    id: 'bld-api-platform', name: 'API Platform', floors: 3,
    rooms: [{ id: 'room-gateway', name: 'Gateway', floorNum: 0, function: 'APIs' }],
  };
  const fixture = createInspectorFixture({
    '/api/v2/living-city/building/bld-api-platform': { ok: true, data: { ok: true, building } },
    '/api/v2/living-city/agents': { ok: true, data: { agents: [] } },
  });

  await fixture.inspect({ id: 'bld-api-platform', name: 'API Platform' });

  const body = fixture.inspectors.at(-1)[2];
  assert.match(body, /Estrutura do edifício/);
  assert.match(body, /Térreo/);
  assert.match(body, /Gateway/);
  assert.match(body, /1º andar/);
  assert.match(body, /Sem salas cadastradas/);
  assert.match(body, /Planta 3D não modelada/);
  assert.doesNotMatch(body, /data-building-id="bld-api-platform"/);
  assert.doesNotMatch(body, /Sala de reunião|Sala de operações/);
});
