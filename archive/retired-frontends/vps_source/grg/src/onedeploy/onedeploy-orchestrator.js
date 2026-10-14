const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');
const { measured, unknown } = require('../kernel/measurement');

// OneDeploy HONESTO.
//
// MEDIDO EM PRODUCAO (2026-07-29): runOneDeployPipeline declarava 12 estagios TODOS 'COMPLETED'
// e status 'ONEDEPLOY_SUCCESSFUL' SEM EXECUTAR NADA. scanProject devolvia sempre
// "React 18 + Vite / Express Hexagonal / PostgreSQL" ignorando o projectPath e sem ler um unico
// arquivo. Um pipeline de deploy que se declara sucesso total sem rodar e a simulacao mais
// perigosa do sistema: aprova release fantasma.
//
// O deploy real acontece por `docker compose` + scripts em `ops/` + o `deployCenter`. Este
// orquestrador NAO os substitui. Agora:
//   - scanProject LE o filesystem real do projectPath (package.json, Dockerfile, etc.) e reporta
//     o que encontrou; o que nao da para inferir fica ausente, nao inventado.
//   - runOneDeployPipeline NAO finge estagios completos. Sem um executor de deploy real injetado,
//     cada estagio nasce PENDING e o pipeline fica NOT_EXECUTED com o motivo.
class OneDeployOrchestrator {
  constructor({ store, bus, controlPlane, masterNode, deployCenter, deployExecutor = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.masterNode = masterNode;
    this.deployCenter = deployCenter;
    this.deployExecutor = deployExecutor;
  }

  static STAGES = ['SCAN', 'UNDERSTAND', 'PLAN', 'IMPLEMENT', 'TEST', 'REVIEW', 'COMMIT', 'PUSH', 'DEPLOY', 'VERIFY', 'OBSERVE', 'LEARN'];

  async runOneDeployPipeline(tenantId, actorId, project = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    if (!project.name) throw new ValidationError('Project name is required for OneDeploy pipeline');

    // Sem executor real de deploy, o pipeline NAO finge sucesso. Estagios ficam PENDING.
    if (!this.deployExecutor || typeof this.deployExecutor.runStage !== 'function') {
      const stages = OneDeployOrchestrator.STAGES.map((name, i) => ({ step: i + 1, name, status: 'PENDING' }));
      const run = {
        id: uuid(), tenantId, projectName: String(project.name), environment: project.environment || 'DEV',
        stagesCount: stages.length, stages, status: 'NOT_EXECUTED',
        reason: 'no real deploy executor is wired; deployment runs via docker compose + ops/ scripts, not this module',
        recordedAt: new Date().toISOString(),
      };
      if (this.bus?.emit) await this.bus.emit('onedeploy.pipeline.recorded', { tenantId, runId: run.id, projectName: run.projectName, status: run.status });
      return run;
    }

    // Caminho real: cada estagio e executado de verdade; o status decorre do resultado, e um
    // estagio que falha interrompe o pipeline (nao continua declarando sucesso).
    const stages = [];
    let failed = false;
    for (let i = 0; i < OneDeployOrchestrator.STAGES.length; i += 1) {
      const name = OneDeployOrchestrator.STAGES[i];
      if (failed) { stages.push({ step: i + 1, name, status: 'SKIPPED' }); continue; }
      const outcome = await this.deployExecutor.runStage({ tenantId, actorId, project, stage: name });
      const status = outcome.ok ? 'COMPLETED' : 'FAILED';
      if (!outcome.ok) failed = true;
      stages.push({ step: i + 1, name, status, detail: outcome.detail ?? null });
    }
    const run = {
      id: uuid(), tenantId, projectName: String(project.name), environment: project.environment || 'DEV',
      stagesCount: stages.length, stages, status: failed ? 'FAILED' : 'COMPLETED', completedAt: new Date().toISOString(),
    };
    await this.store.update((state) => { state.oneDeployRuns = state.oneDeployRuns || []; state.oneDeployRuns.push(run); return state; });
    if (this.bus?.emit) await this.bus.emit('onedeploy.pipeline.completed', { tenantId, runId: run.id, projectName: run.projectName, status: run.status });
    return run;
  }

  // Le o filesystem REAL do projectPath. O que existe e reportado como medido; o que nao da para
  // inferir fica ausente. Nunca "React 18 + Vite" fixo para todo projeto.
  async scanProject(tenantId, actorId, projectPath = './') {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const root = path.resolve(projectPath);
    const discovery = {};
    const projectName = path.basename(root) || 'workspace';

    // package.json real: deps revelam frontend/backend de verdade.
    const pkgPath = path.join(root, 'package.json');
    if (safeExists(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        const has = (name) => Object.keys(deps).some((d) => d === name || d.startsWith(`${name}/`) || d.startsWith(`@${name}`));
        const fw = [];
        if (has('react')) fw.push('React');
        if (has('vue')) fw.push('Vue');
        if (has('vite')) fw.push('Vite');
        if (has('next')) fw.push('Next.js');
        discovery.frontendFramework = fw.length ? measured(fw.join(' + '), `fs:${pkgPath}`) : unknown('no known frontend framework in package.json dependencies');
        const be = [];
        if (has('express')) be.push('Express');
        if (has('fastify')) be.push('Fastify');
        if (has('koa')) be.push('Koa');
        discovery.backendFramework = be.length ? measured(be.join(' + '), `fs:${pkgPath}`) : unknown('no known backend framework in package.json dependencies');
        discovery.dependencyCount = measured(Object.keys(deps).length, `fs:${pkgPath}`);
      } catch (error) {
        discovery.packageJson = unknown(`package.json present but unreadable: ${error.message}`);
      }
    } else {
      discovery.frontendFramework = unknown('no package.json found at project path');
      discovery.backendFramework = unknown('no package.json found at project path');
    }

    discovery.containers = safeExists(path.join(root, 'Dockerfile')) || safeExists(path.join(root, 'docker-compose.yml')) || safeExists(path.join(root, 'docker-compose.enterprise.yml'))
      ? measured('Docker present', `fs:${root}`)
      : unknown('no Dockerfile or docker-compose found');
    discovery.ciCd = safeExists(path.join(root, '.github', 'workflows'))
      ? measured('GitHub Actions present', `fs:${root}/.github/workflows`)
      : unknown('no .github/workflows found');

    const scan = { tenantId, projectPath: root, exists: safeExists(root), discovery, discoveredAt: new Date().toISOString() };
    if (scan.exists && this.store) {
      scan.coupling = await this.#coupleProjectScan(tenantId, actorId, projectName, root, discovery, scan.discoveredAt);
    }
    return scan;
  }

  async #coupleProjectScan(tenantId, actorId, projectName, root, discovery, discoveredAt) {
    const projectId = `local:${stableId(root)}`;
    const repoId = `repo:${stableId(root)}`;
    const capabilityId = `capability:${stableId(`${root}:runtime`)}`;
    const source = `onedeploy.scanProject:${root}`;
    const frameworks = [
      valueOf(discovery.frontendFramework),
      valueOf(discovery.backendFramework),
      valueOf(discovery.containers),
      valueOf(discovery.ciCd),
    ].filter(Boolean);
    const tags = frameworks.map((item) => item.toLowerCase().replace(/[^a-z0-9.+-]+/g, '-')).slice(0, 8);
    const now = discoveredAt || new Date().toISOString();
    await this.store.update((state) => {
      state.repositories = state.repositories || [];
      let repo = state.repositories.find((item) => item.tenantId === tenantId && item.id === repoId);
      if (!repo) {
        repo = {
          id: repoId,
          tenantId,
          provider: 'local-filesystem',
          owner: 'FENIX IDE',
          name: projectName,
          url: root,
          visibility: 'private',
          createdAt: now,
          createdBy: actorId,
        };
        state.repositories.push(repo);
      }
      Object.assign(repo, {
        name: projectName,
        url: root,
        revision: readGitRevision(root),
        lastScannedAt: now,
        analysisStatus: 'SCANNED',
        discovery,
      });

      state.projects = state.projects || [];
      let project = state.projects.find((item) => item.tenantId === tenantId && item.id === projectId);
      if (!project) {
        project = {
          id: projectId,
          tenantId,
          repositoryId: repoId,
          name: projectName,
          status: 'ACTIVE',
          createdAt: now,
          createdBy: actorId,
        };
        state.projects.push(project);
      }
      Object.assign(project, {
        repositoryId: repoId,
        name: projectName,
        projectPath: root,
        analysisStatus: 'SCANNED',
        tags,
        discovery,
        lastScannedAt: now,
      });

      state.capabilities = state.capabilities || [];
      let capability = state.capabilities.find((item) => item.tenantId === tenantId && item.id === capabilityId);
      if (!capability) {
        capability = {
          id: capabilityId,
          tenantId,
          projectId,
          name: `${projectName} runtime`,
          kind: 'project-runtime',
          status: 'DISCOVERED',
          createdAt: now,
          createdBy: actorId,
        };
        state.capabilities.push(capability);
      }
      Object.assign(capability, {
        projectId,
        repositoryId: repoId,
        status: 'DISCOVERED',
        evidence: discovery,
        updatedAt: now,
      });

      state.capabilityDefinitions = state.capabilityDefinitions || [];
      if (!state.capabilityDefinitions.some((item) => item.tenantId === tenantId && item.capabilityId === capabilityId)) {
        state.capabilityDefinitions.push({
          id: uuid(),
          tenantId,
          capabilityId,
          name: capability.name,
          version: '1.0.0',
          owner: 'FENIX IDE',
          state: 'DISCOVERED',
          permissions: ['project:read'],
          resources: [root],
          documentation: [],
          tests: [],
          dependencies: [],
          createdAt: now,
          createdBy: actorId,
        });
      }

      state.graphEdges = state.graphEdges || [];
      upsertEdge(state.graphEdges, tenantId, projectId, repoId, 'USES_REPOSITORY', source, now);
      upsertEdge(state.graphEdges, tenantId, projectId, capabilityId, 'EXPOSES_CAPABILITY', source, now);
      for (const tag of tags) upsertEdge(state.graphEdges, tenantId, capabilityId, `tech:${tag}`, 'USES_TECH', source, now);

      state.knowledgeEntities = state.knowledgeEntities || [];
      const projectEntity = upsertEntity(state.knowledgeEntities, tenantId, 'project', projectId, projectName, { projectPath: root, discovery }, source, now, actorId);
      const repoEntity = upsertEntity(state.knowledgeEntities, tenantId, 'repository', repoId, projectName, { url: root, revision: repo.revision }, source, now, actorId);
      const capEntity = upsertEntity(state.knowledgeEntities, tenantId, 'capability', capabilityId, capability.name, { tags, evidence: discovery }, source, now, actorId);

      state.knowledgeRelationships = state.knowledgeRelationships || [];
      upsertRelationship(state.knowledgeRelationships, tenantId, projectEntity.id, repoEntity.id, 'USES_REPOSITORY', source, now, actorId);
      upsertRelationship(state.knowledgeRelationships, tenantId, projectEntity.id, capEntity.id, 'EXPOSES_CAPABILITY', source, now, actorId);
      return state;
    });
    if (this.bus?.emit) await this.bus.emit('onedeploy.project.coupled', { tenantId, actorId, projectId, repoId, capabilityId, projectPath: root });
    return { projectId, repoId, capabilityId, status: 'COUPLED' };
  }
}

function safeExists(p) { try { return fs.existsSync(p); } catch { return false; } }
function valueOf(envelope) { return envelope && envelope.state === 'measured' ? String(envelope.value || '') : ''; }
function stableId(value) { return cryptoHash(value).slice(0, 16); }
function cryptoHash(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function readGitRevision(root) {
  try {
    const head = path.join(root, '.git', 'HEAD');
    if (!safeExists(head)) return null;
    const value = fs.readFileSync(head, 'utf8').trim();
    if (!value.startsWith('ref: ')) return value;
    const ref = value.slice(5);
    const refPath = path.join(root, '.git', ref);
    return safeExists(refPath) ? fs.readFileSync(refPath, 'utf8').trim() : null;
  } catch { return null; }
}
function upsertEdge(edges, tenantId, from, to, type, evidence, at) {
  const current = edges.find((edge) => edge.tenantId === tenantId && edge.from === from && edge.to === to && edge.type === type);
  if (current) {
    Object.assign(current, { source: from, target: to, sourceId: from, targetId: to, evidence, updatedAt: at });
    return current;
  }
  const edge = { id: uuid(), tenantId, from, to, source: from, target: to, sourceId: from, targetId: to, type, evidence, createdAt: at, updatedAt: at };
  edges.push(edge);
  return edge;
}
function upsertEntity(entities, tenantId, type, key, label, attributes, source, at, actorId) {
  let entity = entities.find((item) => item.tenantId === tenantId && item.type === type && item.key === key && item.status === 'ACTIVE');
  if (!entity) {
    entity = { id: uuid(), tenantId, type, key, label, attributes: {}, confidence: 0.8, provenance: { reference: source }, version: 0, status: 'ACTIVE', createdAt: at, createdBy: actorId };
    entities.push(entity);
  }
  Object.assign(entity, { label, attributes, provenance: { reference: source }, version: Number(entity.version || 0) + 1, updatedAt: at, updatedBy: actorId });
  return entity;
}
function upsertRelationship(relationships, tenantId, fromId, toId, type, source, at, actorId) {
  const stableKey = `${fromId}|${type}|${toId}`;
  let rel = relationships.find((item) => item.tenantId === tenantId && item.stableKey === stableKey && !item.validTo);
  if (!rel) {
    rel = { id: uuid(), tenantId, fromId, toId, type, stableKey, attributes: {}, confidence: 0.8, provenance: { reference: source }, validFrom: at, validTo: null, createdBy: actorId };
    relationships.push(rel);
  }
  rel.provenance = { reference: source };
  rel.updatedAt = at;
  return rel;
}

module.exports = { OneDeployOrchestrator };
