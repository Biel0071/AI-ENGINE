const fs = require('node:fs');
const path = require('node:path');
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
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const root = path.resolve(projectPath);
    const discovery = {};

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

    return { tenantId, projectPath: root, exists: safeExists(root), discovery, discoveredAt: new Date().toISOString() };
  }
}

function safeExists(p) { try { return fs.existsSync(p); } catch { return false; } }

module.exports = { OneDeployOrchestrator };
