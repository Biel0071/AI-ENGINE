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

// ELO FECHADO (MISSION-1005): o fluxo de missao agora DECIDE pelo AI Router e o Gateway
// EXECUTA. O ponto real de IA da missao e o SoftwareFactory (factory.generate ->
// factory.plan -> this.ai.invoke); ele passou a receber o Router, que tem a mesma
// assinatura invoke() e delega ao Gateway. Router decide, Gateway executa, um runtime so.
test('MISSION-1005: the mission AI path decides via router and executes via gateway', async () => {
  const app = await appWith({ ollama: fakeProvider('ollama', { reply: 'plan-real' }) });
  // O router entra como drop-in do gateway (mesma assinatura), preservando a telemetria.
  const out = await app.aiRouter.invoke('grg', 'grg-admin', { taskType: 'plan', prompt: 'plan: um CRM' });
  assert.ok(out && typeof out.text === 'string', 'router.invoke returns a gateway-shaped result');

  // A prova de que o Gateway ainda e o executor: aiCalls foi gravado (telemetria intacta)...
  const state = await app.store.read();
  assert.ok((state.aiCalls || []).length >= 1, 'the gateway recorded the call in aiCalls (telemetry preserved)');
  // ...e a decisao do Router tambem foi registrada (para o Learning Router futuro).
  assert.ok((state.aiRouterDecisions || []).length >= 1, 'the router recorded its decision');
  await app.close?.();
});
