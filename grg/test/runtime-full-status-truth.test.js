const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getFullStatus } = require('../src/api/runtime-full-status');

test('runtime status reports the connected adapters and tenant-scoped store state', async () => {
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
          { tenantId: 'grg', status: 'ACTIVE' },
          { tenantId: 'grg', status: 'WORKING' },
          { tenantId: 'other', status: 'WORKING' },
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
    assert.equal(result.city.buildings, null);
  } finally {
    global.fetch = oldFetch;
    if (oldOllama === undefined) delete process.env.GRG_OLLAMA_DIRECT_URL;
    else process.env.GRG_OLLAMA_DIRECT_URL = oldOllama;
    if (oldFenixOllama === undefined) delete process.env.FENIX_OLLAMA_URL;
    else process.env.FENIX_OLLAMA_URL = oldFenixOllama;
  }
});
