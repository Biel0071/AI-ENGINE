const { uuid, slugify } = require('../kernel/ids');
const { NotFoundError, ConflictError, ValidationError } = require('../kernel/errors');
const { scan } = require('./scanner');

const GITHUB_RE = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i;

// Repository Intelligence: conecta, espelha (metadados, não árvore), analisa por commit,
// extrai capabilities, atualiza knowledge graph e memória evolutiva.
class RepositoryIntelligence {
  constructor({ store, bus, controlPlane, gitHost }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.gitHost = gitHost;
  }

  async connect(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'repo:connect');
    const url = String(input && input.url || '').trim();
    const match = url.match(GITHUB_RE);
    if (!match) throw new ValidationError('repository.url must be a canonical GitHub URL');
    const owner = match[1];
    const name = match[2];
    const id = slugify(input.id || name);
    const repo = {
      id, tenantId, owner, name,
      url: `https://github.com/${owner}/${name}`,
      provider: 'github',
      visibility: input.visibility === 'private' ? 'private' : 'public',
      role: input.role || 'connected',
      family: input.family || null,
      analysisStatus: 'pending',
      lastRevision: null,
      createdAt: now(),
    };
    await this.store.update((state) => {
      if (state.repositories.some((r) => r.tenantId === tenantId && (r.id === id || r.url.toLowerCase() === repo.url.toLowerCase()))) {
        throw new ConflictError(`Repository already connected: ${id}`);
      }
      state.repositories.push(repo);
      // grafo: tenant OWNS repo ; repo HOSTED_ON provider
      state.graphEdges.push(
        edge(tenantId, `tenant:${tenantId}`, `repo:${id}`, 'OWNS', 'catalog'),
        edge(tenantId, `repo:${id}`, `provider:github`, 'HOSTED_ON', 'catalog'),
      );
      return state;
    });
    await this.bus.emit('repo.connected', { tenantId, repoId: id, url: repo.url, actorId });
    return repo;
  }

  async getRepository(tenantId, repoId) {
    const state = await this.store.read();
    const repo = state.repositories.find((r) => r.tenantId === tenantId && r.id === repoId);
    if (!repo) throw new NotFoundError(`Repository not found: ${repoId}`);
    return repo;
  }

  async listRepositories(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    return state.repositories.filter((r) => r.tenantId === tenantId);
  }

  // Analisa o HEAD do repo. Idempotente por commit: se já existe snapshot do revision, reusa (delta-aware).
  async analyze(tenantId, actorId, repoId) {
    await this.cp.authorize(tenantId, actorId, 'project:analyze');
    const repo = await this.getRepository(tenantId, repoId);
    const tree = await this.gitHost.fetchTree(repo.url);

    const existing = (await this.store.read()).snapshots.find(
      (s) => s.tenantId === tenantId && s.repoId === repoId && s.revision === tree.revision,
    );
    if (existing) {
      await this.bus.emit('scan.reused', { tenantId, repoId, revision: tree.revision });
      return { snapshot: existing, reused: true };
    }

    const analysis = scan(tree);
    const snapshot = {
      id: uuid(), tenantId, repoId,
      revision: analysis.revision,
      fileCount: analysis.fileCount,
      primaryLanguage: analysis.primaryLanguage,
      languages: analysis.languages,
      dependencies: analysis.dependencies,
      endpoints: analysis.endpoints,
      components: analysis.components,
      tables: analysis.tables,
      capabilities: analysis.capabilities,
      scores: computeScores(analysis),
      createdAt: now(),
    };

    await this.store.update((state) => {
      state.snapshots.push(snapshot);
      const target = state.repositories.find((r) => r.tenantId === tenantId && r.id === repoId);
      target.analysisStatus = 'analyzed';
      target.lastRevision = snapshot.revision;
      target.primaryLanguage = snapshot.primaryLanguage;

      // grafo: repo HAS_SNAPSHOT snapshot ; repo DECLARES_CAPABILITY cap
      state.graphEdges.push(edge(tenantId, `repo:${repoId}`, `snapshot:${snapshot.revision}`, 'HAS_SNAPSHOT', 'scan'));
      for (const cap of snapshot.capabilities) {
        state.graphEdges.push(edge(tenantId, `repo:${repoId}`, `capability:${cap.id}`, 'DECLARES_CAPABILITY', `scan:${snapshot.revision}`));
      }
      // catálogo global: registra/atualiza capability detectada com evidência
      for (const cap of snapshot.capabilities) {
        let entry = state.capabilities.find((c) => c.tenantId === tenantId && c.id === cap.id);
        if (!entry) {
          entry = { id: cap.id, tenantId, category: cap.category, version: '0.1.0', status: 'detected', sources: [], createdAt: now() };
          state.capabilities.push(entry);
        }
        if (!entry.sources.some((s) => s.repoId === repoId && s.revision === snapshot.revision)) {
          entry.sources.push({ repoId, revision: snapshot.revision });
        }
      }
      // memória evolutiva com evidência
      state.memoryEvents.push({
        id: uuid(), tenantId, projectId: repoId, actorId,
        kind: 'repo-analyzed',
        summary: `Analyzed ${repo.name}@${snapshot.revision.slice(0, 8)}: ${snapshot.capabilities.length} capabilities, ${snapshot.fileCount} files`,
        evidence: [`repo:${repoId}`, `revision:${snapshot.revision}`],
        confidence: 0.9,
        createdAt: now(),
      });
      state.graphEdges.push(edge(tenantId, `repo:${repoId}`, `memory:${snapshot.revision}`, 'LEARNED', snapshot.revision));
      return state;
    });

    await this.bus.emit('scan.completed', { tenantId, repoId, revision: snapshot.revision, capabilities: snapshot.capabilities.map((c) => c.id) });
    return { snapshot, reused: false };
  }

  async getGraph(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    const edges = state.graphEdges.filter((e) => e.tenantId === tenantId);
    const nodeIds = new Set();
    edges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });
    return {
      nodes: [...nodeIds].map((id) => ({ id, type: id.split(':')[0] })),
      edges: edges.map(({ source, target, type, evidence }) => ({ source, target, type, evidence })),
    };
  }
}

function computeScores(a) {
  const hasTests = a.dependencies.some((d) => /jest|vitest|mocha|node:test/.test(d)) || a.fileCount > 0;
  return {
    architecture: Math.min(100, 40 + Object.keys(a.languages).length * 10),
    ai: a.capabilities.some((c) => c.category === 'ai') ? 80 : 20,
    security: a.capabilities.some((c) => c.id === 'auth-rbac') ? 70 : 40,
    quality: hasTests ? 60 : 40,
    risk: a.dependencies.length > 40 ? 60 : 30,
  };
}

function edge(tenantId, source, target, type, evidence) {
  return { tenantId, source, target, type, evidence };
}
function now() { return new Date().toISOString(); }

module.exports = { RepositoryIntelligence };
