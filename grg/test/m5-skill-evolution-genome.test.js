const test = require('node:test');
const assert = require('node:assert');
const { CausalAnalyzer } = require('../src/intelligence/causal-analyzer');
const { WorkflowExtractor } = require('../src/intelligence/workflow-extractor');
const { GenomeBuilder } = require('../src/intelligence/genome-builder');
const { SkillEvolutionEngine } = require('../src/skills/skill-evolution-engine');
const { ObservationEvent } = require('../src/core/contracts/observation-event');

test('M5: CausalAnalyzer — Extracts Causal Rules from Observation Events', () => {
  const analyzer = new CausalAnalyzer();

  const event1 = new ObservationEvent({
    sessionId: 'ses_1',
    projectId: 'prj_test',
    action: 'BUILD_PROJECT',
    result: { buildStatus: 'FAILED' }
  });

  const event2 = new ObservationEvent({
    sessionId: 'ses_1',
    projectId: 'prj_test',
    action: 'FIX_IMPORT_PATH',
    target: { file: 'src/App.tsx' },
    codeState: { gitDiff: '- import Button from "./btn"\n+ import Button from "./Button"' },
    result: { buildStatus: 'PASSED' }
  });

  const causalPairs = analyzer.analyzeSequence([event1, event2]);
  assert.strictEqual(causalPairs.length, 1);
  assert.strictEqual(causalPairs[0].buildStatus, 'RECOVERED_PASSED');
  assert.strictEqual(causalPairs[0].action, 'FIX_IMPORT_PATH');
});

test('M5: WorkflowExtractor — Auto-Synthesizes Reusable Markdown Skills', () => {
  const extractor = new WorkflowExtractor();

  const events = [
    new ObservationEvent({ sessionId: 's1', projectId: 'p1', action: 'ANALYZE_SCHEMA', target: { file: 'schema.prisma' } }),
    new ObservationEvent({ sessionId: 's1', projectId: 'p1', action: 'GENERATE_ROUTES', target: { apiRoute: 'POST /api/leads' } }),
    new ObservationEvent({ sessionId: 's1', projectId: 'p1', action: 'RUN_TESTS', target: { file: 'tests/leads.test.js' } })
  ];

  const workflow = extractor.extractFromEvents(events, { workflowName: 'Create_Leads_API' });
  assert.strictEqual(workflow.stepsCount, 3);

  const skill = extractor.generateSkillFromWorkflow(workflow);
  assert.strictEqual(skill.name, 'Create_Leads_API');
  assert.strictEqual(skill.version, '1.0.0');
  assert.strictEqual(skill.markdown.includes('# Create_Leads_API'), true);
  assert.strictEqual(skill.markdown.includes('Execute ANALYZE_SCHEMA'), true);
});

test('M5: GenomeBuilder — 4-DNA Compilation, Versioning & Diffing', () => {
  const gb = new GenomeBuilder({ projectId: 'prj_saas' });

  // 1. Compile DNA v1
  const v1 = gb.compile({
    projectDna: { stack: ['Node', 'React'], modules: ['Auth', 'Dashboard'] },
    operationalDna: { workflows: ['LoginFlow'] },
    visualDna: { componentTree: ['Navbar', 'Sidebar'] },
    agentDna: { taskSuccessRate: 95.0 }
  });

  assert.strictEqual(v1.version, 'v1.0.0');
  assert.strictEqual(v1.projectDna.modules.length, 2);

  // 2. Compile DNA v2 (after adding CRM module)
  const v2 = gb.compile({
    projectDna: { stack: ['Node', 'React'], modules: ['Auth', 'Dashboard', 'CRM'], apiRoutes: ['/api/crm'] },
    operationalDna: { workflows: ['LoginFlow', 'CrmFlow'], learnedRules: ['Use Grid for CRM Leads'] },
    visualDna: { componentTree: ['Navbar', 'Sidebar', 'CrmTable'] },
    agentDna: { taskSuccessRate: 98.5 }
  });

  assert.strictEqual(v2.version, 'v2.0.0');

  // 3. Diff DNA v1 vs v2
  const diffResult = gb.diff('v1.0.0', 'v2.0.0');
  assert.strictEqual(diffResult.changes.project.addedModules.includes('CRM'), true);
  assert.strictEqual(diffResult.changes.operational.newWorkflowsCount, 1);
  assert.strictEqual(diffResult.changes.visual.componentDelta, 1);
  assert.strictEqual(diffResult.changes.agent.successRateDelta, 3.5);
});

test('M5: SkillEvolutionEngine — Telemetry & Automatic Version Promotion', () => {
  const evolution = new SkillEvolutionEngine();
  const skillId = 'react-component-refactor';

  // Run 10 successful executions
  for (let i = 0; i < 10; i += 1) {
    evolution.recordExecution(skillId, { success: true, durationMs: 150 });
  }

  const metrics = evolution.getSkillMetrics(skillId);
  assert.strictEqual(metrics.executions, 10);
  assert.strictEqual(metrics.successRate, 100.0);
  assert.strictEqual(metrics.currentVersion, '1.1.0'); // Promoted!
  assert.strictEqual(metrics.versionHistory.length, 2);
});
