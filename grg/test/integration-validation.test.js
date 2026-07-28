const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// MISSION-1004 — VALIDACAO DE INTEGRACAO ponta a ponta.
// Nao adiciona capacidade. Exercita o fluxo REAL que esta ligado e MEDE cada elo, para o
// relatorio dizer o que funciona e onde a integracao esta solta. ASCII-only (lexer Node 18).

function fakeProvider(name, { reply = 'ok' } = {}) {
  return { name, models: [`${name}-m`], available: async () => true,
    complete: async () => ({ text: reply, model: `${name}-m`, promptTokens: 1, completionTokens: 1 }),
    chat: async () => ({ text: reply }) };
}

async function appWith(providers) {
  const app = await createApp({ dataFile: null, providers });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

// ELO 1-2: o Mission Runtime compila e materializa uma missao real.
test('mission runtime: an objective becomes a governed, materialized mission', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama') });
  const result = await app.missionPlanner.plan('grg', 'grg-admin', { objective: 'analisar a saude da infraestrutura', mode: 'OPERATE' });
  assert.ok(result.plan, 'a plan is produced');
  assert.ok(['READY', 'MATERIALIZED', 'NEEDS_INPUT'].includes(result.plan.status), 'plan reaches a governed status');
  assert.ok(Array.isArray(result.plan.steps) && result.plan.steps.length, 'the plan has governed steps');
  await app.close?.();
});

// ELO 3-4: o AI Router seleciona um provider por evidencia e invoca de verdade.
test('AI router: selects a provider by evidence and invokes it end to end', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama', { reply: 'resposta-real' }) });
  const routed = await app.aiRouter.route('grg', 'grg-admin', { mode: 'text', prompt: 'oi' });
  assert.equal(routed.ok, true, 'the router served the call');
  assert.equal(routed.result.text, 'resposta-real', 'the real provider produced the text');
  assert.equal(routed.telemetry.state, 'measured', 'the decision is recorded as measured telemetry');
  await app.close?.();
});

// ELO 5-6: missao concluida gera artefato reutilizavel (Knowledge/DNA).
test('knowledge: mission artifacts service is attached and reuse is measurable', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama') });
  const report = await app.missionArtifacts.reuseReport('grg', 'grg-admin');
  assert.equal(report.playbooks.state, 'measured', 'playbook count is measured');
  assert.equal(report.plans.state, 'measured', 'plan count is measured');
  await app.close?.();
});

// ELO 7: observabilidade reflete o estado por medicao.
test('dashboard: connectors endpoint derives state, AI providers included', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama'), groq: fakeProvider('groq') });
  const all = await app.connectors.statusAll('grg', 'grg-admin');
  const ids = all.connectors.map((c) => c.connectorId);
  assert.ok(ids.includes('ai:ollama') && ids.includes('ai:groq'), 'AI providers appear as connectors');
  for (const c of all.connectors) assert.equal(c.state.state, 'measured', 'every connector state is derived, not manual');
  await app.close?.();
});

// ELO SOLTO (o achado da validacao): o Mission Runtime NAO consome o AI Router hoje.
// Este teste DOCUMENTA a lacuna medida em vez de escondê-la. Ele passa afirmando o estado
// atual: planner e router existem, mas nao estao no mesmo caminho. Corrigir e trabalho
// FUTURO (fora do escopo desta missao, que proibe alterar arquitetura).
test('GAP: mission planner does not yet route through the AI router (measured, documented)', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama') });
  const plannerSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'missions', 'mission-planner.js'), 'utf8');
  const routesThroughRouter = /aiRouter/.test(plannerSrc);
  assert.equal(routesThroughRouter, false, 'CONFIRMED GAP: planner has no aiRouter reference yet — integration point for a future mission');
  // Ambos existem e funcionam isolados:
  assert.ok(app.aiRouter, 'router is instantiated');
  assert.ok(app.missionPlanner, 'planner is instantiated');
  await app.close?.();
});
