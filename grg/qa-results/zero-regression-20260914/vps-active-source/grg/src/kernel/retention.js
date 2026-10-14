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
  // o payload do evento). 1.000 = ~1,3 MB.
  auditEvents: 1_000,
  // Projecao da cidade: reconstruivel a partir do event store, pode ser agressiva.
  cityNodes: 750,
  cityEdges: 750,
  cityProjectionStates: 200,
  // Eventos de dominio e derivados (~900 bytes por evento).
  domainEvents: 1_000,
  executionTimeline: 1_000,
  missionEvents: 1_000,
  orchestrationEvents: 1_000,
  // Historico operacional: o trend usa apenas as ultimas ~20 amostras por componente.
  // Com 26 componentes, 750 cobre ~28 runs de historico.
  operationalComponentHistory: 750,
  operationalActivationRuns: 200,
  // Cada readiness report carrega os 26 checks: ~6 KB por item.
  operationalReadinessReports: 50,
  operationalStabilityReports: 50,
  dailyIntelligenceReports: 90,
  // Um heartbeat por processo worker. Containers recriados deixam registros orfaos
  // (8 em producao para 1 worker vivo); o probe de frescor usa apenas o mais recente.
  workerHeartbeats: 20,
  // Versionamento/changesets derivados (~900 bytes cada).
  resourceVersions: 500,
  changeSets: 500,
  operationalTwins: 200,
  // Execucoes. runtimeJobs carrega payload E resultado completos: medido em producao,
  // ~19 KB por job — o item mais caro do documento por uma ordem de magnitude. Com
  // teto 200 ele sozinho passava de 2,5 MB (36% do total). 60 cobre o historico
  // recente de execucao; o resto pertence a um sink externo.
  runtimeJobs: 60,
  deadLetters: 200,
  sandboxExecutions: 200,
  onedeployRuns: 200,
  smokeRuns: 200,
  realityFeedbacks: 500,
  // Telemetria de IA.
  aiCalls: 1_000,
  // Barramento cognitivo do NEXUS: append-only, carrega payload do evento.
  // cognitiveMarketplaceItems NAO entra aqui — e catalogo (estado), nao historico.
  cognitiveEvents: 1_000,
  // V11 — Living Core. Esta e a colecao com a maior taxa de escrita da plataforma: um
  // registro a cada tick (2 s por padrao), cada um carregando o resultado de todo loop
  // vencido. Sem teto, um dia de runtime vivo adiciona ~43.000 entradas ao documento
  // unico — e o custo de TODA escrita do sistema cresce com o tamanho total dele. 300
  // cobre ~10 min de historico a 2 s, que e o suficiente para o probe de saude e para a
  // metrica de "ultima execucao por loop". Historico longo pertence ao sink externo.
  livingRuntimeTicks: 300,
  // Um lease por processo. Containers recriados deixam registros expirados.
  livingRuntimeLeases: 20,
  // Cache de resposta de fonte externa: carrega o corpo da resposta, entao e caro por
  // item. O TTL ja expira o conteudo; o teto protege o tamanho do documento.
  researchSourceCache: 200,
  // Varredura de auto-organizacao a cada 15 min: ~96/dia.
  improvementScans: 200,
  // MISSION-0004 — telemetria de conector: uma linha por selfTest/status e uma por
  // transicao. Historico, nao estado (o estado CONNECTED e derivado a cada leitura).
  // connectorRegistry NAO entra aqui: e estado, perder uma linha seria perder um conector.
  connectorMetrics: 500,
  connectorEvents: 200,
  // MISSION-1003 — decisões do AI Router. Histórico para o ranking do Learning Router.
  aiRouterDecisions: 500,
  // Benchmark por missao concluida. Playbooks NAO entram aqui: sao conhecimento
  // reutilizavel (estado), e podar um playbook e perder o que a plataforma aprendeu.
  missionBenchmarks: 500,
  // Chat de voz: `messages` tem a maior taxa de escrita depois dos ticks -- uma linha por
  // turno, e conversa por voz gera turnos curtos e rapidos. Cada linha carrega o texto
  // completo (~200-600 bytes). 2.000 = ~1 MB no documento unico.
  //
  // Limitacao conhecida e assumida: a poda e por colecao, entao ela corta as mensagens mais
  // antigas GLOBALMENTE, misturando conversas de tenants diferentes. Uma conversa antiga pode
  // perder o inicio e manter o fim. Isso e aceitavel porque (a) o resumo da conversa fica em
  // `conversations`, que NAO e podada, e (b) o indice semantico vive no MemoryEngine/qdrant,
  // fora deste documento -- o contexto recuperado sobrevive a poda do transcript literal.
  // O caminho definitivo e mover messages para uma tabela propria no Postgres, fora do
  // documento unico; enquanto o store e um JSON so, o teto e a unica protecao real.
  messages: 2_000,
  // Serie temporal de observabilidade: uma amostra por tick do loop `observability` (60 s por
  // padrao) = 1.440/dia. Cada amostra guarda SO numeros escalares ja medidos (sem envelope,
  // sem payload): ~250 bytes. 720 = 12 h de historico em ~180 KB, que e o que um sparkline
  // consome. Historico mais longo pertence ao Prometheus (que ja raspa /metrics), nao ao
  // documento unico -- aqui a serie existe para a UI ter uma linha MEDIDA sem depender de um
  // segundo sistema estar de pe.
  observabilitySamples: 720,
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
