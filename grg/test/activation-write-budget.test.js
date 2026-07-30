// MEDIDO EM PRODUCAO (2026-07-29): a varredura de ativacao fazia UMA escrita no store por
// componente. Com 26 componentes a cada 5 min, e um `update()` no-op custando ~0,9 s num
// documento unico de 5,4 MB (toda escrita reserializa o documento inteiro sob SERIALIZABLE),
// a varredura ocupava o store por ~25 s. Efeito observado: jobs morrendo com 40001 e com
// "worker heartbeat expired" -- nao por defeito proprio, mas por nao conseguirem escrever.
// Eram os DOIS unicos modos de falha restantes da fila.
//
// O teste conta ESCRITAS, nao tempo: tempo depende da maquina, o numero de escritas e o
// contrato. Uma varredura = uma escrita, independente de quantos componentes existam.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// Componentes de mentira, mas com a forma real: o probe devolve {ok, version, evidence}.
// A lista e injetada substituindo `components`, como test/operational-activation.test.js faz:
// a lista real nao e parametro de createApp().
async function bootstrap(quantosComponentes) {
  const app = await createApp();
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  app.operationalActivation.components = async () => Array.from({ length: quantosComponentes }, (_, i) => ({
    id: `componente-${i}`, label: `Componente ${i}`, dependencies: [], critical: false, version: '1.0.0',
    check: async () => ({ ok: true, version: '1.0.0', evidence: { probe: `ok-${i}` } }),
  }));
  return app;
}

// Conta chamadas a update() sem trocar o store: o comportamento medido tem de ser o do store
// real, nao de um dublê.
function contarEscritas(store) {
  const contador = { total: 0 };
  const original = store.update.bind(store);
  store.update = (mutator) => { contador.total += 1; return original(mutator); };
  return contador;
}

// O `boot()` tem duas fontes de escrita bem diferentes:
//  (a) a VARREDURA -- corrigida aqui: uma escrita para o lote, antes uma por componente;
//  (b) o FAN-OUT DE EVENTO -- cada `operational.component.checked` alimenta cidade,
//      versionamento, twin e capability registry, e cada projetor escreve por conta propria.
// (b) e a proxima camada e nao esta em escopo nesta correcao: mexer nela muda o contrato dos
// projetores. Este teste mede as duas separadamente para nao confundir uma com a outra, e
// prova que a varredura saiu do caminho critico.
test('the sweep itself costs one write, not one per component', async () => {
  const app = await bootstrap(12);
  // Sem projetores: isola a escrita da varredura do fan-out de evento.
  app.operationalActivation.events = null;
  const contador = contarEscritas(app.store);
  await app.operationalActivation.boot('grg', 'grg-admin', { trigger: 'test' });
  // boot() escreve: abre o run, grava a varredura (1), fecha o run, grava readiness.
  // Antes desta correcao, 12 componentes custavam 12 escritas so de varredura.
  assert.ok(contador.total <= 5, `varredura de 12 componentes custou ${contador.total} escritas; esperado <= 5`);
});

test('component count does not change the sweep write cost', async () => {
  const pequeno = await bootstrap(6);
  pequeno.operationalActivation.events = null;
  const c1 = contarEscritas(pequeno.store);
  await pequeno.operationalActivation.boot('grg', 'grg-admin', { trigger: 'test' });

  const grande = await bootstrap(24);
  grande.operationalActivation.events = null;
  const c2 = contarEscritas(grande.store);
  await grande.operationalActivation.boot('grg', 'grg-admin', { trigger: 'test' });

  // 4x componentes, MESMO custo de escrita: e o que significa "por varredura, nao por item".
  // Antes: 6 -> ~6 escritas e 24 -> ~24, uma diferenca de 18.
  assert.equal(c2.total, c1.total, `4x componentes mudou a contagem de escritas: ${c1.total} -> ${c2.total}`);
});

test('the sweep still records every component, with trend', async () => {
  // Lote nao pode custar informacao: o historico, o estado corrente e o trend continuam por
  // componente. Sem isto, "menos escritas" seria so "menos dados".
  const app = await bootstrap(5);
  await app.operationalActivation.boot('grg', 'grg-admin', { trigger: 'test' });
  const state = await app.store.read();
  const historico = state.operationalComponentHistory.filter((item) => item.tenantId === 'grg');
  const correntes = state.operationalComponentStates.filter((item) => item.tenantId === 'grg');
  assert.equal(historico.length, 5, 'todo componente entra no historico');
  assert.equal(correntes.length, 5, 'todo componente tem estado corrente');
  assert.ok(historico.every((item) => item.trend), 'o trend continua sendo calculado');
  assert.ok(historico.every((item) => item.runId), 'todo registro aponta para o run');
  const eventos = await app.eventStore.list('grg');
  assert.equal(eventos.filter((e) => e.type === 'operational.component.checked').length, 5, 'a trilha segue com um evento por componente');
});

test('a second sweep builds trend against the first', async () => {
  const app = await bootstrap(3);
  await app.operationalActivation.boot('grg', 'grg-admin', { trigger: 'test' });
  await app.operationalActivation.boot('grg', 'grg-admin', { trigger: 'test' });
  const state = await app.store.read();
  const doComponente = state.operationalComponentHistory.filter((item) => item.componentId === 'componente-0');
  assert.equal(doComponente.length, 2);
  // A segunda amostra ve a primeira: e o que provaria uma escrita por componente e o que o
  // lote precisa preservar.
  assert.ok(doComponente.at(-1).trend.sampleCount >= 2, `o trend da 2a varredura precisa ver a 1a: ${JSON.stringify(doComponente.at(-1).trend)}`);
});
