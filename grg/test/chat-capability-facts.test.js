// Regressao MEDIDA EM PRODUCAO (2026-07-29): pela UI, a FENIX respondeu ao dono
// "nao possuimos capacidades avancadas como pesquisar o repositorio ou realizar projetos".
// Causa: no intent `chitchat` os fatos eram {conversa,repos,projetos,capabilities} e
// `capabilities` vinha de `state.capabilities` -- lista LEGADA, vazia em producao. O registro
// real e `capabilityDefinitions` (9 built-ins). Com so zeros no JSON e a ordem "use APENAS os
// fatos", o modelo concluia que a plataforma nao sabe fazer nada.
//
// Estes testes travam o contrato dos FATOS (deterministico). Nao afirmam o texto que o modelo
// escreve: o LLM nao roda aqui, e prescrever a frase seria testar o dublê, nao o sistema.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function bootstrap() {
  const app = await createApp({});
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('chitchat carries the real capability registry, not the empty legacy list', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'tudo bem?');
  // Sem LLM nao existe regra deterministica de chitchat: saudacao cai no default
  // `help` (chat-agent.js:110). Os dois intents compartilham os mesmos fatos de proposito.
  assert.ok(['chitchat', 'help'].includes(r.intent), `intent inesperado: ${r.intent}`);
  const c = r.facts.capacidades;
  assert.ok(c, 'chitchat precisa carregar capacidades');
  // O bootstrap do registry semeia os built-ins em tenant.created. Se este numero for 0, o
  // chat esta lendo a fonte errada de novo -- exatamente o bug de producao.
  assert.ok(c.registradas > 0, `registro vazio: ${JSON.stringify(c)}`);
  assert.ok(Array.isArray(c.catalogo) && c.catalogo.length === c.registradas);
  // A descricao e o que permite ao modelo responder "o que voce faz" sem inventar.
  assert.ok(c.catalogo.every((linha) => linha.includes(': ')), 'cada item traz id: descricao');
  assert.ok(c.catalogo.some((linha) => /software-factory/.test(linha)), 'a fabrica de software esta no catalogo');
});

test('a capability with no run is reported as not-yet-exercised, never as absent', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'oi');
  const c = r.facts.capacidades;
  // Sem worker rodando neste teste, nenhuma execucao existe. A distincao que o usuario precisa
  // ver e "existe e nao foi exercitada" -- por isso o campo e nomeado, nao um zero solto.
  assert.deepEqual(c.comprovadas_por_execucao, []);
  assert.equal(c.sem_execucao_registrada.length, c.registradas);
  assert.deepEqual(c.degradadas, []);
});

test('capabilities intent reads the governed registry and keeps the legacy field', async () => {
  const app = await bootstrap();
  const r = await app.chat.handle('grg', 'grg-admin', 'quais funcionalidades existem no catalogo?');
  assert.equal(r.intent, 'capabilities');
  // campo antigo preservado para nao quebrar consumidores
  assert.ok(Array.isArray(r.facts.capabilities));
  assert.ok(r.facts.capacidades.registradas > 0);
});

test('the help intent no longer reaches the model with zero facts', async () => {
  const app = await bootstrap();
  // Sem LLM, detectIntent devolve 'help' como DEFAULT (chat-agent.js:110): e o caminho mais
  // provavel em producao. Antes ele nao tinha case no switch e saía com facts={} -- a pergunta
  // "o que voce pode fazer?" chegava ao modelo sem um unico fato, com ordem de nao inventar.
  const r = await app.chat.handle('grg', 'grg-admin', 'o que voce pode fazer?');
  assert.equal(r.intent, 'help');
  assert.notDeepEqual(r.facts, {}, 'help nao pode mais sair sem fatos');
  assert.ok(r.facts.capacidades.registradas > 0);
});

test('health becomes HEALTHY only after a real job succeeds', async () => {
  const app = await bootstrap();
  // discovery.scan e um jobType de `discovery` no catalogo dos built-ins. runBatch e quem
  // executa (tick() so dispara agendamentos) -- e o registry escreve health a partir do evento.
  const antes = await app.chat.handle('grg', 'grg-admin', 'tudo bem?');
  assert.deepEqual(antes.facts.capacidades.comprovadas_por_execucao, []);

  await app.jobs.submit('grg', 'grg-admin', { type: 'discovery.scan', payload: {} });
  await app.jobs.runBatch('teste-worker', 5);

  const depois = await app.chat.handle('grg', 'grg-admin', 'tudo bem?');
  const c = depois.facts.capacidades;
  assert.ok(
    c.comprovadas_por_execucao.some((linha) => linha.startsWith('discovery')),
    `discovery deveria estar comprovada apos execucao real: ${JSON.stringify(c)}`,
  );
  assert.ok(!c.sem_execucao_registrada.includes('discovery'));
});
