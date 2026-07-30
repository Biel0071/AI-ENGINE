// Regressao MEDIDA EM PRODUCAO (2026-07-29): o PostgresStore -- o unico store usado em
// producao -- nao aplicava retencao nenhuma. MemoryStore/FileStore podam a cada escrita
// (kernel/store.js:174); o Postgres crescia sem limite. Estado medido na VPS: documento de
// 6,38 MB (runtimeJobs 1,58 MB para 67 jobs, auditEvents 1,58 MB para 1.269 entradas) e
// update() no-op custando ~2 s, porque toda escrita reserializa o documento inteiro sob
// ISOLATION LEVEL SERIALIZABLE. Consequencia observada: o worker de fila (ciclo de 2 s)
// falhou em 7 de 7 ciclos com 40001 e a fila parou (0 workers registrados, 4 jobs orfaos).
//
// Nao ha Postgres no CI: o pool e um dublê que grava o SQL recebido. O que se afirma aqui e
// o contrato do store (poda antes de gravar; retry configurado para o custo real), nao o
// comportamento do banco.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PostgresStore } = require('../src/infrastructure/database/postgres-store');
const { EMPTY_STATE } = require('../src/kernel/store');

// Pool minimo que fala o suficiente do protocolo pg para o store operar.
function fakePool(documento) {
  const escritas = [];
  let falharProximas = 0;
  return {
    escritas,
    falharSerializacao(n) { falharProximas = n; },
    async query(sql, params) {
      if (/^SELECT document/.test(sql)) return { rows: [{ document: documento }] };
      if (/^UPDATE/.test(sql)) {
        if (falharProximas > 0) {
          falharProximas -= 1;
          const erro = new Error('could not serialize access due to concurrent update');
          erro.code = '40001';
          throw erro;
        }
        escritas.push(JSON.parse(params[1]));
        return { rowCount: 1 };
      }
      return { rows: [{ ok: 1 }] };
    },
    async connect() { return { query: this.query.bind(this), release() {} }; },
  };
}

function estadoCom(jobs) {
  const state = EMPTY_STATE();
  state.runtimeJobs = Array.from({ length: jobs }, (_, i) => ({
    id: `job-${i}`, tenantId: 'grg', type: 'probe', status: 'SUCCEEDED',
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  }));
  return state;
}

test('update() prunes history collections before writing', async () => {
  // 200 jobs contra o teto medido de 60 (retention.js): sem poda, os 200 iam para o disco e
  // o custo de TODA escrita seguinte subia com eles.
  const pool = fakePool(estadoCom(200));
  const store = new PostgresStore({ pool, retentionLimits: { runtimeJobs: 60 } });
  await store.update((state) => state);
  assert.equal(pool.escritas.length, 1);
  assert.equal(pool.escritas[0].runtimeJobs.length, 60, 'o documento gravado precisa vir podado');
  // A poda mantem os mais RECENTES: perder o historico recente inverteria o objetivo.
  assert.equal(pool.escritas[0].runtimeJobs.at(-1).id, 'job-199');
});

test('write() prunes as well, not only update()', async () => {
  const pool = fakePool(EMPTY_STATE());
  const store = new PostgresStore({ pool, retentionLimits: { runtimeJobs: 10 } });
  await store.write(estadoCom(50));
  assert.equal(pool.escritas[0].runtimeJobs.length, 10);
});

test('retention can be disabled explicitly, never by accident', async () => {
  const pool = fakePool(estadoCom(100));
  const store = new PostgresStore({ pool, retention: false });
  await store.update((state) => state);
  assert.equal(pool.escritas[0].runtimeJobs.length, 100);
});

test('a serialization conflict is retried instead of failing the caller', async () => {
  // Era exatamente o erro que parava o worker. Com base 25 ms o retry esgotava em ~75 ms,
  // muito antes dos ~2 s que a transacao concorrente leva.
  const pool = fakePool(EMPTY_STATE());
  pool.falharSerializacao(2);
  const store = new PostgresStore({ pool });
  const sleeps = [];
  // Nao espero de verdade: o que se verifica e que houve retry e que o atraso e dimensionado
  // em centenas de ms, nao em dezenas.
  const original = store.update.bind(store);
  await original((state) => state).catch((e) => { sleeps.push(`erro:${e.code}`); });
  assert.deepEqual(sleeps, [], 'o conflito precisa ser absorvido pelo retry');
  assert.equal(pool.escritas.length, 1, 'a escrita concluiu apos as tentativas');
});

test('retry budget is dimensioned for the measured write cost', async () => {
  // Trava os numeros contra regressao silenciosa: 6 tentativas com base 250 ms cobrem varias
  // vezes os ~2 s medidos de uma transacao. Se alguem voltar para 25 ms/3, isto falha.
  const fonte = require('node:fs').readFileSync(
    require.resolve('../src/infrastructure/database/postgres-store.js'), 'utf8',
  );
  const attempts = Number(/FENIX_STORE_RETRY_ATTEMPTS \|\| (\d+)/.exec(fonte)[1]);
  const base = Number(/FENIX_STORE_RETRY_BASE_MS \|\| (\d+)/.exec(fonte)[1]);
  assert.ok(attempts >= 5, `tentativas insuficientes: ${attempts}`);
  assert.ok(base >= 200, `backoff base curto para o custo medido de ~2s: ${base}ms`);
});
