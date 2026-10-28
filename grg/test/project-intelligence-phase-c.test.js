'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ProjectIntelligenceEngine } = require('../src/services/project-intelligence-engine');
const { ContextualInvestigationEngine } = require('../src/services/contextual-investigation-engine');
const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');

test('Phase C: ProjectIntelligenceEngine analyzes real project and identifies architectural gaps', async () => {
  const engine = new ProjectIntelligenceEngine();
  
  // Analyze ai-engine/grg workspace
  const report = await engine.analyzeProject('fenix-os', path.resolve(__dirname, '..'));

  assert.equal(report.projectId, 'fenix-os');
  assert.equal(report.workspaceAvailable, true);
  assert(report.totalFiles > 10, 'Must have mapped real files from disk');
  assert(report.routes.length > 0, 'Must have detected real API routes');
  assert(report.detectedStack.some(s => s.name.includes('Node.js') || s.name.includes('Fastify') || s.name.includes('Express')), 'Must detect Node/Express stack');
  assert(Number.isFinite(report.healthScore) && report.healthScore > 0, 'Health score must be numeric');
  assert(Array.isArray(report.architecturalGaps), 'Must list architectural gaps');
  assert(report.evolutionPlan && report.evolutionPlan.phases.length === 4, 'Must generate a 4-phase evolution plan');
});

test('Phase C: Project Workspace Routes expose analysis and evolution-plan with Job Lane integration', async () => {
  let storedState = {
    projects: [
      { id: 'proj-sample', name: 'Sample Enterprise API', workspace: path.resolve(__dirname, '..'), workspaceAvailable: true }
    ],
    projectAnalyses: {},
    jobs: []
  };

  const app = {
    store: {
      read: async () => storedState,
      write: async (next) => { storedState = next; }
    },
    controlPlane: {
      authorize: async () => true
    }
  };

  let lastStatus = 0;
  let lastPayload = null;
  const reply = (res, status, payload) => {
    lastStatus = status;
    lastPayload = payload;
    return true;
  };

  // 1. GET /api/fenix/projects/proj-sample/analysis
  const getUrl = new URL('http://127.0.0.1:4400/api/fenix/projects/proj-sample/analysis');
  const handledGet = await handleProjectWorkspaceRoutes({ method: 'GET' }, {}, getUrl, app, reply, async () => ({}), { tenantId: 'tenant-1', actorId: 'admin' });
  assert.equal(handledGet, true);
  assert.equal(lastStatus, 200);
  assert.equal(lastPayload.ok, true);
  assert(lastPayload.report && lastPayload.report.totalFiles > 0);

  // 2. POST /api/fenix/projects/proj-sample/evolution-plan with dispatchJob: true
  const planUrl = new URL('http://127.0.0.1:4400/api/fenix/projects/proj-sample/evolution-plan');
  const handledPlan = await handleProjectWorkspaceRoutes(
    { method: 'POST' },
    {},
    planUrl,
    app,
    reply,
    async () => ({ dispatchJob: true, priority: 'HIGH' }),
    { tenantId: 'tenant-1', actorId: 'admin' }
  );

  assert.equal(handledPlan, true);
  assert.equal(lastStatus, 200);
  assert.equal(lastPayload.ok, true);
  assert(lastPayload.plan && lastPayload.plan.phases.length === 4);
  assert(lastPayload.job && lastPayload.job.id.startsWith('job-evo-'));
  assert.equal(storedState.jobs.length, 1, 'Job must be enqueued in state.jobs');
});

test('Phase C: Master Agent ContextualInvestigationEngine answers evolution plan queries with grounded diagnostics', async () => {
  const agent = new ContextualInvestigationEngine();

  // Test intent classification
  const intent = agent.classifyIntent('Crie um plano de evolução para o projeto TBOT e mostre os gaps arquiteturais');
  assert.equal(intent.type, 'PROJECT_EVOLUTION_PLAN');
  assert.equal(intent.targetProject.id, 'tbot');

  // Test full investigation response
  const result = await agent.investigate('Crie um plano de evolução para o projeto TBOT e mostre os gaps arquiteturais');
  assert.equal(result.intent, 'PROJECT_EVOLUTION_PLAN');
  assert(result.response.includes('Plano de Evolução Arquitetural'));
  assert(result.response.includes('Diagnóstico do Sistema'));
  assert(result.response.includes('Gaps Arquiteturais Identificados'));
  assert(result.response.includes('Roteiro de Execução em 4 Fases'));
  assert(result.response.includes('Job Lane'));
  assert(!result.response.includes('100% ATIVO'), 'Must not dump fake metrics');
});
