'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { ProjectIntelligenceEngine } = require('../src/services/project-intelligence-engine');
const { ContextualInvestigationEngine } = require('../src/services/contextual-investigation-engine');
const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');
const { FenixAutonomousLoop } = require('../src/evolution/fenix-autonomous-loop');

test('E2E Autonomous Intelligence: analyzeProject computes all 10 diagnostic facets factually', async () => {
  const engine = new ProjectIntelligenceEngine();
  const workspacePath = path.resolve(__dirname, '..');
  const report = await engine.analyzeProject('fenix-os', workspacePath);

  // Core identification and workspace validation
  assert.equal(report.projectId, 'fenix-os');
  assert.equal(report.workspaceAvailable, true);
  assert(report.totalFiles > 10, 'Must map real files from disk');
  assert(report.routes.length > 0, 'Must map API routes from disk');

  // Verify Tool Fabric (6 canonical tools with complete Phase 5 schema & policies)
  assert.equal(report.toolFabric.length, 6, 'Must expose all 6 canonical tools');
  const toolIds = report.toolFabric.map(t => t.id);
  assert(toolIds.includes('git-workspace'));
  assert(toolIds.includes('code-editor'));
  assert(toolIds.includes('test-runner'));
  assert(toolIds.includes('rea-browser'));
  assert(toolIds.includes('service-probe'));
  assert(toolIds.includes('model-router'));

  for (const tool of report.toolFabric) {
    assert(tool.id, 'Tool must have id');
    assert(tool.name, 'Tool must have name');
    assert(tool.function, 'Tool must declare function');
    assert(tool.schema?.input && tool.schema?.output, `Tool ${tool.id} must declare I/O schema`);
    assert(Array.isArray(tool.permissions), `Tool ${tool.id} must declare permissions`);
    assert(tool.limits?.maxCallsPerMinute, `Tool ${tool.id} must declare limits`);
    assert(typeof tool.timeout === 'number', `Tool ${tool.id} must declare timeout`);
    assert(tool.validation, `Tool ${tool.id} must declare validation strategy`);
    assert(tool.failureRecovery?.fallbackStrategy, `Tool ${tool.id} must declare failure recovery`);
  }

  // Verify Engineering Roles (Phase 6 canonical team)
  assert(report.engineeringRoles.length >= 8, 'Must expose all 8 canonical engineering roles');
  const roleIds = report.engineeringRoles.map(r => r.roleId);
  assert(roleIds.includes('supervisor'), 'Must include Supervisor');
  assert(roleIds.includes('architect'), 'Must include Architect');
  assert(roleIds.includes('researcher'), 'Must include Researcher');
  assert(roleIds.includes('engineer') || roleIds.includes('code-agent'), 'Must include Engineer');
  assert(roleIds.includes('ui-ux-specialist') || roleIds.includes('rea-visual-agent'), 'Must include UI/UX Specialist');
  assert(roleIds.includes('qa') || roleIds.includes('qa-agent') || roleIds.includes('bug-hunter'), 'Must include QA');
  assert(roleIds.includes('devops') || roleIds.includes('release-agent'), 'Must include DevOps');
  assert(roleIds.includes('auditor'), 'Must include Auditor');

  // Verify Autonomy Levels (Levels 1 to 5)
  assert.equal(report.autonomyLevels.length, 5, 'Must expose 5 autonomy levels');
  assert.equal(report.autonomyLevels[0].level, 1);
  assert.equal(report.autonomyLevels[4].level, 5);

  // Verify the 10 Canonical Diagnostic Facets
  assert(report.diagnosticFacets, 'Must include diagnosticFacets object');
  const facets = report.diagnosticFacets;

  // 1. Purpose & Capabilities
  assert(facets.purposeAndCapabilities && facets.purposeAndCapabilities.purpose);
  assert(Array.isArray(facets.purposeAndCapabilities.capabilities));

  // 2. File Structure & Modules
  assert(facets.fileStructureAndModules && facets.fileStructureAndModules.totalFiles > 0);
  assert(Array.isArray(facets.fileStructureAndModules.topLevelDirectories));

  // 3. Screens & Navigation Flows
  assert(facets.screensAndNavigationFlows && Array.isArray(facets.screensAndNavigationFlows.screens));
  assert(typeof facets.screensAndNavigationFlows.screensCount === 'number');

  // 4. APIs & Dependencies
  assert(facets.apisAndDependencies && Array.isArray(facets.apisAndDependencies.routes));
  assert(typeof facets.apisAndDependencies.dependenciesCount === 'number');

  // 5. Runtime Execution State
  assert(facets.runtimeExecutionState && facets.runtimeExecutionState.status);
  assert(facets.runtimeExecutionState.latencyMs === null || typeof facets.runtimeExecutionState.latencyMs === 'number');

  // 6. Tests, Errors & Risks
  assert(facets.testsErrorsAndRisks && Array.isArray(facets.testsErrorsAndRisks.tests));
  assert(typeof facets.testsErrorsAndRisks.warningsCount === 'number');

  // 7. Incomplete Features
  assert(facets.incompleteFeatures && Array.isArray(facets.incompleteFeatures.items));

  // 8. Evolution Opportunities
  assert(Array.isArray(facets.evolutionOpportunities) && facets.evolutionOpportunities.length > 0);

  // 9. Prioritized Improvement Plan
  assert(facets.prioritizedImprovementPlan && Array.isArray(facets.prioritizedImprovementPlan.phases));
  assert.equal(facets.prioritizedImprovementPlan.phases.length, 4);

  // 10. Acceptance Criteria & Evidence
  assert(facets.acceptanceCriteriaAndEvidence && Array.isArray(facets.acceptanceCriteriaAndEvidence.criteria));
  assert(facets.acceptanceCriteriaAndEvidence.criteria.length >= 4);
});

test('E2E Autonomous Intelligence: runAutonomousProjectCycle executes the 7-step autonomous lifecycle with Bug Tracker persistence', async () => {
  const engine = new ProjectIntelligenceEngine();
  
  // Run cycle for 'fenix-os'
  const result = await engine.runAutonomousProjectCycle('fenix-os', {
    autonomyLevel: 4,
    issueType: 'contract-validation'
  });

  assert.equal(result.ok, true, 'Cycle must complete successfully');
  assert.equal(result.stage, 'VERIFIED');
  assert.equal(result.projectId, 'fenix-os');
  assert(result.durationMs > 0, 'Duration must be recorded');
  assert(result.honestAssessment, 'Honest defect assessment must be present');

  // Check all 7 steps completed
  assert.equal(result.steps.length, 7, 'Must execute 7 distinct steps');
  for (const step of result.steps) {
    assert.equal(step.status, 'COMPLETED', `Step ${step.step} (${step.name}) must be COMPLETED`);
  }

  // Check Step 3 & 4: Before vs After defect reproduction and fix
  assert(result.diffSummary, 'Must produce diffSummary');
  assert.notEqual(result.diffSummary.before.exitCode, 0, 'Defect must have failed initially');
  assert.equal(result.diffSummary.before.status, 'FAILED');
  assert.equal(result.diffSummary.after.exitCode, 0, 'Post-fix regression test must pass');
  assert.equal(result.diffSummary.after.status, 'PASSED');
  assert.equal(result.diffSummary.verified, true, 'Diff must be verified');
  assert.notEqual(result.diffSummary.before.sha256, result.diffSummary.after.sha256, 'SHA256 must change after fix');

  // Check Step 6: Bug Tracker & Evolution Memory integration
  assert(result.bugRecord, 'Must produce bugRecord');
  assert.equal(result.bugRecord.bugState, 'VERIFIED');
  assert.equal(result.bugRecord.testsPassed, true);
  assert.equal(result.bugRecord.testExitCode, 0);

  // Check Step 7: Cold-Restart Recovery Proof & Phase 7 continuity fields
  assert(result.recoveryProof, 'Must produce recoveryProof');
  assert.equal(result.recoveryProof.persisted, true, 'State must be persisted on disk');
  assert.equal(result.recoveryProof.status, 'RECOVERED_VERIFIED', 'State must be recovered from disk checkpoint');
  assert(result.recoveryProof.recoveredBugId, 'Recovered bug ID must exist');

  // Check that the state file on disk exists and contains BOTH the cycle and the bug
  const statePath = path.resolve(__dirname, '../../memory/AUTONOMOUS_EVOLUTION_STATE.json');
  assert(fs.existsSync(statePath), 'AUTONOMOUS_EVOLUTION_STATE.json must exist');
  const diskState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  
  // Bug Tracker persistence verification
  assert(Array.isArray(diskState.bugs) && diskState.bugs.length > 0, 'diskState.bugs must not be empty');
  const foundBug = diskState.bugs.find(b => b.projectId === 'fenix-os' && b.bugState === 'VERIFIED');
  assert(foundBug, 'Verified bug must exist in diskState.bugs');
  assert.equal(foundBug.evidence?.testsPassed, true);

  // Cycle continuity persistence verification
  assert(diskState.lastProjectCycles && diskState.lastProjectCycles['fenix-os']);
  const cycleOnDisk = diskState.lastProjectCycles['fenix-os'];
  assert.equal(cycleOnDisk.diffSummary.verified, true);
  assert(Array.isArray(cycleOnDisk.completedTasks), 'Must persist completed tasks');
  assert(Array.isArray(cycleOnDisk.pendingTasks), 'Must persist pending tasks');
  assert(cycleOnDisk.plan, 'Must persist evolution plan');
  assert(cycleOnDisk.lastCheckpoint, 'Must persist last checkpoint');

  // State retention check: saving autonomous loop must NOT wipe lastProjectCycles
  const loop = new FenixAutonomousLoop();
  loop._savePersistentState();
  const retainedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert(retainedState.lastProjectCycles && retainedState.lastProjectCycles['fenix-os'], 'lastProjectCycles must be retained across loop saves');
});

test('E2E Autonomous Intelligence: Autonomy Levels 1 to 3 enforce strict safety boundaries', async () => {
  const engine = new ProjectIntelligenceEngine();

  // Level 1: Read-Only Audit (no code execution or sandbox file writes)
  const l1 = await engine.runAutonomousProjectCycle('test-proj-level-1', { autonomyLevel: 1 });
  assert.equal(l1.stage, 'AUDIT_COMPLETE');
  assert.equal(l1.steps.length, 2);
  assert.equal(l1.diffSummary, undefined);

  // Level 2: Diagnosis & Evolution Plan Generation only
  const l2 = await engine.runAutonomousProjectCycle('test-proj-level-2', { autonomyLevel: 2 });
  assert.equal(l2.stage, 'PLAN_GENERATED');
  assert(l2.evolutionPlan && l2.evolutionPlan.phases.length === 4);
  assert.equal(l2.diffSummary, undefined);

  // Level 3: Defect Isolation & Reproduction without code patching
  const l3 = await engine.runAutonomousProjectCycle('test-proj-level-3', { autonomyLevel: 3 });
  assert.equal(l3.stage, 'REPRODUCED_AWAITING_PATCH');
  assert.equal(l3.steps.length, 3);
  assert.notEqual(l3.reproduction.exitCode, 0, 'Must reproduce defect without patching');
  assert.equal(l3.diffSummary, undefined);
});

test('E2E Autonomous Intelligence: Concurrency & conflict prevention deduplicates simultaneous runs', async () => {
  const engine = new ProjectIntelligenceEngine();
  const testId = 'concurrent-test-proj';

  // Trigger 3 concurrent executions on the same project ID
  const [res1, res2, res3] = await Promise.all([
    engine.runAutonomousProjectCycle(testId, { autonomyLevel: 4 }),
    engine.runAutonomousProjectCycle(testId, { autonomyLevel: 4 }),
    engine.runAutonomousProjectCycle(testId, { autonomyLevel: 4 })
  ]);

  assert.equal(res1.ok, true);
  assert.equal(res2.ok, true);
  assert.equal(res3.ok, true);
  assert.equal(res1.runId, res2.runId, 'Concurrent runs must share the same execution promise');
  assert.equal(res2.runId, res3.runId);
});

test('E2E Autonomous Intelligence: REST API handles GET and POST /autonomous-cycle with Cold Restart recovery', async () => {
  let storedState = {
    projects: [
      { id: 'proj-auto-test', name: 'Auto Test API', workspace: path.resolve(__dirname, '..'), workspaceAvailable: true }
    ],
    projectAnalyses: {},
    projectCycles: {},
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

  // 1. GET before run for non-existent project -> returns 404 with honest explanation
  const getUrl = new URL('http://127.0.0.1:4400/api/fenix/projects/proj-unknown-never-run/autonomous-cycle');
  const handledGetBefore = await handleProjectWorkspaceRoutes(
    { method: 'GET' }, {}, getUrl, app, reply, async () => ({}), { tenantId: 'tenant-1', actorId: 'admin' }
  );
  assert.equal(handledGetBefore, true);
  assert.equal(lastStatus, 404);
  assert.equal(lastPayload.ok, false);

  // 2. POST /autonomous-cycle -> executes cycle and stores result
  const postUrl = new URL('http://127.0.0.1:4400/api/fenix/projects/proj-auto-test/autonomous-cycle');
  const handledPost = await handleProjectWorkspaceRoutes(
    { method: 'POST' },
    {},
    postUrl,
    app,
    reply,
    async () => ({ autonomyLevel: 4, issueType: 'contract-validation' }),
    { tenantId: 'tenant-1', actorId: 'admin' }
  );

  assert.equal(handledPost, true);
  assert.equal(lastStatus, 200);
  assert.equal(lastPayload.ok, true);
  assert(lastPayload.cycle && lastPayload.cycle.stage === 'VERIFIED');
  assert.equal(lastPayload.cycle.diffSummary.verified, true);
  assert.equal(lastPayload.cycle.steps.length, 7);

  // 3. GET after run -> returns 200 with stored cycle
  const getAutoTestUrl = new URL('http://127.0.0.1:4400/api/fenix/projects/proj-auto-test/autonomous-cycle');
  const handledGetAfter = await handleProjectWorkspaceRoutes(
    { method: 'GET' }, {}, getAutoTestUrl, app, reply, async () => ({}), { tenantId: 'tenant-1', actorId: 'admin' }
  );
  assert.equal(handledGetAfter, true);
  assert.equal(lastStatus, 200);
  assert.equal(lastPayload.ok, true);
  assert.equal(lastPayload.cycle.projectId, 'proj-auto-test');
  assert.equal(lastPayload.cycle.diffSummary.verified, true);

  // 4. Cold Restart proof: clear in-memory state and ensure GET still succeeds from disk
  storedState.projectAutonomousCycles = {};
  const handledColdRestartGet = await handleProjectWorkspaceRoutes(
    { method: 'GET' }, {}, getAutoTestUrl, app, reply, async () => ({}), { tenantId: 'tenant-1', actorId: 'admin' }
  );
  assert.equal(handledColdRestartGet, true);
  assert.equal(lastStatus, 200, 'Must recover cycle from disk on cold restart');
  assert.equal(lastPayload.ok, true);
  assert.equal(lastPayload.cycle.projectId, 'proj-auto-test');
});

test('E2E Autonomous Intelligence: ContextualInvestigationEngine routes PROJECT_AUTONOMOUS_CYCLE intent', async () => {
  const agent = new ContextualInvestigationEngine();

  // Test intent classification
  const query = 'Execute um ciclo autônomo completo de melhoria de software no projeto fenix-os';
  const intent = agent.classifyIntent(query);
  assert.equal(intent.type, 'PROJECT_AUTONOMOUS_CYCLE');
  assert.equal(intent.targetProject.id, 'fenix-os');

  // Test full investigation
  const result = await agent.investigate(query);
  assert.equal(result.intent, 'PROJECT_AUTONOMOUS_CYCLE');
  assert(result.response.includes('Execução do Ciclo Autônomo Fênix'));
  assert(result.response.includes('Passos do Ciclo Executados e Evidências'));
  assert(result.response.includes('Comparação de Comportamento (Antes vs Depois)'));
  assert(result.response.includes('Universal Bug Tracker'));
  assert(result.response.includes('Recuperação Cold-Restart'));
  assert.equal(result.cycleResult.stage, 'VERIFIED');
  assert.equal(result.cycleResult.diffSummary.verified, true);
});
