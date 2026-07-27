const { uuid } = require('../kernel/ids');
const { NotFoundError } = require('../kernel/errors');

// Digital Twin: o modelo vivo de um sistema conectado. Compõe (não duplica) o que os outros
// planos já produziram — snapshot de arquitetura, grafo, capabilities, memória, deploys, insights
// — num objeto único e consultável. A spec OMEGA exige que a IA consulte este modelo ANTES de
// sugerir qualquer mudança. É reconstruído a cada refresh e versionado (histórico append-only).

class DigitalTwinService {
  constructor({ store, bus, controlPlane }) {
    this.store = store; this.bus = bus; this.cp = controlPlane;
  }

  // Reconstrói o twin de um repositório a partir do estado atual do control plane.
  async refresh(tenantId, actorId, repoId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    const repo = state.repositories.find((r) => r.tenantId === tenantId && r.id === repoId);
    if (!repo) throw new NotFoundError(`Repository not found: ${repoId}`);

    const model = buildModel(state, tenantId, repoId, repo);
    const twin = {
      id: uuid(), tenantId, subjectType: 'repository', subjectId: repoId,
      revision: model.architecture.revision,
      model, builtAt: now(),
    };
    await this.store.update((s) => {
      // versiona: mantém histórico, marca o mais novo como current
      s.digitalTwins.forEach((t) => { if (t.tenantId === tenantId && t.subjectId === repoId) t.current = false; });
      twin.current = true;
      s.digitalTwins.push(twin);
      return s;
    });
    await this.bus.emit('twin.refreshed', { tenantId, repoId, revision: twin.revision });
    return twin;
  }

  async get(tenantId, actorId, repoId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    const current = state.digitalTwins
      .filter((t) => t.tenantId === tenantId && t.subjectId === repoId && t.current)
      .sort((a, b) => b.builtAt.localeCompare(a.builtAt))[0];
    if (!current) return this.refresh(tenantId, actorId, repoId); // lazy build
    return current;
  }

  async list(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    return state.digitalTwins.filter((t) => t.tenantId === tenantId && t.current)
      .map((t) => ({ subjectId: t.subjectId, revision: t.revision, builtAt: t.builtAt, health: t.model.health }));
  }

  // Consulta que a IA faz ANTES de sugerir mudança: onde vive X, quem depende, o que é seguro.
  async advise(tenantId, actorId, repoId) {
    const twin = await this.get(tenantId, actorId, repoId);
    const m = twin.model;
    const advice = [];
    if (m.health.score < 60) advice.push(`Saúde baixa (${m.health.score}): priorizar ${m.health.weakest}`);
    for (const ins of m.insights) {
      if (ins.type === 'family-consolidation') advice.push(`Consolidação sugerida: ${ins.summary}`);
      if (ins.type === 'capability-reuse') advice.push(`Reutilizar em vez de recriar: ${ins.detail.capability}`);
    }
    if (m.deployments.total === 0) advice.push('Sem deploy registrado — validar em preview antes de produção');
    if (m.risks.length) advice.push(...m.risks.map((r) => `Risco: ${r}`));
    return { subjectId: repoId, revision: twin.revision, health: m.health, advice };
  }

  async projectOperationalEvent(event) {
    let projected;
    await this.store.update((state) => {
      if (state.operationalTwins.some((item) => item.tenantId === event.tenantId && item.sourceEventId === event.id)) return state;
      const scoped = (items) => items.filter((item) => item.tenantId === event.tenantId);
      const resources = scoped(state.discoveredResources); const jobs = scoped(state.runtimeJobs); const deployments = scoped(state.deployments);
      const byKind = (pattern) => resources.filter((item) => pattern.test(String(item.kind || item.type || ''))).length;
      const model = {
        compute: { cpu: byKind(/cpu/i), ram: byKind(/memory|ram/i), gpu: byKind(/gpu/i), disks: byKind(/disk|volume/i), containers: byKind(/container|docker/i) },
        runtime: { workers: state.workerHeartbeats.length, queued: jobs.filter((item) => item.status === 'QUEUED').length, running: jobs.filter((item) => item.status === 'RUNNING').length, failed: jobs.filter((item) => ['FAILED', 'DEAD_LETTER'].includes(item.status)).length, schedules: scoped(state.runtimeSchedules).filter((item) => item.enabled).length },
        data: { databases: byKind(/postgres|database/i), queues: byKind(/queue|redis/i) },
        delivery: { deployments: deployments.length, production: deployments.filter((item) => item.environment === 'production').length },
        operations: { services: scoped(state.serviceRegistry).length, incidents: scoped(state.cognitiveObservations).filter((item) => item.kind === 'DEGRADATION').length, health: resources.some((item) => ['DEGRADED', 'MISSING'].includes(item.status)) ? 'DEGRADED' : 'ACTIVE', costs: null, latency: null, performance: null },
      };
      state.operationalTwins.forEach((item) => { if (item.tenantId === event.tenantId) item.current = false; });
      projected = { id: uuid(), tenantId: event.tenantId, subjectType: 'tenant-runtime', subjectId: event.tenantId, sourceEventId: event.id, current: true, model, builtAt: now() };
      state.operationalTwins.push(projected); return state;
    });
    return projected;
  }

  async operational(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read();
    return state.operationalTwins.filter((item) => item.tenantId === tenantId && item.current).sort((a, b) => b.builtAt.localeCompare(a.builtAt))[0] || null;
  }
}

// Compõe o modelo vivo a partir das projeções já existentes no estado.
function buildModel(state, tenantId, repoId, repo) {
  const snapshot = state.snapshots
    .filter((s) => s.tenantId === tenantId && s.repoId === repoId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;

  const edges = state.graphEdges.filter((e) => e.tenantId === tenantId &&
    (e.source === `repo:${repoId}` || e.target === `repo:${repoId}`));
  const deployments = state.deployments.filter((d) => d.tenantId === tenantId && d.projectId === repoId);
  const memory = state.memoryEvents.filter((mm) => mm.tenantId === tenantId && mm.projectId === repoId);
  const insights = state.insights.filter((i) => i.tenantId === tenantId &&
    (i.targets || []).includes(`repo:${repoId}`));

  const caps = snapshot ? snapshot.capabilities.map((c) => c.id) : [];
  const health = computeHealth(snapshot, deployments);
  const risks = detectRisks(snapshot, repo, deployments);

  return {
    subject: { id: repoId, name: repo.name, url: repo.url, family: repo.family, role: repo.role, visibility: repo.visibility },
    architecture: snapshot ? {
      revision: snapshot.revision,
      primaryLanguage: snapshot.primaryLanguage,
      languages: snapshot.languages,
      fileCount: snapshot.fileCount,
      dependencyCount: snapshot.dependencies.length,
    } : { revision: repo.lastRevision || 'unanalyzed' },
    apis: snapshot ? { count: snapshot.endpoints.length, sample: snapshot.endpoints.slice(0, 10) } : { count: 0, sample: [] },
    components: snapshot ? { count: snapshot.components.length, sample: snapshot.components.slice(0, 10).map((c) => c.name) } : { count: 0 },
    database: snapshot ? { tables: snapshot.tables } : { tables: [] },
    capabilities: caps,
    dependencies: { relations: edges.length },
    deployments: { total: deployments.length, environments: [...new Set(deployments.map((d) => d.environment))], latestUrl: deployments[deployments.length - 1]?.url || null },
    memory: { events: memory.length, recent: memory.slice(-5).map((mm) => mm.summary) },
    insights: insights.map((i) => ({ type: i.type, summary: i.summary, detail: i.detail })),
    health,
    risks,
    // campos previstos pela spec ainda não alimentados por adapters reais (honestidade explícita):
    pending: ['metrics', 'performance', 'seo', 'analytics', 'costs', 'incidents'],
  };
}

function computeHealth(snapshot, deployments) {
  if (!snapshot) return { score: 0, weakest: 'analysis', note: 'não analisado' };
  const s = snapshot.scores || {};
  const dims = { architecture: s.architecture || 0, security: s.security || 0, quality: s.quality || 0, ai: s.ai || 0 };
  const deployBonus = deployments.length ? 10 : 0;
  const base = (dims.architecture + dims.security + dims.quality + dims.ai) / 4;
  const score = Math.min(100, Math.round(base + deployBonus));
  const weakest = Object.entries(dims).sort((a, b) => a[1] - b[1])[0][0];
  return { score, weakest, dimensions: dims };
}

function detectRisks(snapshot, repo, deployments) {
  const risks = [];
  if (!snapshot) { risks.push('sem análise — twin incompleto'); return risks; }
  if ((snapshot.scores?.security || 0) < 50) risks.push('score de segurança baixo');
  if (repo.visibility === 'public' && snapshot.capabilities.some((c) => c.id === 'auth-rbac')) {
    risks.push('repo público com auth — verificar exposição de segredos');
  }
  if (snapshot.dependencies.length > 100) risks.push('muitas dependências — superfície de ataque/manutenção');
  if (deployments.some((d) => d.environment === 'production' && !d.approvedBy)) risks.push('deploy em produção sem aprovação registrada');
  return risks;
}

function now() { return new Date().toISOString(); }

module.exports = { DigitalTwinService, buildModel };
