const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Core contracts and engines
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { AgentRuntime } = require('../src/runtime/agent-runtime');
const { AgentRegistry } = require('../src/agents/agent-registry');
const { FENIX_AGENTS } = require('../src/agents/agent-definitions');
const { TaskEngine } = require('../src/execution/task-engine');
const { DevelopmentObserver } = require('../src/observer/development-observer');
const { VisualTimeline } = require('../src/observer/visual-timeline');
const { MultiProjectWorkspaceManager } = require('../src/workspace/multi-project-workspace-manager');
const { ReverseEngineeringEngine } = require('../src/repo-intel/reverse-engineering-engine');
const { ArtifactGraph } = require('../src/repo-intel/artifact-graph');
const { VisualCodeBidirectionalMapper } = require('../src/visual-ide/visual-code-mapper');
const { GitHubEngine } = require('../src/connectors/github-engine');
const { SoftwareFactoryEngine } = require('../src/factory/software-factory-engine');

test('M15: THE GOLDEN E2E TEST — Import -> Understand -> Rebuild -> Visual Edit -> Test -> Commit -> Genome Validation', async () => {
  // 1. BOOT UNIFIED SYSTEM
  const bus = new UnifiedEventBus();
  await bus.start();

  const registry = new AgentRegistry();
  const runtime = new AgentRuntime({ eventBus: bus, registry });
  await runtime.start();

  const observer = new DevelopmentObserver({ eventBus: bus });
  await observer.start();

  const taskEngine = new TaskEngine({ eventBus: bus, agentRuntime: runtime });
  await taskEngine.start();

  const workspaceManager = new MultiProjectWorkspaceManager({ eventBus: bus });
  await workspaceManager.start();

  const reverseEngine = new ReverseEngineeringEngine({ eventBus: bus });
  const mapper = new VisualCodeBidirectionalMapper();
  const github = new GitHubEngine({ eventBus: bus });
  const factory = new SoftwareFactoryEngine({ eventBus: bus, taskEngine, observer });
  await factory.start();
  await github.start();

  // 2. STEP 1: IMPORT & SCAN PROJECT
  const targetDir = path.join(__dirname, '..');
  const understandingReport = await reverseEngine.ingestAndAnalyze(targetDir, {
    projectName: 'Lovable CRM E2E Target',
    projectId: 'prj_lovable_e2e'
  });

  assert.strictEqual(understandingReport.readyForEdit, true);
  assert.strictEqual(understandingReport.metrics.totalFiles > 0, true);

  // 3. STEP 2: REGISTER IN WORKSPACE & BUILD ARTIFACT GRAPH
  const workspace = workspaceManager.registerProject({
    projectId: 'prj_lovable_e2e',
    name: 'Lovable CRM E2E Target',
    rootPath: targetDir,
    initialDna: understandingReport.initialDna
  });

  const artifactGraph = ArtifactGraph.fromProjectReport(understandingReport);
  assert.strictEqual(artifactGraph.nodes.size > 0, true);

  // Register features into Function Inventory
  workspace.functionInventory.registerFeature({
    id: 'feat_leads_management',
    name: 'Gestão de Leads & Oportunidades',
    page: 'src/pages/Leads.tsx',
    components: ['LeadsTable.tsx', 'LeadCard.tsx'],
    apiRoutes: ['GET /api/leads', 'POST /api/leads'],
    databaseTables: ['leads', 'pipelines']
  });

  workspace.functionInventory.registerFeature({
    id: 'feat_dashboard_kpis',
    name: 'Dashboard de Métricas e KPIs',
    page: 'src/pages/Dashboard.tsx',
    components: ['KpiCard.tsx', 'RevenueChart.tsx'],
    apiRoutes: ['GET /api/kpis'],
    databaseTables: ['metrics']
  });

  // 4. STEP 3: REBUILD FRONTEND AUTONOMOUSLY
  const rebuildReport = await factory.rebuildFrontend({
    projectId: 'prj_lovable_e2e',
    artifactGraph,
    functionInventory: workspace.functionInventory,
    targetStyle: 'React 19 + Tailwind 4 Tokens'
  });

  assert.strictEqual(rebuildReport.status, 'REBUILD_SUCCESS');
  assert.strictEqual(rebuildReport.reconstructionScore.passed, true);
  assert.strictEqual(rebuildReport.reconstructionScore.overallScore >= 90.0, true);
  assert.strictEqual(rebuildReport.functionCoverage.passed, true);
  assert.strictEqual(rebuildReport.functionCoverage.coveragePct >= 95.0, true);

  // 5. STEP 4: VISUAL EDIT & BIDIRECTIONAL CODE MUTATION
  mapper.registerComponent('KpiCard', {
    file: 'src/components/KpiCard.tsx',
    elementSelectors: ['card#kpi-revenue']
  });

  const sourceBefore = `<div className="card" style={{ width: '300px', marginLeft: '10px' }}>KPI</div>`;
  const visualMutation = mapper.applyVisualMutation({
    sourceCode: sourceBefore,
    componentName: 'KpiCard',
    targetProperty: 'marginLeft',
    newValue: "'25px'"
  });

  assert.strictEqual(visualMutation.success, true);
  assert.strictEqual(visualMutation.updatedCode.includes("marginLeft: '25px'"), true);

  // Calculate Visual Match Score
  const visualScore = mapper.calculateVisualMatchScore({
    layoutSimilarity: 95,
    colorMatch: 98,
    typographyMatch: 93,
    spacingMatch: 96
  });
  assert.strictEqual(visualScore.visualMatchScore >= 90.0, true);

  // 6. STEP 5: RECORD OBSERVATION EVENT & BUILD DNA V2
  await observer.recordObservation({
    sessionId: 'ses_golden_e2e',
    projectId: 'prj_lovable_e2e',
    actor: 'agent:Frontend',
    action: 'VISUAL_EDIT_APPLIED',
    target: { component: 'KpiCard', file: 'src/components/KpiCard.tsx' },
    result: { visualMatchDelta: '+4.0%', buildStatus: 'PASSED', score: visualScore.visualMatchScore },
    causality: {
      reason: 'Ajuste visual do card de KPI no grid',
      solutionValidation: 'Passou em 100% dos testes de regressão'
    }
  });

  const finalDna = workspace.genomeBuilder.compile({
    projectDna: {
      stack: understandingReport.detectedStack.map(s => s.name),
      modules: ['Leads', 'Dashboard', 'Analytics'],
      features: ['Gestão de Leads & Oportunidades', 'Dashboard de Métricas e KPIs']
    },
    operationalDna: {
      workflows: ['Rebuild_Frontend', 'Visual_Edit_Mutation'],
      learnedRules: ['Manter espaçamento de 25px em KpiCard']
    },
    visualDna: {
      componentTree: ['LeadsTable', 'LeadCard', 'KpiCard', 'RevenueChart'],
      designTokens: { primaryColor: '#6366f1', gap: '25px' }
    },
    agentDna: {
      activeAgents: [FENIX_AGENTS.ORCHESTRATOR, FENIX_AGENTS.FRONTEND, FENIX_AGENTS.TESTING],
      taskSuccessRate: 100.0
    }
  });

  assert.strictEqual(finalDna.version, 'v2.0.0');

  // 7. STEP 6: GITHUB COMMIT & PULL REQUEST
  const commitMsg = github.generateSemanticCommit({
    type: 'feat',
    scope: 'rebuild',
    description: 'autonomous frontend reconstruction with 4-DNA verification',
    details: [
      `System Reconstruction Score: ${rebuildReport.reconstructionScore.overallScore}%`,
      `Function Coverage: ${rebuildReport.functionCoverage.coveragePct}%`,
      `Visual Match Score: ${visualScore.visualMatchScore}%`
    ]
  });

  const pr = await github.createPullRequest({
    projectId: 'prj_lovable_e2e',
    title: 'Feat: Autonomous Frontend Reconstruction (4-DNA Validated)',
    headBranch: 'fenix/autonomous-rebuild-e2e',
    summary: commitMsg,
    changedFiles: ['src/components/KpiCard.tsx', 'src/components/LeadsTable.tsx'],
    reconstructionScore: rebuildReport.reconstructionScore.overallScore
  });

  assert.strictEqual(pr.status, 'OPEN');

  // 8. FINAL VALIDATION CHECKS
  const timeline = new VisualTimeline({ observer });
  const track = timeline.getTimelineTrack('ses_golden_e2e');
  assert.strictEqual(track.length, 1);

  // CLEANUP
  await factory.stop();
  await github.stop();
  await workspaceManager.stop();
  await taskEngine.stop();
  await observer.stop();
  await runtime.stop();
  await bus.stop();
});
