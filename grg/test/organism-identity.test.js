const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { OrganismIdentityService } = require('../src/kernel/organism-identity');
const { MemoryStore } = require('../src/kernel/store');

// MISSION-0003A — identidade permanente ligada ao boot.
// Prova os invariantes: nunca regenera, bornAt imutável, linhagem append-only sem
// duplicar geração idêntica, idade derivada de bornAt na leitura.

test('createApp establishes exactly one permanent identity and never regenerates it', async () => {
  const store = new MemoryStore();

  const app1 = await createApp({ store });
  const first = await app1.organismIdentity.current();
  assert.ok(first, 'identity is established during createApp');
  assert.ok(first.organismId, 'the organism has an id');
  assert.ok(first.bornAt, 'the organism records its birth');
  await app1.close?.();

  // Subir de novo sobre o MESMO store não pode criar uma segunda identidade.
  const app2 = await createApp({ store });
  const second = await app2.organismIdentity.current();
  assert.equal(second.organismId, first.organismId, 'the organism id survives a restart');
  assert.equal(second.bornAt, first.bornAt, 'bornAt is never rewritten');
  const all = (await store.read()).organismIdentity;
  assert.equal(all.length, 1, 'there is exactly one identity record');
  await app2.close?.();
});

test('the lineage is append-only and does not duplicate an identical generation', async () => {
  const store = new MemoryStore();
  const svc = new OrganismIdentityService({ store, env: { FENIX_VERSION: '1.0.0' } });
  await svc.ensure();

  await svc.recordGeneration({ schemaVersion: 29, reason: 'boot' });
  await svc.recordGeneration({ schemaVersion: 29, reason: 'boot' }); // idêntica → não acumula
  let record = await svc.current();
  assert.equal(record.lineage.length, 1, 'an identical generation is not appended twice');

  // Uma geração diferente (novo esquema) É registrada.
  await svc.recordGeneration({ schemaVersion: 30, reason: 'boot' });
  record = await svc.current();
  assert.equal(record.lineage.length, 2, 'a changed generation is appended');
  assert.equal(record.lineage[1].schemaVersion, 30);
  assert.equal(record.lineage[0].release, '1.0.0', 'release comes from FENIX_VERSION');
});

test('describe() derives age from bornAt and reports measured envelopes', async () => {
  const store = new MemoryStore();
  const svc = new OrganismIdentityService({ store });
  await svc.ensure();
  await svc.recordGeneration({ schemaVersion: 29 });

  const report = await svc.describe();
  assert.equal(report.organismId.state, 'measured');
  assert.equal(report.bornAt.state, 'measured');
  assert.equal(report.ageDays.state, 'measured', 'age is derived, not stored');
  assert.ok(report.ageDays.value >= 0, 'age is non-negative');
  assert.equal(report.generations.state, 'measured');
  assert.equal(report.generations.value, 1);
});

test('describe() returns unknown, never a fabricated value, before identity exists', async () => {
  const store = new MemoryStore();
  const svc = new OrganismIdentityService({ store });
  const report = await svc.describe();
  assert.equal(report.organismId.state, 'unknown', 'no identity → unknown, not a fake id');
  assert.equal(report.ageDays.state, 'unknown', 'no bornAt → age cannot be derived');
});
