const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// MISSION-FENIX-ACTIVATION: o chat vira o ponto unico. Um objetivo de construcao vira um
// PROGRAMA real via Executive Brain, com missoes reais. Sem mocks, sem numeros inventados.
// ASCII-only (lexer Node 18).

async function tenantApp() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('"Crie um CRM SaaS" no chat cria um PROGRAMA real, nao uma resposta direta', async () => {
  const app = await tenantApp();
  const res = await app.chat.handle('grg', 'grg-admin', 'Crie um CRM SaaS');
  // O chat nao respondeu direto: virou um programa.
  assert.equal(res.action.type, 'program', 'a mensagem de construcao virou um Programa');
  assert.ok(res.action.programId, 'o programa tem id real');
  assert.ok(res.facts.programId, 'os fatos carregam o programa real');
  await app.close?.();
});

test('o programa criado tem missoes REAIS materializadas via mission-planner', async () => {
  const app = await tenantApp();
  const res = await app.chat.handle('grg', 'grg-admin', 'Criar um ERP SaaS');
  // Contagem real do template (BUILD_APP = 6), nunca inventada.
  assert.equal(res.facts.proposed, 6, 'proposto = 6 missoes reais do template');
  assert.ok(res.facts.materialized >= 1, 'ao menos uma missao materializada de verdade');
  // Prova que as missoes existem no store, nao sao fantasma.
  const state = await app.store.read();
  const realIds = new Set(state.missions.map((m) => m.id));
  const withId = res.facts.missions.filter((m) => m.missionId);
  for (const m of withId) assert.ok(realIds.has(m.missionId), `missao ${m.key} existe no store`);
  // E o programa foi persistido.
  assert.ok(state.programs.some((p) => p.id === res.facts.programId), 'programa persistido no store');
  await app.close?.();
});

test('a resposta do chat mostra o programa nascendo, com numeros contados (nao inventados)', async () => {
  const app = await tenantApp();
  const res = await app.chat.handle('grg', 'grg-admin', 'Crie uma plataforma SaaS');
  // Usa includes com substrings ASCII presentes no texto real (evita ecoar acento/bullet
  // no stdout do TAP, que o lexer do Node 18 rejeita). Boolean, nao imprime o reply.
  assert.ok(res.reply.includes('Programa criado'), 'a resposta anuncia o programa');
  assert.ok(res.reply.includes('materializadas'), 'a resposta mostra a contagem real');
  assert.ok(res.reply.includes('pronto ainda'), 'a resposta e honesta sobre o estado real');
  // A contagem e real: proposto do template, materializado do planner.
  assert.equal(res.facts.proposed, 6);
  assert.ok(res.facts.materialized >= 1 && res.facts.materialized <= 6);
  await app.close?.();
});

test('mensagem NAO-construtiva nao vira programa (o chat ainda responde direto quando cabe)', async () => {
  const app = await tenantApp();
  const res = await app.chat.handle('grg', 'grg-admin', 'status');
  assert.notEqual(res.action.type, 'program', 'uma consulta de status nao cria programa');
  await app.close?.();
});
