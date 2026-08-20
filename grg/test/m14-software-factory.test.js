const test = require('node:test');
const assert = require('node:assert');
const { SoftwareFactoryEngine } = require('../src/factory/software-factory-engine');
const { FunctionInventory } = require('../src/repo-intel/function-inventory');
const { DevelopmentObserver } = require('../src/observer/development-observer');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');

test('M14: SoftwareFactoryEngine — Rebuilds Frontend & Computes Reconstruction Metrics', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const observer = new DevelopmentObserver({ eventBus: bus });
  await observer.start();

  const factory = new SoftwareFactoryEngine({ eventBus: bus, observer });
  await factory.start();

  const inventory = new FunctionInventory({ projectId: 'prj_crm' });
  inventory.registerFeature({
    id: 'feat_leads',
    name: 'Gestão de Leads',
    components: ['LeadsTable.tsx'],
    apiRoutes: ['GET /api/leads']
  });

  // 1. Run Rebuild Frontend
  const report = await factory.rebuildFrontend({
    projectId: 'prj_crm',
    functionInventory: inventory,
    targetStyle: 'React + Tailwind CSS'
  });

  assert.strictEqual(report.status, 'REBUILD_SUCCESS');
  assert.strictEqual(report.reconstructionScore.passed, true);
  assert.strictEqual(report.reconstructionScore.overallScore >= 90.0, true);
  assert.strictEqual(report.functionCoverage.passed, true);
  assert.strictEqual(report.functionCoverage.coveragePct >= 95.0, true);

  // 2. Test Auto-Debug & Fix Loop
  const debugResult = await factory.autoDebugAndFix({
    projectId: 'prj_crm',
    errorLog: 'SyntaxError: Unexpected token in LeadsTable.tsx',
    fileToPatch: 'src/components/LeadsTable.tsx',
    patchDiff: '+ export const LeadsTable = () => <div>Leads</div>;'
  });

  assert.strictEqual(debugResult.status, 'FIXED');
  assert.strictEqual(debugResult.verified, true);

  await factory.stop();
  await observer.stop();
  await bus.stop();
});
