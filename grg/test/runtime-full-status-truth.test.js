const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getFullStatus } = require('../src/api/runtime-full-status');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');

test('runtime status reports configured adapters and tenant-scoped store state', async () => {
  const oldFetch = global.fetch;
  const oldOllama = process.env.GRG_OLLAMA_DIRECT_URL;
  const oldFenixOllama = process.env.FENIX_OLLAMA_URL;
  global.fetch = async () => new Response(JSON.stringify({ status: 'ONLINE' }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
  delete process.env.GRG_OLLAMA_DIRECT_URL;
  delete process.env.FENIX_OLLAMA_URL;
  try {
    const app = {
      storageManager: { stats: { relationalProvider: 'in-memory', cacheProvider: 'memory', vectorProvider: 'local' } },
      store: { read: async () => ({
        cognitiveAgents: [
          { id: 'agent-grg-idle', tenantId: 'grg', status: 'ACTIVE' },
          { id: 'agent-grg-working', tenantId: 'grg', status: 'WORKING' },
          { id: 'agent-other-working', tenantId: 'other', status: 'WORKING' },
        ],
        memories: [
          { tenantId: 'grg', status: 'ACTIVE' },
          { tenantId: 'grg', status: 'ARCHIVED' },
          { tenantId: 'other', status: 'ACTIVE' },
        ],
      }) },
    };
    const result = await getFullStatus(app, 'grg');
    assert.deepEqual(result.runtime.agents, { total: 2, idle: 1, working: 1 });
    assert.equal(result.runtime.memory.entries, 1);
    assert.equal(result.infrastructure.redis.status, 'LOCAL_ADAPTER');
    assert.equal(result.infrastructure.postgres.status, 'LOCAL_ADAPTER');
    assert.equal(result.infrastructure.qdrant.status, 'LOCAL_ADAPTER');
    assert.equal(result.services.ollama.status, 'N/A');
    assert.equal(result.services.fenixOS.source, 'current-process');
    assert.equal(result.city.buildings, Object.keys(getWorldStateEngine().buildings).length);
  } finally {
    global.fetch = oldFetch;
    if (oldOllama === undefined) delete process.env.GRG_OLLAMA_DIRECT_URL;
    else process.env.GRG_OLLAMA_DIRECT_URL = oldOllama;
    if (oldFenixOllama === undefined) delete process.env.FENIX_OLLAMA_URL;
    else process.env.FENIX_OLLAMA_URL = oldFenixOllama;
  }
});

test('runtime counts only agents belonging to the requested tenant', async () => {
  const result = await getFullStatus({
    storageManager: { stats: {} },
    agentRegistry: { list: () => [{ id: 'foreign-runtime-agent', tenantId: 'other', status: 'WORKING' }] },
    store: { read: async () => ({ agents: [
      { id: 'tenant-agent', tenantId: 'grg', status: 'IDLE' },
      { id: 'foreign-agent', tenantId: 'other', status: 'WORKING' }
    ] }) }
  }, 'grg');

  assert.deepEqual(result.runtime.agents, { total: 1, idle: 1, working: 0 });
});

test('runtime storage adapters report configuration rather than live connectivity', async () => {
  const oldFetch = global.fetch;
  global.fetch = async () => new Response('{}', { status: 200 });
  try {
    const result = await getFullStatus({
      storageManager: { stats: { relationalProvider: 'postgresql', cacheProvider: 'redis', vectorProvider: 'qdrant' } },
      store: { read: async () => ({}) }
    }, 'tenant');

    assert.equal(result.infrastructure.postgres.status, 'CONFIGURED_AT_BOOT');
    assert.equal(result.infrastructure.redis.status, 'CONFIGURED_AT_BOOT');
    assert.equal(result.infrastructure.qdrant.status, 'CONFIGURED_AT_BOOT');
  } finally {
    global.fetch = oldFetch;
  }
});
