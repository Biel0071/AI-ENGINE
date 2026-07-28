const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { ConnectorRuntime } = require('../src/connectors/connector-runtime');
const { GitHubConnectorAdapter } = require('../src/connectors/github-connector-adapter');
const { assertConnectorContract } = require('../src/connectors/connector-contract');
const { MemoryStore } = require('../src/kernel/store');

// MISSION-0004 — Connector Runtime.
// A regra que estes testes trancam: CONNECTED só existe quando authenticate() + selfTest()
// passam por medição real. Nunca por configuração. Sem credencial, o estado honesto é
// CONFIGURED; com credencial que não responde, DEGRADED.

async function tenantApp(options) {
  const app = await createApp({ dataFile: null, ...options });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('the contract rejects a connector missing any of the 12 methods', () => {
  const incomplete = { id: 'broken', register() {}, connect() {} };
  assert.throws(() => assertConnectorContract(incomplete), /missing required methods/);

  // Um adapter real cumpre o contrato inteiro.
  const complete = new GitHubConnectorAdapter({ github: { token: null } });
  assert.equal(assertConnectorContract(complete), true);
});

test('without a token the GitHub connector is CONFIGURED, never CONNECTED', async () => {
  // App sem token: o github injetado não tem credencial.
  const app = await tenantApp({ github: { token: null, listUserRepos: async () => { throw new Error('no token'); } } });

  const all = await app.connectors.statusAll('grg', 'grg-admin');
  const github = all.connectors.find((c) => c.connectorId === 'github');
  assert.ok(github, 'the github connector is registered');
  assert.equal(github.state.value, 'CONFIGURED', 'no credential → CONFIGURED, never CONNECTED');
  assert.notEqual(github.state.value, 'CONNECTED');
  assert.equal(github.evidence.authenticated, false);

  // health() sem token não afirma saúde: devolve estado honesto.
  const health = await app.connectors.health('grg', 'grg-admin', 'github');
  assert.equal(health.ok, false);
  assert.equal(health.state, 'CONFIGURED');

  await app.close?.();
});

test('selfTest without a credential fails as a measured result, never a silent success', async () => {
  const adapter = new GitHubConnectorAdapter({ github: { token: null } });
  const test = await adapter.selfTest();
  assert.equal(test.ok, false, 'no credential cannot pass selfTest');
  assert.equal(test.reason.state, 'unknown', 'the failure is a measured unknown, not a thrown error');
});

test('metrics are unknown before any call, never a fabricated zero', async () => {
  const adapter = new GitHubConnectorAdapter({ github: { token: null }, store: new MemoryStore() });
  const metrics = await adapter.metrics();
  assert.equal(metrics.calls.state, 'unknown', 'no recorded call → unknown, not 0');
});

test('CONNECTED is reachable only when selfTest actually succeeds', async () => {
  // GitHubConnector FALSO: tem token e listUserRepos devolve repos. Prova o caminho
  // CONNECTED sem depender de rede nem de um token real no CI. É a fonte respondendo.
  const fakeGithub = { token: 'fake-but-present', listUserRepos: async () => [{ name: 'ai-engine' }, { name: 'fenix' }] };
  const app = await tenantApp({ github: fakeGithub });

  const status = await app.connectors.status('grg', 'grg-admin', 'github');
  assert.equal(status.state.value, 'CONNECTED', 'authenticate + selfTest ok → CONNECTED');
  assert.equal(status.evidence.authenticated, true);
  assert.equal(status.evidence.selfTest.value, true);
  assert.equal(status.evidence.observed.value, 2, 'observed repo count comes from the real call');

  // E o estado é DERIVADO: uma métrica de selfTest foi gravada nesta chamada.
  const state = await app.store.read();
  const rows = state.connectorMetrics.filter((r) => r.connectorId === 'github');
  assert.ok(rows.length >= 1, 'the status derivation recorded a real selfTest metric');
  assert.ok(rows.some((r) => r.kind === 'selfTest' && r.ok === true));

  await app.close?.();
});

test('a degraded source (token present, selfTest throws) is DEGRADED, not CONNECTED', async () => {
  const flaky = { token: 'present', listUserRepos: async () => { throw new Error('502 from github'); } };
  const app = await tenantApp({ github: flaky });

  const status = await app.connectors.status('grg', 'grg-admin', 'github');
  assert.equal(status.state.value, 'DEGRADED', 'token present but source failing → DEGRADED');
  assert.notEqual(status.state.value, 'CONNECTED');

  await app.close?.();
});
