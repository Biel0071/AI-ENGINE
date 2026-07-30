const { uuid } = require('../kernel/ids');
const { measured, unknown, isMeasured, valueOf } = require('../kernel/measurement');
const { cpuUsagePercent } = require('./host-metrics');

// SERIE TEMPORAL MEDIDA.
//
// MEDIDO (2026-07-30): a plataforma nao tinha NENHUMA amostragem de metrica ao longo do tempo.
// Havia estado corrente (`/api/observability/metrics`) e historico por entidade
// (`/api/operations/history`, `/api/versions`, ...), mas nada que permitisse dizer "o RSS subiu
// nos ultimos 20 minutos". O painel novo pede sparklines; um sparkline sem serie medida so pode
// ser desenhado inventando os pontos -- exatamente o sinal que o simulation-audit existe para
// pegar. Entao a serie vem primeiro, e a linha e desenhada a partir dela ou nao e desenhada.
//
// Duas regras que este modulo carrega:
//
// 1. So entra na amostra o campo cujo envelope veio `measured`. Um campo `unknown` NAO e
//    gravado como 0 -- ele fica FORA da amostra. Zero e uma medicao ("nao ha jobs na fila"),
//    ausencia e outra coisa ("nao consegui medir"), e uma serie que confunde as duas produz um
//    grafico que despenca sem que nada tenha acontecido no sistema.
// 2. A amostra guarda escalares crus, sem envelope. O envelope descreve a PROVENIENCIA de uma
//    leitura; repetido 720 vezes no documento unico ele seria puro overhead de bytes (e toda
//    escrita do store reserializa o documento). A proveniencia da serie inteira e uma so, e
//    fica na resposta do `series()`: os pontos vieram do observability-center, medidos.
//
// O CPU% e o unico campo que este coletor MEDE por conta propria. O observability-center o
// devolve `unknown` com `pending.action: 'expose a sampled gauge from the runtime loop'` --
// porque CPU% instantaneo exige duas amostras separadas no tempo, o que um handler HTTP nao
// pode fazer sem atrasar a resposta. Este coletor roda dentro do loop do runtime, onde 200 ms
// de janela sao aceitaveis. E exatamente a pendencia que o proprio relatorio pedia.
const SAMPLE_FIELDS = Object.freeze({
  processRssMb: (m) => m.system?.processRssMb,
  processHeapUsedMb: (m) => m.system?.processHeapUsedMb,
  hostTotalMemMb: (m) => m.system?.hostTotalMemMb,
  hostLoadAvg1m: (m) => m.system?.hostLoadAvg1m,
  uptimeSeconds: (m) => m.system?.uptimeSeconds,
  aiCalls: (m) => m.aiRuntime?.calls,
  aiCacheHits: (m) => m.aiRuntime?.cacheHits,
  aiTokens: (m) => m.aiRuntime?.totalTokensConsumed,
  aiCostUsd: (m) => m.aiRuntime?.totalCostUsd,
  knownWorkers: (m) => m.workers?.knownWorkers,
  queueDepth: (m) => m.workers?.queueDepth,
  deadLetters: (m) => m.workers?.deadLetters,
});

// Campos que o COLETOR mede por conta propria, fora do relatorio por requisicao (CPU% precisa de
// janela de tempo; bytes/series do exporter medem a propria superficie de metricas).
const COLLECTOR_FIELDS = Object.freeze(['cpuUsagePercent', 'metricBytes', 'metricSeries']);

// Ordem canonica para a UI: qualquer consumidor pode listar as series disponiveis sem
// adivinhar nomes, e um campo que nunca foi medido aparece como serie VAZIA (nao como zero).
// Medido no endpoint ao vir: com a lista so dos campos do relatorio, `cpuUsagePercent` era
// GRAVADO em toda amostra e nunca DEVOLVIDO -- a unica metrica que este coletor mede por conta
// propria ficava invisivel a menos que o cliente adivinhasse o nome. Serie coletada e serie
// oferecida sao a mesma lista.
const SERIES_NAMES = Object.freeze([...Object.keys(SAMPLE_FIELDS), ...COLLECTOR_FIELDS]);

function numeric(entry) {
  if (!isMeasured(entry)) return null;
  const value = Number(valueOf(entry));
  return Number.isFinite(value) ? value : null;
}

class ObservabilitySeriesService {
  constructor({ store, controlPlane, observabilityCenter, metrics = null, cpuSampleMs = 200 }) {
    this.store = store;
    this.cp = controlPlane;
    this.center = observabilityCenter;
    this.metrics = metrics;
    this.cpuSampleMs = cpuSampleMs;
  }

  // Chamado pelo loop `observability` do living-runtime. Uma escrita por tick: o custo de
  // escrever no store cresce com o documento inteiro, entao a amostra e montada em memoria e
  // gravada uma unica vez.
  async sample(tenantId, actorId, { trigger = 'living-runtime' } = {}) {
    if (!this.center || typeof this.center.getMetrics !== 'function') {
      return { recorded: false, reason: 'observability center is not wired' };
    }
    const report = await this.center.getMetrics(tenantId, actorId);

    const values = {};
    const missing = [];
    for (const [name, pick] of Object.entries(SAMPLE_FIELDS)) {
      const value = numeric(pick(report));
      if (value === null) missing.push(name);
      else values[name] = value;
    }

    // A pendencia que o proprio observability-center registra: CPU% exige janela de tempo.
    // Aqui existe janela, entao aqui o valor e medido de verdade.
    const cpu = await cpuUsagePercent(this.cpuSampleMs);
    if (isMeasured(cpu)) values.cpuUsagePercent = Number(valueOf(cpu));
    else missing.push('cpuUsagePercent');

    // Bytes/series do exporter Prometheus: mede o proprio crescimento da superficie de
    // metricas. Opcional -- sem exporter, o campo fica fora da amostra em vez de virar 0.
    if (this.metrics && typeof this.metrics.render === 'function') {
      const exposition = await this.metrics.render();
      values.metricBytes = Buffer.byteLength(exposition);
      values.metricSeries = exposition.split('\n').filter((line) => line && !line.startsWith('#')).length;
    }

    const sample = { id: uuid(), tenantId, recordedAt: new Date().toISOString(), trigger, values };
    await this.store.update((state) => {
      if (!Array.isArray(state.observabilitySamples)) state.observabilitySamples = [];
      state.observabilitySamples.push(sample);
      return state;
    });

    return { recorded: true, sampleId: sample.id, fields: Object.keys(values).length, missing };
  }

  // Serie para a UI. Cada ponto e [recordedAt, valor] apenas para as amostras em que aquele
  // campo foi medido -- uma serie com buracos e honesta; uma serie preenchida com zeros nao e.
  async series(tenantId, actorId, { windowMinutes = 120, names = SERIES_NAMES } = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const state = await this.store.read();
    const all = (state.observabilitySamples || []).filter((s) => s.tenantId === tenantId);

    const cutoff = Number.isFinite(windowMinutes) && windowMinutes > 0
      ? Date.now() - windowMinutes * 60_000
      : null;
    const inWindow = all
      .filter((s) => {
        if (cutoff === null) return true;
        const at = Date.parse(s.recordedAt);
        return Number.isFinite(at) && at >= cutoff;
      })
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));

    // Nome desconhecido e descartado em vez de virar serie vazia: uma serie vazia com nome
    // inventado sugeriria que o campo existe e nao foi medido, quando ele nunca existiu.
    const wanted = names.filter((name) => SERIES_NAMES.includes(name));
    const series = {};
    for (const name of wanted) {
      const points = inWindow
        .filter((s) => Number.isFinite(Number(s.values?.[name])))
        .map((s) => ({ at: s.recordedAt, value: Number(s.values[name]) }));
      // Serie vazia NAO vira zero: vira unknown com o motivo, e o painel mostra ausencia.
      series[name] = points.length
        ? measured(points, 'store:observabilitySamples', { points: points.length })
        : unknown(`nenhuma amostra medida de ${name} na janela de ${windowMinutes} min`, {
          action: 'aguardar o loop observability do living runtime coletar (cadencia de 60s)',
        });
    }

    return {
      tenantId,
      windowMinutes,
      // Zero amostras e uma medicao legitima do coletor: "o loop ainda nao rodou". O consumidor
      // ve 0 com proveniencia, nao um numero sem origem.
      sampleCount: measured(inWindow.length, 'store:observabilitySamples'),
      totalStored: measured(all.length, 'store:observabilitySamples'),
      firstAt: inWindow.length ? inWindow[0].recordedAt : null,
      lastAt: inWindow.length ? inWindow[inWindow.length - 1].recordedAt : null,
      available: SERIES_NAMES,
      series,
      collectedAt: new Date().toISOString(),
    };
  }
}

module.exports = { ObservabilitySeriesService, SERIES_NAMES, SAMPLE_FIELDS };
