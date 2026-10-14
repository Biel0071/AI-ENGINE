const { uuid } = require('../kernel/ids');

// EvolutionEngine: o loop de memória evolutiva. Escuta o event bus e, a cada sinal real
// (acoplamento, análise, geração, deploy, install), deriva insights de ordem superior e os
// grava de volta na memória append-only + knowledge graph. Fica LIGADO por padrão (attach()).
//
// Insights são idempotentes (dedup por chave estável): reprocessar não duplica, só evolui.
// Não escuta os próprios eventos (evita loop infinito): assina só eventos de negócio.

const TRIGGERS = [
  'repo.connected', 'scan.completed', 'project.generated',
  'deployment.completed', 'marketplace.installed', 'whitelabel.provisioned', 'app.built',
];

class EvolutionEngine {
  constructor({ store, bus }) {
    this.store = store;
    this.bus = bus;
    this.attached = false;
  }

  // Liga o loop: cada trigger dispara um tick de aprendizado para o tenant do evento.
  attach() {
    if (this.attached) return this;
    for (const type of TRIGGERS) {
      this.bus.on(type, (event) => this.onSignal(event));
    }
    this.attached = true;
    return this;
  }

  async onSignal(event) {
    const tenantId = event.payload && event.payload.tenantId;
    if (!tenantId) return;
    await this.tick(tenantId, event.type);
  }

  // Um ciclo de aprendizado: fotografa a inteligência, deriva insights, persiste memória+grafo.
  async tick(tenantId, trigger = 'manual') {
    const state = await this.store.read();
    const scoped = scopeOf(state, tenantId);
    const derived = deriveInsights(scoped);
    const snapshot = intelligenceSnapshot(scoped);

    await this.store.update((s) => {
      const existingKeys = new Set(s.insights.filter((i) => i.tenantId === tenantId).map((i) => i.key));
      for (const ins of derived) {
        if (existingKeys.has(ins.key)) {
          // evolui: atualiza evidência/detalhe/resumo/confiança se o estado mudou
          const prev = s.insights.find((i) => i.tenantId === tenantId && i.key === ins.key);
          prev.evidence = ins.evidence;
          prev.detail = ins.detail;
          prev.summary = ins.summary;
          prev.confidence = ins.confidence;
          prev.updatedAt = now();
          continue;
        }
        const record = { id: uuid(), tenantId, ...ins, createdAt: now(), updatedAt: now() };
        s.insights.push(record);
        // memória evolutiva com evidência
        s.memoryEvents.push({
          id: uuid(), tenantId, projectId: ins.scope || null, actorId: 'evolution-engine',
          kind: `insight:${ins.type}`,
          summary: ins.summary,
          evidence: ins.evidence,
          confidence: ins.confidence,
          createdAt: now(),
        });
        // grafo: insight conecta-se aos alvos que ele relaciona
        for (const target of ins.targets || []) {
          s.graphEdges.push({ tenantId, source: `insight:${ins.key}`, target, type: 'INSIGHT_ON', evidence: ins.type });
        }
      }
      // registra o ciclo (histórico de evolução da inteligência)
      s.learningCycles.push({
        id: uuid(), tenantId, trigger,
        snapshot, insightCount: s.insights.filter((i) => i.tenantId === tenantId).length,
        createdAt: now(),
      });
      return s;
    });

    await this.bus.emit('evolution.learned', { tenantId, trigger, newInsights: derived.length });
    return { snapshot, insights: derived };
  }

  async getInsights(tenantId) {
    const state = await this.store.read();
    return state.insights.filter((i) => i.tenantId === tenantId)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async getEvolution(tenantId) {
    const state = await this.store.read();
    const cycles = state.learningCycles.filter((c) => c.tenantId === tenantId);
    return {
      cycles: cycles.length,
      latest: cycles[cycles.length - 1] || null,
      history: cycles.slice(-20),
    };
  }
}

function scopeOf(state, tenantId) {
  const f = (arr) => arr.filter((x) => x.tenantId === tenantId);
  return {
    repositories: f(state.repositories),
    snapshots: f(state.snapshots),
    capabilities: f(state.capabilities),
    projects: f(state.projects),
    deployments: f(state.deployments),
    memoryEvents: f(state.memoryEvents),
    graphEdges: f(state.graphEdges),
  };
}

// Deriva insights REAIS a partir do estado. Cada um tem key estável (idempotência).
function deriveInsights(s) {
  const insights = [];

  // 1. Reutilização entre repos: capability declarada por >1 repo => reutilizável no ecossistema.
  const capToRepos = new Map();
  for (const edge of s.graphEdges.filter((e) => e.type === 'DECLARES_CAPABILITY')) {
    const cap = edge.target.replace('capability:', '');
    const repo = edge.source.replace('repo:', '');
    if (!capToRepos.has(cap)) capToRepos.set(cap, new Set());
    capToRepos.get(cap).add(repo);
  }
  for (const [cap, repos] of capToRepos) {
    if (repos.size >= 2) {
      const list = [...repos].sort();
      insights.push({
        key: `reuse:${cap}`,
        type: 'capability-reuse',
        summary: `Capability "${cap}" aparece em ${repos.size} repos (${list.join(', ')}) — candidata a núcleo reutilizável`,
        detail: { capability: cap, repos: list },
        confidence: Math.min(1, 0.6 + repos.size * 0.1),
        evidence: list.map((r) => `repo:${r}`).concat(`capability:${cap}`),
        targets: [`capability:${cap}`, ...list.map((r) => `repo:${r}`)],
        scope: null,
      });
    }
  }

  // 2. Consolidação de família: repos na mesma família => consolidar em núcleo canônico.
  const families = new Map();
  for (const repo of s.repositories) {
    if (!repo.family) continue;
    if (!families.has(repo.family)) families.set(repo.family, []);
    families.get(repo.family).push(repo.id);
  }
  for (const [family, repos] of families) {
    if (repos.length >= 2) {
      insights.push({
        key: `family:${family}`,
        type: 'family-consolidation',
        summary: `Família "${family}" tem ${repos.length} repos (${repos.sort().join(', ')}) — consolidar diferenças em módulos + feature flags`,
        detail: { family, repos: repos.sort() },
        confidence: 0.8,
        evidence: repos.map((r) => `repo:${r}`),
        targets: repos.map((r) => `repo:${r}`),
        scope: null,
      });
    }
  }

  // 3. Crescimento do catálogo: mede cobertura da inteligência.
  if (s.capabilities.length > 0) {
    insights.push({
      key: 'coverage:catalog',
      type: 'catalog-coverage',
      summary: `Catálogo com ${s.capabilities.length} capabilities a partir de ${s.snapshots.length} análise(s) em ${s.repositories.length} repo(s)`,
      detail: {
        capabilities: s.capabilities.length,
        analyzedRepos: s.snapshots.length,
        connectedRepos: s.repositories.length,
      },
      confidence: 0.7,
      evidence: [`capabilities:${s.capabilities.length}`, `snapshots:${s.snapshots.length}`],
      targets: [],
      scope: null,
    });
  }

  // 4. Reutilização em projetos gerados: quanto do que geramos reusou vs criou do zero.
  const reusing = s.projects.filter((p) => (p.reusedModules || []).length > 0).length;
  if (s.projects.length > 0) {
    insights.push({
      key: 'coverage:reuse-rate',
      type: 'reuse-rate',
      summary: `${reusing}/${s.projects.length} projeto(s) gerado(s) reutilizaram capabilities existentes`,
      detail: { reusing, total: s.projects.length },
      confidence: 0.65,
      evidence: [`projects:${s.projects.length}`, `reusing:${reusing}`],
      targets: [],
      scope: null,
    });
  }

  return insights;
}

function intelligenceSnapshot(s) {
  return {
    connectedRepos: s.repositories.length,
    analyzedSnapshots: s.snapshots.length,
    capabilities: s.capabilities.length,
    projects: s.projects.length,
    deployments: s.deployments.length,
    memoryEvents: s.memoryEvents.length,
    graphEdges: s.graphEdges.length,
  };
}

function now() { return new Date().toISOString(); }

module.exports = { EvolutionEngine, deriveInsights, TRIGGERS };
