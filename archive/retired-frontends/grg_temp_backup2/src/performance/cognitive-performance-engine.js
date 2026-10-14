const { ValidationError } = require('../kernel/errors');
const { measured, unknown } = require('../kernel/measurement');

// Os `levels` da hot memory eram uma tabela inteira de numeros inventados (size 1/3/8/15/42/120,
// hitCount 142/89/64/38/22/5) e o speed score era 98.4 fixo com 6 metricas fabricadas. Nada
// disso lia o store. O nome "L4_GLOBAL: 42 itens" e pior que um vazio porque parece telemetria.
// Agora cada nivel CONTA o que existe de fato no estado, e o score DERIVA das chamadas
// gravadas em aiCalls -- sem chamada nenhuma, nao existe score: existe `unknown`.
class CognitivePerformanceEngine {
  constructor({ store, bus, controlPlane, knowledgeGenome, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
    this.digitalTwin = digitalTwin;
    this.hotMemoryCache = new Map();
  }

  async getHotMemoryState(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    const mine = (collection) => (Array.isArray(state[collection]) ? state[collection] : []).filter((item) => item.tenantId === tenantId);
    // Cada nivel aponta para uma colecao REAL do store. O `size` e um count, com a fonte
    // registrada; `hits` so existe para o L0, que e o unico cache que este processo mantem.
    const level = (name, collection, ttl, filter) => {
      const rows = filter ? mine(collection).filter(filter) : mine(collection);
      return { name, source: `store:${collection}`, size: measured(rows.length, `store:${collection}`), ttl };
    };
    return {
      tenantId,
      levels: {
        L0_CONTEXT: {
          name: 'Current Context',
          source: 'process:hotMemoryCache',
          size: measured(this.hotMemoryCache.size, 'process:hotMemoryCache'),
          ttl: 'Realtime',
        },
        L1_MISSION: level('Active Mission', 'missions', 'Mission Lifetime', (m) => m.status === 'RUNNING' || m.status === 'PLANNED'),
        L2_PROJECT: level('Current Project', 'projects', 'Project Lifetime'),
        L3_ORGANIZATION: level('Company Org', 'repositories', 'Persistent'),
        L4_GLOBAL: level('Global Knowledge', 'knowledgeEntities', 'Permanent'),
        L5_ARCHIVE: level('Historical Archive', 'artifacts', 'Cold Store'),
      },
      cachedItemsCount: this.hotMemoryCache.size,
      // "PREWARMED" era afirmado sempre, inclusive com o cache vazio.
      predictiveCacheStatus: this.hotMemoryCache.size > 0
        ? measured('PREWARMED', 'process:hotMemoryCache')
        : unknown('nenhum prefetch executado neste processo', { action: 'chamar prefetchContext para aquecer o cache' }),
      timestamp: new Date().toISOString(),
    };
  }

  async getSpeedScore(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const state = await this.store.read();
    const calls = (Array.isArray(state.aiCalls) ? state.aiCalls : []).filter((item) => item.tenantId === tenantId);
    if (calls.length === 0) {
      // Sem execucao nao ha desempenho a medir. Devolver 98.4 aqui era o pior tipo de
      // mentira: um numero alto que nasce do nada e passa a impressao de sistema rapido.
      return {
        tenantId,
        overallScore: unknown('nenhuma chamada de IA registrada para este tenant', { action: 'executar uma missao ou invocar o gateway de IA' }),
        metrics: {
          avgResponseMs: unknown('sem chamadas registradas'),
          cacheHitRate: unknown('sem chamadas registradas'),
          tokensPerCall: unknown('sem chamadas registradas'),
        },
        sampleSize: measured(0, 'store:aiCalls'),
        trend: unknown('serie temporal exige pelo menos duas janelas com chamadas'),
        evaluatedAt: new Date().toISOString(),
      };
    }
    const latencies = calls.map((c) => Number(c.latencyMs)).filter((n) => Number.isFinite(n));
    const avgResponseMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
    const cacheHitRate = calls.filter((c) => c.cached).length / calls.length;
    const tokensPerCall = calls.reduce((sum, c) => sum + (Number(c.totalTokens) || 0), 0) / calls.length;
    // Score composto do que existe: latencia (alvo 2000ms) e aproveitamento de cache. Sem
    // pesos inventados para "precisao da solucao" ou "taxa de retrabalho", que ninguem mede.
    const latencyScore = avgResponseMs === null ? null : Math.max(0, Math.min(100, 100 - (avgResponseMs / 2000) * 100));
    const overall = latencyScore === null
      ? unknown('nenhuma chamada gravou latencyMs')
      : measured(Number((latencyScore * 0.7 + cacheHitRate * 100 * 0.3).toFixed(1)), 'store:aiCalls');
    return {
      tenantId,
      overallScore: overall,
      metrics: {
        avgResponseMs: avgResponseMs === null ? unknown('nenhuma chamada gravou latencyMs') : measured(avgResponseMs, 'store:aiCalls'),
        cacheHitRate: measured(Number(cacheHitRate.toFixed(4)), 'store:aiCalls'),
        tokensPerCall: measured(Math.round(tokensPerCall), 'store:aiCalls'),
      },
      sampleSize: measured(calls.length, 'store:aiCalls'),
      trend: unknown('serie temporal ainda nao persistida por janela', { action: 'gravar snapshots periodicos do score para comparar janelas' }),
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Antes: listava 4 componentes "pre-aquecidos" (Digital Twin, Knowledge Graph, API Catalog,
  // Active Missions) sem ler nenhum deles -- eram strings. Agora o prefetch LE o store e
  // guarda os counts que realmente carregou; o que nao conseguiu carregar aparece como falha.
  async prefetchContext(tenantId, actorId, contextInfo = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const project = contextInfo.project || 'general';
    const state = await this.store.read();
    const count = (collection) => (Array.isArray(state[collection]) ? state[collection] : []).filter((item) => item.tenantId === tenantId).length;
    const loaded = {
      missions: count('missions'),
      knowledgeEntities: count('knowledgeEntities'),
      projects: count('projects'),
      repositories: count('repositories'),
    };
    this.hotMemoryCache.set(`${tenantId}:${project}`, { prewarmedAt: new Date().toISOString(), loaded });
    return {
      tenantId,
      project,
      status: measured('PREFETCH_COMPLETED', 'store:read'),
      prewarmed: Object.fromEntries(Object.entries(loaded).map(([k, v]) => [k, measured(v, `store:${k}`)])),
      cachedItemsCount: this.hotMemoryCache.size,
    };
  }

  getMultiStagePacing(complexity = 'MEDIUM') {
    const comp = String(complexity).toUpperCase();
    if (comp === 'LOW') {
      return { initialDelayMs: 150, stageIntervalMs: 300, pacing: 'HUMANIZED_FAST' };
    }
    if (comp === 'HIGH') {
      return {
        initialDelayMs: 100,
        stages: [
          { elapsedMs: 100, status: 'Entendi. Estou analisando o ecossistema.' },
          { elapsedMs: 500, status: 'Primeiras evidências e dependências identificadas.' },
          { elapsedMs: 2000, status: 'Plano de execução e grafo de tarefas gerados.' },
          { elapsedMs: 10000, status: 'Resultado completo consolidado.' },
        ],
        pacing: 'HUMANIZED_PROGRESSIVE',
      };
    }

    return { initialDelayMs: 250, stageIntervalMs: 800, pacing: 'HUMANIZED_BALANCED' };
  }
}

module.exports = { CognitivePerformanceEngine };
