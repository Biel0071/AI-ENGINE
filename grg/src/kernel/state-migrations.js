const CURRENT_SCHEMA_VERSION = 39;

const COLLECTIONS_BY_VERSION = {
  1: ['tenants', 'orgs', 'customers', 'users', 'memberships', 'projects', 'repositories'],
  2: ['snapshots', 'capabilities', 'memoryEvents', 'graphEdges', 'runs', 'deployments', 'aiCalls', 'aiCache'],
  3: [
    'brands', 'domains', 'plans', 'licenses', 'moduleSets', 'designSystems', 'buildTargets',
    'artifacts', 'marketplaceInstalls', 'subscriptions', 'invoices', 'insights', 'learningCycles',
    'digitalTwins', 'workforces', 'employees', 'dailyReports', 'employeeTemplates',
  ],
  4: ['sessions', 'auditEvents', 'approvalRequests', 'idempotencyKeys', 'outbox', 'inbox'],
  5: ['migrationHistory'],
  6: ['memories', 'memoryVersions'],
  7: ['knowledgeEntities', 'knowledgeRelationships'],
  8: ['serviceRegistry', 'serviceVersions', 'domainEvents', 'fabricEnrollments'],
  9: ['discoveryScans', 'discoveredResources', 'knowledgePublications'],
  10: ['resourceVersions', 'changeSets', 'rollbackProposals'],
  11: ['cityNodes', 'cityEdges', 'cityProjectionStates'],
  12: ['runtimeJobs', 'runtimeSchedules', 'deadLetters', 'workerHeartbeats'],
  13: ['capabilityDefinitions', 'capabilityVersions', 'capabilityLogs'],
  14: ['cognitiveGoals', 'cognitiveObservations', 'cognitiveHypotheses', 'cognitiveDecisions', 'cognitiveValidations', 'cognitiveReflections', 'cognitiveCycles', 'cognitiveCursors'],
  15: ['operationalTwins'],
  16: ['cognitiveEntities', 'cognitiveWorkspaces', 'cognitiveAgents', 'cognitiveAccessGrants', 'knowledgeSharingPolicies'],
  17: ['toolDefinitions', 'scriptSigners', 'scriptDefinitions', 'sandboxExecutions', 'executionTimeline'],
  18: ['inspectionRuns', 'inspectionReports', 'inspectionTwins', 'evolutionProposals'],
  19: ['agentCycles', 'agentTasks', 'agentSummaries', 'knowledgePromotionProposals', 'evolutionPatterns'],
  20: ['operationalActivationRuns', 'operationalComponentStates', 'operationalComponentHistory', 'operationalInvestigations', 'operationalReadinessReports', 'dailyIntelligenceReports', 'operationalAssurances'],
  21: ['missions', 'missionSteps', 'missionEvents', 'missionContextRefs', 'missionSummaries'],
  22: ['missionPlans', 'operationalStabilityReports'],
  // Execucoes reais do OneDeploy e dos smoke tests (substituem retornos simulados).
  23: ['onedeployRuns', 'smokeRuns'],
  24: ['realityFeedbacks'],
  // O CapOS criava a colecao sob demanda no primeiro registro, o que fazia a leitura
  // antes da primeira escrita encontrar undefined. Agora ela existe desde o boot.
  25: ['capOsRegistry', 'cognitiveEvents', 'cognitiveMarketplaceItems', 'cognitiveAtoms', 'presenceConfigs'],
  // GitHubOperationsService criava estas colecoes sob demanda e caia num item de demo
  // quando estavam vazias. Agora existem desde o boot e vazio significa "nada sincronizado".
  26: ['githubOrgs', 'githubPullRequests', 'githubIssues', 'vpsServers', 'vpsOperationPlans', 'selfDeployPipelines', 'factoryDemands'],
  // Governanca V10. `councilDecisions` ja era escrita pelo conselho sem nunca ter sido
  // declarada — criada sob demanda a cada gravacao. `councilSeats` guarda quem ocupa cada
  // assento (sem assento nao ha voto) e `researchCycles` registra o pedido de pesquisa.
  // `objectiveStates` e `gatekeeperDecisions` sustentam a Readiness Matrix e o
  // PRODUCTION_LOCK: toda promocao de objetivo e todo bloqueio ficam auditaveis.
  27: ['councilSeats', 'councilDecisions', 'researchCycles', 'objectiveStates', 'gatekeeperDecisions'],
  // V11 — Living Core. `livingRuntimeTicks` e o registro do que cada loop de fato fez a
  // cada tick, e e a unica base para a afirmacao "o sistema esta vivo" (sem ela seria
  // declaracao). `livingRuntimeLeases` sustenta a lideranca quando nao ha Redis.
  // `missionPlaybooks` e `missionBenchmarks` sao o que sobra de uma missao concluida:
  // antes `mission.completed` era publicado e tinha zero assinantes, e o conhecimento
  // morria no summary. `researchSourceCache` guarda a resposta por host com TTL para o
  // loop de pesquisa nao martelar as fontes. `improvementScans` registra cada varredura
  // de auto-organizacao.
  28: ['livingRuntimeTicks', 'livingRuntimeLeases', 'missionPlaybooks', 'missionBenchmarks', 'researchSourceCache', 'improvementScans', 'assistedModeWindows'],
  // MISSION-0003A — identidade permanente do organismo. Coleção de UM registro: quem o
  // organismo é, desde quando, e por quantas gerações de release/esquema passou. Era o
  // único organo da fundação que existia como módulo (`kernel/organism-identity.js`) mas
  // não estava ligado ao boot — órfão, sem coleção. Sem ela a identidade não sobrevive a
  // um restart, e "o FÊNIX" seria só o nome do processo atual.
  29: ['organismIdentity'],
  // MISSION-0004 — Connector Runtime. `connectorRegistry` é estado (conectores registrados,
  // nunca podado). `connectorMetrics` e `connectorEvents` são histórico append-only (cada
  // selfTest e cada transição de estado), com teto de retenção — o estado CONNECTED é
  // derivado a cada leitura, então o histórico serve para telemetria, não para o veredito.
  30: ['connectorRegistry', 'connectorMetrics', 'connectorEvents'],
  // MISSION-1003 — decisões do AI Router: qual provider foi escolhido para cada execução,
  // por que (tier/evidência), duração e resultado. Histórico append-only para o Learning
  // Router rankear providers por medição real. Teto de retenção como as demais telemetrias.
  31: ['aiRouterDecisions'],
  // Executive Brain real — Programas: agrupamento de missoes que servem a UM objetivo
  // estrategico. Estado (refs de missao), estado derivado do estado das missoes. O Brain
  // decompoe um objetivo em N missoes via mission-planner e as agrupa aqui.
  32: ['programs'],
  // Chat de voz ao vivo. `conversations` e `messages` sao a memoria da conversa: sem elas o
  // chat esquecia tudo ao fechar a aba, o que em voz e pior que em texto (o usuario nao ve o
  // que disse para poder repetir). `chatPreferences` guarda modo de entrada, TTS e
  // sensibilidade do VAD por usuario -- no banco, nao no localStorage, porque o mesmo dono
  // usa celular e desktop e espera o mesmo setup. Migracao ADITIVA: nenhuma coluna existente
  // e tocada, nada e reescrito.
  33: ['conversations', 'messages', 'chatPreferences'],
  // FLUXO 8 — API Connection Manager. `apiConnectionState` e o estado CORRENTE de conexao com
  // cada servico externo (a API Platform hoje): ONLINE/OFFLINE/CONNECTING/DEGRADED, derivado de
  // health-check real, com motivo/ultima tentativa/proxima tentativa/tempo offline. Nunca
  // resposta ficticia: enquanto OFFLINE, o estado diz OFFLINE. `apiConnectionEvents` e o
  // historico append-only de transicoes (com teto de retencao) -- para o Digital Twin e alertas.
  34: ['apiConnectionState', 'apiConnectionEvents'],
  // Serie temporal de observabilidade. MEDIDO: nao existia NENHUMA amostragem de metrica ao
  // longo do tempo -- so estado corrente (`/api/observability/metrics`) e historico por
  // entidade. Sem serie nao ha sparkline honesto: desenhar uma linha exige pontos medidos, e
  // inventar os pontos seria exatamente a simulacao que o auditor existe para pegar.
  // O loop `observability` do living-runtime ja lia as metricas a cada 60s e DESCARTAVA os
  // valores; agora persiste uma amostra por tick. Append-only com teto de retencao, porque
  // toda escrita no store reserializa o documento inteiro (ver kernel/retention.js).
  35: ['observabilitySamples'],
  // FENIX-CONTINUOUS-0001 — estado duravel do orquestrador central. Requests e missions
  // sao estado de dominio; events e a trilha append-only usada para auditoria e retomada.
  36: ['orchestrationRequests', 'orchestrationMissions', 'orchestrationEvents'],
  37: ['missionCheckpoints'],
  38: ['projectKernelStates'],
  39: ['engineeringMemories', 'memoryReuseEvents'],
};

function normalizeVersion(value) {
  const version = Number(value || 0);
  if (!Number.isInteger(version) || version < 0) throw new Error('invalid state schema version');
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`state schema ${version} is newer than supported ${CURRENT_SCHEMA_VERSION}`);
  }
  return version;
}

function migrateState(input, now = () => new Date().toISOString()) {
  const state = input && typeof input === 'object' ? structuredClone(input) : {};
  let version = normalizeVersion(state.schemaVersion);
  const applied = [];

  for (let target = version + 1; target <= CURRENT_SCHEMA_VERSION; target += 1) {
    for (const collection of COLLECTIONS_BY_VERSION[target]) {
      if (!Array.isArray(state[collection])) state[collection] = [];
    }
    state.schemaVersion = target;
    applied.push({ from: target - 1, to: target, appliedAt: now() });
    version = target;
  }

  // Repair missing collections even when an old build wrote an incorrect version.
  for (const collections of Object.values(COLLECTIONS_BY_VERSION)) {
    for (const collection of collections) {
      if (!Array.isArray(state[collection])) state[collection] = [];
    }
  }
  if (applied.length) state.migrationHistory.push(...applied);
  return { state, applied };
}

module.exports = { CURRENT_SCHEMA_VERSION, COLLECTIONS_BY_VERSION, migrateState };
