const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// SPRINT A — cobertura de keos (protocolo cognitivo universal) e uios (knowledge/capability OS).
// Exercita o pipeline REAL do UCP (allowlist de tipo, estágio não-implementado honesto,
// persistência de cápsula) e os OS que declaram indisponibilidade em vez de mentir.

async function tenantApp() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('UCP runs the staged pipeline, rejects unsupported input, and stays honest about the missing stage', async () => {
  const app = await tenantApp();

  // Tipo fora da allowlist é rejeitado — o pipeline não inventa um caminho.
  await assert.rejects(
    () => app.ucp.processInput('grg', 'grg-admin', { type: 'TELEPATHY', payload: { x: 1 } }),
    /unsupported UCP input type/,
  );

  // Entrada válida percorre os estágios e persiste uma cápsula real.
  const result = await app.ucp.processInput('grg', 'grg-admin', {
    type: 'DOC', title: 'Arquitetura hexagonal', payload: { text: 'ports and adapters' },
  });
  assert.ok(Array.isArray(result.stages), 'the pipeline reports its stages');
  const ingest = result.stages.find((s) => s.name === 'INGEST');
  assert.equal(ingest.status, 'COMPLETED');
  assert.ok(ingest.evidence.payloadHash, 'ingest addresses the payload by hash');

  // O estágio 4 (análise semântica) é declarado NOT_IMPLEMENTED — sem modelo de embedding
  // no runtime. Mentir aqui seria a simulação que o contrato proíbe.
  const semantic = result.stages.find((s) => s.stage === 4);
  assert.notEqual(semantic.status, 'COMPLETED', 'the semantic stage must not claim completion');

  await app.close?.();
});

test('the Knowledge OS declares unavailability instead of fabricating a manifest', async () => {
  const app = await tenantApp();
  const manifest = await app.kos.getManifest('grg', 'grg-admin');
  // As volumes da constituição podem não estar embarcadas neste ambiente. O contrato exige
  // que a ausência seja declarada (unknown/UNAVAILABLE), nunca um total inventado.
  if (manifest.status === 'UNAVAILABLE') {
    assert.equal(manifest.totalVolumes.state, 'unknown', 'no volumes → unknown, not a fake count');
    assert.ok(manifest.constitutionPath, 'the path where volumes are expected is reported');
  } else {
    assert.equal(manifest.totalVolumes.state, 'measured', 'volumes present → measured count');
  }

  await app.close?.();
});

test('the Capability OS registers and lists capabilities from the store', async () => {
  const app = await tenantApp();
  const before = await app.capOs.listCapabilities('grg', 'grg-admin');
  const beforeCount = Array.isArray(before) ? before.length : (before.capabilities?.length ?? 0);

  await app.capOs.registerCapability('grg', 'grg-admin', {
    name: 'hexagonal-refactor', domain: 'architecture', description: 'ports and adapters extraction',
  });

  const after = await app.capOs.listCapabilities('grg', 'grg-admin');
  const afterCount = Array.isArray(after) ? after.length : (after.capabilities?.length ?? 0);
  assert.equal(afterCount, beforeCount + 1, 'a registered capability is listed from the store');

  await app.close?.();
});
