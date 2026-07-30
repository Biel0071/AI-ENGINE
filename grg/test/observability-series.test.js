// Serie temporal medida. MEDIDO (2026-07-30): a plataforma nao tinha NENHUMA amostragem de
// metrica ao longo do tempo -- so estado corrente. O painel novo pede sparklines, e um sparkline
// sem serie medida so pode ser desenhado inventando pontos. Estes testes provam que a serie vem
// de amostras reais e que a AUSENCIA de amostra nunca vira zero.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObservabilitySeriesService, SERIES_NAMES } = require('../src/operations/observability-series');
const { MemoryStore } = require('../src/kernel/store');
const { measured, unknown } = require('../src/kernel/measurement');
const { CURRENT_SCHEMA_VERSION, migrateState } = require('../src/kernel/state-migrations');
const { DEFAULT_LIMITS } = require('../src/kernel/retention');

const cp = { authorize: async () => true };

// Center de teste: devolve o MESMO contrato do observability-center real (envelopes
// measured/unknown), para o coletor ser exercitado no formato que ele vai encontrar.
function centerWith({ rss = 120, calls = 4, queueDepth = 2, loadUnknown = true } = {}) {
  return {
    getMetrics: async () => ({
      tenantId: 't',
      system: {
        processRssMb: measured(rss, 'process.memoryUsage'),
        processHeapUsedMb: measured(60, 'process.memoryUsage'),
        hostTotalMemMb: measured(16000, 'os.totalmem'),
        hostLoadAvg1m: loadUnknown ? unknown('os.loadavg unavailable on this platform') : measured(0.42, 'os.loadavg'),
        cpuUsagePercent: unknown('instantaneous CPU% requires timed cpuUsage() sampling', { action: 'expose a sampled gauge from the runtime loop' }),
        uptimeSeconds: measured(99, 'process.uptime'),
      },
      aiRuntime: {
        calls: measured(calls, 'ai-gateway.telemetry'),
        cacheHits: measured(1, 'ai-gateway.telemetry'),
        totalTokensConsumed: measured(777, 'ai-gateway.telemetry'),
        totalCostUsd: measured(0.01, 'ai-gateway.telemetry'),
        budget: measured({ total: null }, 'ai-gateway.budget'),
        providers: unknown('provider health probe unavailable'),
      },
      workers: {
        knownWorkers: measured(1, 'store:workerHeartbeats'),
        jobsByStatus: measured({ PENDING: 2 }, 'store:runtimeJobs'),
        queueDepth: measured(queueDepth, 'store:runtimeJobs'),
        deadLetters: measured(0, 'store:deadLetters'),
      },
      timestamp: new Date().toISOString(),
    }),
  };
}

function svc(center, extra = {}) {
  const store = extra.store || new MemoryStore();
  // cpuSampleMs curto: o teste nao precisa de precisao, precisa de que a janela exista.
  return { store, service: new ObservabilitySeriesService({ store, controlPlane: cp, observabilityCenter: center, cpuSampleMs: 20, ...extra }) };
}

test('serie: a colecao existe no schema corrente e tem teto de retencao', async () => {
  // Sem entrada no migrations a leitura antes da primeira escrita acha undefined; sem teto de
  // retencao, 1.440 amostras/dia crescem o documento unico para sempre (toda escrita reserializa).
  assert.ok(CURRENT_SCHEMA_VERSION >= 35, `schema corrente ${CURRENT_SCHEMA_VERSION} nao inclui a serie`);
  const { state } = migrateState({ schemaVersion: 34 });
  assert.ok(Array.isArray(state.observabilitySamples), 'observabilitySamples nao foi criada pela migracao');
  assert.ok(Array.isArray(new MemoryStore().state.observabilitySamples), 'seed do store nao tem observabilitySamples');
  assert.ok(DEFAULT_LIMITS.observabilitySamples > 0, 'observabilitySamples sem teto de retencao');
});

test('serie: uma amostra por chamada, com os campos MEDIDOS do relatorio', async () => {
  const { store, service } = svc(centerWith({ rss: 128, calls: 7 }));
  const result = await service.sample('t', 'a');
  assert.equal(result.recorded, true);
  const rows = (await store.read()).observabilitySamples;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].values.processRssMb, 128);
  assert.equal(rows[0].values.aiCalls, 7);
  assert.equal(rows[0].values.queueDepth, 2);
  assert.ok(rows[0].recordedAt, 'amostra sem recordedAt nao pode ser ordenada no tempo');
});

test('serie: campo unknown fica FORA da amostra -- nunca gravado como zero', async () => {
  // hostLoadAvg1m e unknown no Windows. Gravar 0 ali faria o grafico de carga despencar sem que
  // nada tenha acontecido no host. Ausencia e ausencia.
  const { store, service } = svc(centerWith({ loadUnknown: true }));
  const result = await service.sample('t', 'a');
  const values = (await store.read()).observabilitySamples[0].values;
  assert.equal(Object.prototype.hasOwnProperty.call(values, 'hostLoadAvg1m'), false);
  assert.ok(result.missing.includes('hostLoadAvg1m'), 'o campo nao medido precisa ser reportado como missing');
});

test('serie: o coletor MEDE o CPU% que o relatorio por requisicao deixa unknown', async () => {
  // O observability-center devolve cpuUsagePercent unknown com pending.action "expose a sampled
  // gauge from the runtime loop" -- porque CPU% exige duas amostras no tempo. Este coletor roda
  // no loop, tem janela, e resolve exatamente aquela pendencia.
  const center = centerWith();
  const relatorio = await center.getMetrics();
  assert.equal(relatorio.system.cpuUsagePercent.state, 'unknown');
  const { store, service } = svc(center);
  await service.sample('t', 'a');
  const values = (await store.read()).observabilitySamples[0].values;
  assert.equal(typeof values.cpuUsagePercent, 'number');
  assert.ok(values.cpuUsagePercent >= 0 && values.cpuUsagePercent <= 100, `cpu fora da faixa: ${values.cpuUsagePercent}`);
});

test('serie: sem amostra a serie e unknown com motivo -- nunca uma linha de zeros', async () => {
  const { service } = svc(centerWith());
  const out = await service.series('t', 'a');
  assert.equal(out.sampleCount.state, 'measured');
  assert.equal(out.sampleCount.value, 0); // zero amostras e medicao: "o loop ainda nao rodou"
  for (const name of SERIES_NAMES) {
    assert.equal(out.series[name].state, 'unknown', `${name} deveria ser unknown sem amostra`);
    assert.ok(out.series[name].reason);
    assert.equal(out.series[name].value, null);
  }
});

test('serie: com amostras, os pontos sao medidos e em ordem cronologica', async () => {
  const { service } = svc(centerWith({ rss: 100 }));
  await service.sample('t', 'a');
  await service.sample('t', 'a');
  const out = await service.series('t', 'a');
  assert.equal(out.sampleCount.value, 2);
  const rss = out.series.processRssMb;
  assert.equal(rss.state, 'measured');
  assert.equal(rss.source, 'store:observabilitySamples');
  assert.equal(rss.value.length, 2);
  assert.ok(Date.parse(rss.value[0].at) <= Date.parse(rss.value[1].at), 'pontos fora de ordem cronologica');
  assert.equal(rss.value[0].value, 100);
});

test('serie: a janela filtra por tempo e nao vaza amostra de outro tenant', async () => {
  const store = new MemoryStore();
  const antiga = new Date(Date.now() - 6 * 60 * 60_000).toISOString();
  await store.update((state) => {
    state.observabilitySamples.push({ id: 'velha', tenantId: 't', recordedAt: antiga, values: { processRssMb: 1 } });
    // Sentinela improvavel: um valor como 2 colide com metrica legitima (queueDepth e 2 aqui) e
    // a busca por vazamento acusaria um ponto proprio.
    state.observabilitySamples.push({ id: 'outra', tenantId: 'outro', recordedAt: new Date().toISOString(), values: { processRssMb: 987654 } });
    return state;
  });
  const { service } = svc(centerWith(), { store });
  await service.sample('t', 'a');

  const janela = await service.series('t', 'a', { windowMinutes: 60 });
  assert.equal(janela.sampleCount.value, 1, 'a amostra de 6h atras nao pode entrar na janela de 60 min');
  assert.equal(janela.totalStored.value, 2, 'totalStored conta so o tenant, sem vazar o outro');

  const tudo = await service.series('t', 'a', { windowMinutes: 24 * 60 });
  assert.equal(tudo.sampleCount.value, 2);
  assert.ok(!JSON.stringify(tudo.series).includes('987654'), 'ponto de outro tenant apareceu na serie');
});

test('serie: todo campo coletado tambem e oferecido na serie', async () => {
  // MEDIDO no endpoint ao vir: `cpuUsagePercent` era GRAVADO em toda amostra e nunca DEVOLVIDO,
  // porque a lista canonica so tinha os campos do relatorio. A unica metrica que este coletor
  // mede por conta propria ficava invisivel a menos que o cliente adivinhasse o nome.
  const { service } = svc(centerWith());
  await service.sample('t', 'a');
  const out = await service.series('t', 'a');
  assert.ok(out.available.includes('cpuUsagePercent'), 'cpuUsagePercent coletado mas fora de available');
  assert.equal(out.series.cpuUsagePercent.state, 'measured', 'cpuUsagePercent nao foi devolvido na serie default');
  assert.equal(out.series.cpuUsagePercent.value.length, 1);
  // Nome inexistente nao pode virar serie vazia: sugeriria um campo nao medido em vez de inexistente.
  const invented = await service.series('t', 'a', { names: ['naoExisteEssaMetrica'] });
  assert.deepEqual(Object.keys(invented.series), []);
});

test('serie: sem center wired o coletor NAO grava e diz por que', async () => {
  const { store, service } = svc(null);
  const result = await service.sample('t', 'a');
  assert.equal(result.recorded, false);
  assert.ok(result.reason);
  assert.equal((await store.read()).observabilitySamples.length, 0);
});

test('serie: o CICLO REAL do worker grava a amostra e respeita a cadencia propria', async () => {
  // Roda o ciclo de verdade (startWorker + cycle), nao as pecas separadas: o que importa provar e
  // que o processo periodico CHAMA o coletor, na ordem certa, sob o lease. Redis e substituido por
  // um stub em memoria porque o teste nao mede o Redis -- mede o ciclo do worker.
  const { startWorker } = require('../src/runtime/worker');
  const mem = new Map();
  const client = {
    async set(k, v, opts) { const nx = JSON.stringify(opts || '').includes('NX'); if (nx && mem.has(k)) return null; mem.set(k, v); return 'OK'; },
    async get(k) { return mem.get(k) ?? null; },
    async del(k) { return mem.delete(k) ? 1 : 0; },
    async eval() { return 1; },
    async pExpire() { return 1; },
    async ping() { return 'PONG'; },
  };
  const redis = { client, health: async () => ({ ok: true }), close: async () => {} };
  const w = await startWorker({ env: { ...process.env, FENIX_ENV: 'development' }, redis });
  try {
    const t = 'grg-serie'; const a = 'owner';
    await w.app.controlPlane.createTenant({ id: t, name: 'GRG' }, a);
    await w.app.store.update((s) => { s.runtimeSchedules.push({ id: 's1', tenantId: t, enabled: true, createdBy: a }); return s; });

    await w.cycle();
    const depois1 = (await w.app.store.read()).observabilitySamples;
    assert.equal(depois1.length, 1, 'o ciclo do worker nao gravou amostra');
    assert.equal(depois1[0].trigger, 'runtime-worker');
    assert.ok(Object.keys(depois1[0].values).length >= 10, 'amostra com poucos campos medidos');

    // Cadencia propria: o ciclo roda a cada 2 s, a amostragem a cada 60 s. Amostrar em todo ciclo
    // encheria o teto de retencao (720) em ~24 min de historico em vez de 12 h.
    await w.cycle();
    assert.equal((await w.app.store.read()).observabilitySamples.length, 1, 'o worker amostrou duas vezes dentro da mesma janela de cadencia');

    const serie = await w.app.observabilitySeries.series(t, a, { windowMinutes: 60 });
    assert.equal(serie.series.processRssMb.state, 'measured');
    assert.equal(serie.series.cpuUsagePercent.state, 'measured');
  } finally { await w.stop(); }
});

test('serie: quem amostra em producao e o worker, o unico processo periodico com chamador', async () => {
  // MEDIDO (2026-07-30): o coletor nasceu ligado ao loop `observability` do living-runtime. Mas
  // `LivingRuntime` NAO TEM CHAMADOR -- nenhum processo o instancia (varredura em src/, ops/,
  // test/, package.json e compose). Um coletor pendurado nele nunca amostraria, e o painel
  // mostraria "nao medido" para sempre parecendo correto. Este teste prende a amostragem ao
  // processo que de fato roda, e falha se ela voltar para o supervisor que ninguem sobe.
  const fs = require('node:fs');
  const path = require('node:path');
  const raiz = path.join(__dirname, '..');
  const worker = fs.readFileSync(path.join(raiz, 'src', 'runtime', 'worker.js'), 'utf8');
  assert.match(worker, /observabilitySeries\.sample\(/, 'o worker nao amostra a serie');
  // Sob o lease de lider: dois workers amostrando duplicariam cada ponto do grafico e dobrariam
  // as escritas no documento unico.
  const bloco = /if \(leader && app\.observabilitySeries[\s\S]*?\n    \}/.exec(worker);
  assert.ok(bloco, 'a amostragem precisa estar sob `leader &&` (sem lease, dois workers duplicam a serie)');
  assert.match(bloco[0], /FENIX_OBSERVABILITY_SAMPLE_MS/, 'a amostragem precisa de cadencia propria, nao a do ciclo de 2s');

  // Cadencia repassada pelo compose: sem estar na allowlist, ajustar o intervalo exigiria rebuild.
  const compose = fs.readFileSync(path.join(raiz, 'docker-compose.enterprise.yml'), 'utf8');
  for (const nome of ['FENIX_OBSERVABILITY_SAMPLE_MS', 'FENIX_RETENTION_OBSERVABILITY_SAMPLES']) {
    assert.match(compose, new RegExp(`^\\s+${nome}:`, 'm'), `${nome} nao chega ao container`);
  }
});
