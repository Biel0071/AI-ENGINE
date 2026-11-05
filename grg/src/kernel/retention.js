// Retencao de colecoes append-only.
//
// Motivo: o store e um documento unico serializado a cada update. Colecoes de
// historico (auditoria, projecao da cidade, historico de componentes) so cresciam,
// e o custo de CADA escrita cresce com o tamanho total do documento. Em producao
// isso chegou a 8.74 MB / 1.5 s por update, o que fez a ativacao operacional
// (26 probes x 2 escritas) levar mais de 78 s e impedir o boot do servico.
//
// Politica: manter as N entradas mais recentes das colecoes puramente historicas.
// Colecoes de ESTADO (tenants, users, repositories, capabilities...) nunca sao
// podadas — perder uma linha ali seria perder dado de dominio.

// Limites por colecao. Ajustaveis por env para operacao (FENIX_RETENTION_<COLECAO>).
// Os tetos sao dimensionados pelo BYTES que a colecao ocupa no documento unico,
// nao pela vontade de guardar historico: medido em producao, auditEvents no teto
// antigo de 5.000 ocupava 3,8 MB dos 9,2 MB totais, e o custo de toda escrita do
// sistema cresce com esse total. Historico longo pertence a um sink externo
// (centralized-logs), nao ao documento de estado.
const DEFAULT_LIMITS = {
  // Trilha de auditoria: medido em producao, ~1,3 KB por entrada (o registro carrega
  // o payload do evento). 100 = ~130 KB.
  auditEvents: 100,
  // Checkpoints de missao e recuperacao
  missionCheckpoints: 50,
  // Projecao da cidade: reconstruivel a partir do event store, pode ser agressiva.
  cityNodes: 200,
  cityEdges: 200,
  cityProjectionStates: 50,
  // Memórias cognitivas persistidas no documento de estado (devem ser podadas)
  memories: 100,
  gatekeeperDecisions: 100,
  // Assets externos sao referenciados pela Cidade; limitar o cache persistido evita
  // que URLs e metadados aumentem o documento de estado sem limite.
  worldAssets: 150,
  // Eventos de dominio e derivados (~900 bytes por evento).
  domainEvents: 100,
  executionTimeline: 100,
  missionEvents: 100,
  orchestrationEvents: 100,
  // Historico operacional: o trend usa apenas as ultimas ~20 amostras por componente.
  operationalComponentHistory: 100,
  operationalActivationRuns: 50,
  // Cada readiness report carrega os 26 checks: ~6 KB por item.
  operationalReadinessReports: 25,
  operationalStabilityReports: 25,
  dailyIntelligenceReports: 15,
  // Um heartbeat por processo worker. Containers recriados deixam registros orfaos
  workerHeartbeats: 20,
  // Versionamento/changesets derivados (~900 bytes cada).
  resourceVersions: 150,
  memoryVersions: 150,
  changeSets: 150,
  operationalTwins: 100,
  operationalInvestigations: 100,
  outbox: 100,
  // Execucoes. runtimeJobs carrega payload E resultado completos: medido em producao,
  // ~19 KB por job — o item mais caro do documento por uma ordem de magnitude.
  runtimeJobs: 60,
  deadLetters: 100,
  sandboxExecutions: 100,
  onedeployRuns: 100,
  smokeRuns: 100,
  realityFeedbacks: 250,
  // Telemetria de IA.
  aiCalls: 250,
  // Barramento cognitivo do NEXUS: append-only, carrega payload do evento.
  cognitiveEvents: 250,
  // V11 — Living Core. 100 registros cobre historico operacional sem inflar o documento.
  livingRuntimeTicks: 100,
  // Um lease por processo.
  livingRuntimeLeases: 20,
  // Cache de resposta de fonte externa.
  researchSourceCache: 100,
  // Varredura de auto-organizacao.
  improvementScans: 100,
  // Telemetria de conector.
  connectorMetrics: 250,
  connectorEvents: 100,
  // Decisões do AI Router.
  aiRouterDecisions: 250,
  // Benchmark por missao concluida.
  missionBenchmarks: 250,
  // Chat de voz / mensagens: 500 mensagens de historico imediato.
  messages: 500,
  // Serie temporal de observabilidade.
  observabilitySamples: 200,
  // `conversations` e `chatPreferences` NAO entram: sao estado. Perder uma preferencia
  // silenciosamente faria o modo de voz do usuario "voltar sozinho" para texto.
};

// Campo de ordenacao temporal por colecao (fallback: ordem de insercao).
const TIME_FIELDS = ['createdAt', 'occurredAt', 'checkedAt', 'recordedAt', 'lastSeenAt', 'completedAt', 'startedAt'];

function timeOf(item) {
  for (const field of TIME_FIELDS) {
    if (item && item[field]) {
      const parsed = Date.parse(item[field]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function loadLimits(env = process.env) {
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(DEFAULT_LIMITS)) {
    const envKey = `FENIX_RETENTION_${key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}`;
    const raw = env[envKey];
    if (raw === undefined || raw === '') continue;
    // 0 desliga a poda daquela colecao (mantem tudo), explicitamente.
    const parsed = Number(raw);
    if (Number.isSafeInteger(parsed) && parsed >= 0) limits[key] = parsed;
  }
  return limits;
}

// Poda o estado no lugar. Devolve o que foi removido, para log/telemetria.
function applyRetention(state, limits = DEFAULT_LIMITS) {
  const pruned = {};
  for (const [collection, limit] of Object.entries(limits)) {
    if (!limit) continue; // 0 = sem poda
    const items = state[collection];
    if (!Array.isArray(items) || items.length <= limit) continue;

    // Ordena por tempo quando disponivel; itens sem timestamp mantem posicao relativa
    // (ordem de insercao) e sao tratados como mais antigos que os datados.
    const withIndex = items.map((item, index) => ({ item, index, time: timeOf(item) }));
    withIndex.sort((a, b) => {
      if (a.time === null && b.time === null) return a.index - b.index;
      if (a.time === null) return -1;
      if (b.time === null) return 1;
      return a.time - b.time || a.index - b.index;
    });
    const keep = withIndex.slice(-limit);
    // Restaura a ordem original de insercao entre os mantidos.
    keep.sort((a, b) => a.index - b.index);
    pruned[collection] = items.length - keep.length;
    state[collection] = keep.map((entry) => entry.item);
  }
  return pruned;
}

module.exports = { applyRetention, loadLimits, DEFAULT_LIMITS };
